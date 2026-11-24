import type { Lot, LotEvent, SatelliteObservation } from "@/contracts/v1";
import { organizations } from "@/domain/personas";
import type { GeofenceService, LotStore } from "@/server/ports";

/**
 * Modelo de la vista del visor. Masa y lotes salen del almacén demo.
 * Cámara, clima, etiquetas de escena, evidencia y anclaje son datos simulados
 * hasta que existan las integraciones B2, C3 y G3.
 */
/** Polígonos en píxeles de la foto original (1920x1440). */
export type Shape = Array<[number, number]>;
export type VisorDetail = {
  kicker: string;
  title: string;
  subtitle: string;
  badge?: string;
  rows: Array<[string, string]>;
  list?: { title: string; items: string[] };
  note: string;
};
/** dot: punto tocable en píxeles de la foto. */
export type VisorHotspot = { id: string; label: string; dot: [number, number]; shapes: Shape[]; hit?: Shape; detail: VisorDetail };
export type VisorStep = { label: string; at: number };
export type VisorModel = {
  camera: { place: string; label: string; time: string };
  conditions: Array<{ label: string; value: string }>;
  hotspots: VisorHotspot[];
  lot: {
    code: string;
    product: string;
    extractedAt: string;
    place: string;
    location: string;
    producer: string;
    initialKg: number;
    availableKg: number;
    child: { code: string; kg: number } | null;
    composition: Array<{ label: string; bar: number }>;
    /** Evidencia y anclaje reales del lote (C1–C3). */
    integrity: {
      badge: string;
      anchored: boolean;
      sha256: string;
      txHash: string;
      contractAddress: string;
      chain: string;
      event: string;
      lotRef: string;
      verifyHref: string;
      verifyLabel: string;
    };
  };
  /** Ubicación declarada del lote con su geocerca (G2) y escena Sentinel-2 real (G1/G3). */
  capture: {
    photo: { takenAt: string; coords: string; accuracy: string; heading: string; geofence: string };
    scene: { id: string; takenAt: string; platform: string; resolution: string; clouds: string; bbox: string };
  };
  timeline: { title: string; range: string; progress: number; steps: VisorStep[] };
  photoCredit: string;
};

const kg = (grams: number) => Math.round(grams / 1000);
const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const shortHash = (value: string) => (value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value);
const geofenceText = { inside: "Dentro del área de estudio", outside: "Fuera del área de estudio", uncertain: "Ubicación incierta" } as const;

type VisorSources = {
  lots: Pick<LotStore, "list" | "events" | "evidence" | "anchors" | "publicationOf">;
  geofence: GeofenceService;
  blockchainMode: "fuji" | "simulado";
  scene?: SatelliteObservation;
};

export function buildVisorModel({ lots: store, geofence, blockchainMode, scene }: VisorSources): VisorModel {
  const lots = store.list(organizations.salinas.id);
  const lastActivity = (lot: Lot) => Math.max(0, ...store.events(lot.id).map(event => Date.parse(event.recordedAt)));
  const roots = lots.filter(lot => !lot.parentId);
  const root = roots.reduce<Lot | undefined>((best, lot) => (!best || lastActivity(lot) > lastActivity(best) ? lot : best), undefined) ?? lots[0];
  const children = lots.filter(lot => lot.parentId === root.id);
  const events: LotEvent[] = store.events(root.id);
  const measurement = events.find(event => event.type === "measurement_recorded");
  const initialGrams = measurement?.type === "measurement_recorded" ? measurement.payload.grams : root.availableGrams;
  const split = events.find(event => event.type === "lot_split");
  const splitKg = split?.type === "lot_split" ? kg(split.payload.grams) : null;
  const publication = store.publicationOf(root.id, root.organizationId);
  const code = publication?.code ?? `LOTE ${shortId(root.id)}`;
  const child = children[0] ? { code: `LOTE ${shortId(children[0].id)}`, kg: kg(children[0].availableGrams) } : null;

  const evidence = store.evidence(root.id);
  const anchors = store.anchors(root.id);
  const anchor = anchors.find(item => item.txHash) ?? anchors[0];
  const file = evidence.find(item => item.id === anchor?.evidenceId) ?? evidence[0];
  const simulated = blockchainMode === "simulado";
  const anchoredLabel = simulated ? "Anclaje simulado" : "Anclado en Fuji";
  const badge = anchor ? anchoredLabel : file ? "Evidencia sin anclar" : "Sin evidencia";
  const area = geofence.classify(root.location);
  const { latitude, longitude, accuracyM, recordedAt } = root.location;
  const lotHex = root.id.replaceAll("-", "");

  const steps: Array<VisorStep & { done: boolean }> = [
    { label: "Extracción", at: 0, done: true },
    { label: measurement ? `Pesaje ${kg(initialGrams)} kg` : "Pesaje pendiente", at: 22, done: !!measurement },
    { label: file ? "Evidencia" : "Evidencia pendiente", at: 45, done: !!file },
    { label: splitKg ? `Fracción ${splitKg} kg` : "Fraccionamiento", at: 68, done: !!splitKg },
    { label: anchor ? anchoredLabel : "Anclaje pendiente", at: 86, done: !!anchor },
  ];

  return {
    camera: { place: "Salinas Grandes · Piletas sector norte", label: "Cámara 02", time: "13:05 ART" },
    conditions: [
      { label: "Temperatura", value: "14 °C" },
      { label: "Viento", value: "22 km/h SO" },
      { label: "Radiación UV", value: "Muy alta" },
      { label: "Altitud", value: "3.450 m" },
    ],
    hotspots: buildHotspots({ code, badge, events, root, initialKg: kg(initialGrams), childCode: child?.code, childKg: child?.kg }),
    lot: {
      code,
      product: "Sal artesanal de cosecha en piletas",
      extractedAt: fmtDate(root.extractedAt),
      place: "Salinas Grandes, Jujuy",
      location: `${geofenceText[area.status]} · ±${accuracyM ?? "?"} m`,
      producer: Object.values(organizations).find(org => org.id === root.organizationId)?.name ?? "Organización demo",
      initialKg: kg(initialGrams),
      availableKg: kg(root.availableGrams),
      child,
      composition: [
        { label: "Cloruro de sodio (NaCl)", bar: 96 },
        { label: "Humedad", bar: 18 },
        { label: "Insolubles", bar: 8 },
      ],
      integrity: {
        badge,
        anchored: !!anchor && !simulated,
        sha256: file ? shortHash(file.sha256) : "Sin documento cargado",
        txHash: anchor?.txHash ? `${shortHash(anchor.txHash)}${simulated ? " · simulada" : ""}` : "Sin transacción",
        contractAddress: anchor?.contractAddress ? shortHash(anchor.contractAddress) : "—",
        chain: `Avalanche Fuji · 43113${simulated ? " · modo simulado" : ""}`,
        event: anchor ? `Anchored · tipo ${file?.mediaType === "application/pdf" ? 2 : 1}` : "—",
        lotRef: `0x0000…${lotHex.slice(-4)}`,
        verifyHref: publication ? `/lotes/${publication.code}` : "/productor",
        verifyLabel: publication ? "Verificar un archivo" : "Registrar y publicar el lote",
      },
    },
    timeline: {
      title: `Recorrido del lote ${code}`,
      range: `${fmtDate(root.extractedAt)} → hoy`,
      progress: Math.max(...steps.filter(step => step.done).map(step => step.at)),
      steps: steps.map(({ label, at }) => ({ label, at })),
    },
    capture: {
      photo: {
        takenAt: fmtDate(recordedAt),
        coords: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        accuracy: accuracyM ? `±${accuracyM} m` : "sin precisión",
        heading: `polígono ${area.polygonVersion}`,
        geofence: geofenceText[area.status],
      },
      scene: {
        id: scene?.itemId ?? "Sin escena",
        takenAt: scene ? `${fmtDate(scene.acquiredAt)} · ${scene.acquiredAt.slice(11, 16)} UTC` : "—",
        platform: scene ? `${scene.collection === "sentinel-2-l2a" ? "Sentinel-2 · L2A" : "Sentinel-1 · GRD"}` : "—",
        resolution: scene?.resolutionM ? `${scene.resolutionM} m por píxel` : "—",
        clouds: scene?.cloudCoverPercent !== undefined ? `${scene.cloudCoverPercent} %` : "—",
        bbox: "23,54–23,76 S · 65,88–66,10 O",
      },
    },
    photoCredit: "Foto: Gonzalo Rivero, CC BY-SA 3.0, Wikimedia Commons",
  };
}

/** Piletas visibles en la foto, de la más cercana a la más lejana. */
const pools: Array<{ id: string; dot: [number, number]; shape: Shape; state: string; brine: string; started: string; harvest: string }> = [
  { id: "P-02", dot: [960, 1150], shape: [[345, 1035], [1585, 1048], [1920, 1310], [1920, 1440], [0, 1440], [0, 1245]], state: "Evaporación", brine: "Salmuera alta", started: "2 nov 2026", harvest: "En 3 semanas" },
  { id: "P-03", dot: [975, 875], shape: [[722, 792], [1278, 795], [1468, 962], [478, 955]], state: "Cristalización en curso", brine: "Costra de 2 cm", started: "20 oct 2026", harvest: "En 6 días" },
  { id: "P-04", dot: [985, 746], shape: [[790, 722], [1180, 724], [1215, 770], [760, 768]], state: "Cristalización en curso", brine: "Costra de 3 cm", started: "12 oct 2026", harvest: "Esta semana" },
  { id: "P-05", dot: [985, 699], shape: [[835, 690], [1135, 692], [1160, 708], [815, 708]], state: "Lista para cosechar", brine: "Costra de 4 cm", started: "28 sep 2026", harvest: "Hoy" },
  { id: "P-06", dot: [985, 674], shape: [[870, 667], [1095, 668], [1110, 681], [860, 681]], state: "Recién cosechada", brine: "Llenado inicial", started: "18 nov 2026", harvest: "En 5 semanas" },
];

const mound: Shape = [[508, 691], [530, 677], [553, 653], [563, 645], [573, 646], [593, 652], [620, 653], [633, 657], [647, 673], [660, 684], [672, 691]];
const crew: Shape[] = [
  [[1301, 611], [1302, 590], [1304, 578], [1309, 575], [1313, 578], [1316, 590], [1317, 611]],
  [[1370, 613], [1371, 590], [1374, 584], [1379, 582], [1384, 587], [1386, 600], [1385, 613]],
  [[1251, 611], [1253, 600], [1262, 596], [1272, 597], [1281, 601], [1281, 611]],
];

const eventLabels: Partial<Record<LotEvent["type"], string>> = {
  extraction_declared: "Extracción declarada",
  measurement_recorded: "Pesaje",
  lot_split: "Fraccionamiento",
  evidence_attached: "Evidencia adjunta",
  anchor_confirmed: "Anclaje registrado",
  lot_published: "Ficha publicada",
};

function buildHotspots(input: { code: string; badge: string; events: LotEvent[]; root: Lot; initialKg: number; childCode?: string; childKg?: number }): VisorHotspot[] {
  const { code, events, root } = input;
  const history = events.map(event => {
    const label = eventLabels[event.type] ?? event.type;
    const extra = event.type === "measurement_recorded" ? ` · ${kg(event.payload.grams)} kg`
      : event.type === "lot_split" ? ` · ${kg(event.payload.grams)} kg` : "";
    return `${event.sequence}. ${label}${extra} — ${fmtDate(event.occurredAt)}`;
  });
  return [
    {
      id: "lote", label: `Lote ${code}`, dot: [590, 672], shapes: [mound],
      detail: {
        kicker: "Lote de sal", title: code, subtitle: "Montículo de cosecha en piletas", badge: input.badge,
        rows: [
          ["Disponible", `${kg(root.availableGrams)} kg de ${input.initialKg} kg`],
          ["Sublote", input.childCode ? `${input.childCode} · ${input.childKg} kg` : "Sin fraccionar"],
          ["Extracción", fmtDate(root.extractedAt)],
          ["Coordenadas", `${root.location.latitude.toFixed(2)}, ${root.location.longitude.toFixed(2)} · ±${root.location.accuracyM ?? "?"} m`],
        ],
        list: { title: "Historial registrado", items: history },
        note: "",
      },
    },
    ...pools.map(pool => ({
      id: pool.id, label: `Pileta ${pool.id}`, dot: pool.dot, shapes: [pool.shape],
      detail: {
        kicker: "Pileta de evaporación", title: `Pileta ${pool.id}`, subtitle: pool.state,
        rows: [
          ["Estado de la salmuera", pool.brine],
          ["Inicio del ciclo", pool.started],
          ["Cosecha estimada", pool.harvest],
          ["Sector", "Piletas norte · Cámara 02"],
        ] as Array<[string, string]>,
        note: "",
      },
    })),
    {
      id: "cuadrilla", label: "Cuadrilla 2", dot: [1340, 592], shapes: crew,
      hit: [[1238, 560], [1400, 560], [1400, 622], [1238, 622]],
      detail: {
        kicker: "Equipo en el salar", title: "Cuadrilla 2", subtitle: "Cosecha · 2 personas",
        rows: [
          ["Tarea", "Corte y apilado de sal"],
          ["Turno", "08:00 – 14:00"],
          ["Lote en curso", code],
          ["Herramientas", "Pala, pico y carretilla"],
        ],
        note: "No se registran datos personales.",
      },
    },
  ];
}
