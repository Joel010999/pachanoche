import type { Lot, LotEvent } from "@/contracts/v1";
import type { LotStore } from "@/server/ports";

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
    sha256: string;
    txHash: string;
    confirmations: number;
    /** Simulado con la forma de AnchorRegistry (C1/C2): todavía no integrado. */
    contract: { name: string; address: string; chain: string; block: string; event: string; lotRef: string };
  };
  /** Datos de captura de la foto y de la escena satelital (forma de G1/G2, simulados). */
  capture: {
    photo: { takenAt: string; coords: string; accuracy: string; heading: string; geofence: string };
    scene: { takenAt: string; platform: string; resolution: string; clouds: string; bbox: string };
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

/** Códigos públicos simulados (el código opaco real llega con B2). */
function displayCode(lot: Lot, index: number) {
  return lot.parentId ? `SDO-9M4P${index > 1 ? `-${index}` : ""}` : `SDO-7K2Q${index > 0 ? `-${index}` : ""}`;
}

export function buildVisorModel(store: Pick<LotStore, "list" | "events">): VisorModel {
  const lots = store.list();
  const root = lots.find(lot => !lot.parentId) ?? lots[0];
  const children = lots.filter(lot => lot.parentId === root.id);
  const events: LotEvent[] = store.events(root.id);
  const measurement = events.find(event => event.type === "measurement_recorded");
  const initialGrams = measurement?.type === "measurement_recorded" ? measurement.payload.grams : root.availableGrams;
  const split = events.find(event => event.type === "lot_split");
  const splitKg = split?.type === "lot_split" ? kg(split.payload.grams) : null;
  const code = displayCode(root, 0);
  const child = children[0] ? { code: displayCode(children[0], 1), kg: kg(children[0].availableGrams) } : null;

  return {
    camera: { place: "Salinas Grandes · Piletas sector norte", label: "Cámara 02", time: "13:05 ART" },
    conditions: [
      { label: "Temperatura", value: "14 °C" },
      { label: "Viento", value: "22 km/h SO" },
      { label: "Radiación UV", value: "Muy alta" },
      { label: "Altitud", value: "3.450 m" },
    ],
    hotspots: buildHotspots({ code, events, root, initialKg: kg(initialGrams), childCode: child?.code, childKg: child?.kg }),
    lot: {
      code,
      product: "Sal artesanal de cosecha en piletas",
      extractedAt: fmtDate(root.extractedAt),
      place: "Salinas Grandes, Jujuy",
      location: `Dentro del área · ±${root.location.accuracyM ?? "?"} m`,
      producer: "Cooperativa demo",
      initialKg: kg(initialGrams),
      availableKg: kg(root.availableGrams),
      child,
      composition: [
        { label: "Cloruro de sodio (NaCl)", bar: 96 },
        { label: "Humedad", bar: 18 },
        { label: "Insolubles", bar: 8 },
      ],
      sha256: "4e1b9c…07d2a90c",
      txHash: "0x8f3a…c21b",
      confirmations: 2,
      contract: {
        name: "AnchorRegistry",
        address: "0x7a3F…9c1E",
        chain: "Avalanche Fuji · 43113",
        block: "38.412.907",
        event: "Anchored · tipo 1 (evidencia)",
        lotRef: "0x0000…c92f",
      },
    },
    timeline: {
      title: `Recorrido del lote ${code}`,
      range: `${fmtDate(root.extractedAt)} → hoy`,
      progress: 86,
      steps: [
        { label: "Extracción", at: 0 },
        { label: `Pesaje ${kg(initialGrams)} kg`, at: 22 },
        { label: "Evidencia", at: 45 },
        { label: splitKg ? `Fracción ${splitKg} kg` : "Fraccionamiento", at: 68 },
        { label: "Anclado en Fuji", at: 86 },
      ],
    },
    capture: {
      photo: {
        takenAt: "22 nov 2026 · 13:05 ART",
        coords: "-23.6402, -66.0124",
        accuracy: "±8 m",
        heading: "rumbo 352° N",
        geofence: "Dentro del área de estudio",
      },
      scene: {
        takenAt: "23 feb 2025 · 14:30 UTC",
        platform: "Sentinel-2A · L2A",
        resolution: "10 m por píxel",
        clouds: "0 %",
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
};

function buildHotspots(input: { code: string; events: LotEvent[]; root: Lot; initialKg: number; childCode?: string; childKg?: number }): VisorHotspot[] {
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
        kicker: "Lote de sal", title: code, subtitle: "Montículo de cosecha en piletas", badge: "Verificado en Fuji",
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
