"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AnchorSummary, EvidenceSummary, Lot, LotEvent, PublicField, PublicLot } from "@/contracts/v1";
import { ApiError, api, dateTime, eventLabels, geofenceLabels, kg, message, shortHash, shortId } from "@/components/app/client";
import { QrCode } from "@/components/app/QrCode";
import styles from "@/components/app/app.module.css";

type Detail = { lot: Lot; events: LotEvent[]; evidence: EvidenceSummary[]; anchors: AnchorSummary[]; publication: PublicLot | null };
type Props = { lotId: string; canWrite: boolean; mode: "fuji" | "simulado"; baseUrl: string; onChanged: () => void; onSelect: (id: string) => void };

const sections: Array<[PublicField, string]> = [
  ["events", "Historial"], ["evidence", "Evidencia pública y anclajes"], ["observations", "Escena satelital"], ["geofence", "Resultado del área de estudio"],
];

export function LotDetail({ lotId, canWrite, mode, baseUrl, onChanged, onSelect }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (): Promise<Detail> => {
    const [lot, events, evidence, anchors, publication] = await Promise.all([
      api<Lot>(`/lots/${lotId}`),
      api<LotEvent[]>(`/lots/${lotId}/events`),
      api<EvidenceSummary[]>(`/lots/${lotId}/evidence`),
      api<AnchorSummary[]>(`/lots/${lotId}/anchors`),
      api<PublicLot>(`/lots/${lotId}/publish`).catch(error => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    ]);
    return { lot, events, evidence, anchors, publication };
  }, [lotId]);

  const load = useCallback(async () => setDetail(await fetchDetail()), [fetchDetail]);

  useEffect(() => {
    let active = true;
    fetchDetail().then(next => { if (active) setDetail(next); }).catch(caught => setError(message(caught)));
    return () => { active = false; };
  }, [fetchDetail]);

  async function run(label: string, action: () => Promise<string>) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      await load();
      onChanged();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(null);
    }
  }

  if (!detail) return <section className={styles.card}>{error ? <p className={styles.error}>{error}</p> : <p className={styles.muted}>Cargando lote…</p>}</section>;

  const { lot, events, evidence, anchors, publication } = detail;
  const measured = events.find((event): event is Extract<LotEvent, { type: "measurement_recorded" }> => event.type === "measurement_recorded");
  const created = events.find((event): event is Extract<LotEvent, { type: "sublot_created" }> => event.type === "sublot_created");
  const initialGrams = measured?.payload.grams ?? created?.payload.grams ?? lot.availableGrams;
  const splitGrams = events.flatMap(event => (event.type === "lot_split" ? [event.payload] : []));
  const publicUrl = publication ? `${baseUrl}/lotes/${publication.code}` : null;

  return (
    <section className={styles.main} style={{ padding: 0 }} aria-label="Detalle del lote">
      <article className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <p className={styles.k}>{lot.parentId ? "Sublote" : "Lote"} · {lot.productCode}</p>
            <h1 className={styles.h1}>LOTE {shortId(lot.id)}</h1>
          </div>
          <span className={styles.badge}>{kg(lot.availableGrams)} disponibles</span>
        </div>
        <dl className={styles.grid}>
          <div><dt>Extracción declarada</dt><dd>{dateTime(lot.extractedAt)}</dd></div>
          <div><dt>Ubicación</dt><dd className={styles.mono}>{lot.location.latitude.toFixed(4)}, {lot.location.longitude.toFixed(4)}{lot.location.accuracyM ? ` ± ${lot.location.accuracyM} m` : ""}</dd></div>
          <div><dt>Masa inicial</dt><dd>{initialGrams ? kg(initialGrams) : "Sin pesaje"}</dd></div>
          {lot.parentId && <div><dt>Origen</dt><dd><button type="button" className={styles.ghost} onClick={() => onSelect(lot.parentId!)}>LOTE {shortId(lot.parentId)}</button></dd></div>}
        </dl>
        {initialGrams > 0 && (
          <>
            <div className={styles.bar} role="img" aria-label={`${kg(lot.availableGrams)} disponibles de ${kg(initialGrams)}`}>
              <span style={{ flex: lot.availableGrams, background: "var(--lime)" }} />
              {splitGrams.map(item => <span key={item.childId} style={{ flex: item.grams, background: "#5f8f7c", borderLeft: "2px solid var(--card)" }} />)}
            </div>
            {splitGrams.length > 0 && (
              <div className={styles.row}>
                {splitGrams.map(item => (
                  <button key={item.childId} type="button" className={styles.ghost} onClick={() => onSelect(item.childId)}>Sublote {shortId(item.childId)} · {kg(item.grams)}</button>
                ))}
              </div>
            )}
          </>
        )}
      </article>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {canWrite && !lot.parentId && !measured && (
        <MeasureForm busy={busy === "measure"} onSubmit={(grams, instrument) => run("measure", async () => {
          await api(`/lots/${lot.id}/measurements`, { method: "POST", idempotent: true, json: { grams, instrument, measuredAt: new Date().toISOString() } });
          return `Pesaje registrado: ${kg(grams)}.`;
        })} />
      )}

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.h2}>Evidencias</h2>
          <span className={mode === "fuji" ? styles.badge : `${styles.badge} ${styles.badgeWarn}`}>{mode === "fuji" ? "Avalanche Fuji" : "Anclaje simulado"}</span>
        </div>
        {evidence.length === 0 && <p className={styles.muted}>Todavía no hay documentos. Subí el remito, una foto o el informe.</p>}
        <ul className={styles.list}>
          {evidence.map(file => {
            const anchor = anchors.find(item => item.evidenceId === file.id);
            return (
              <li key={file.id} className={styles.item} style={{ cursor: "default" }}>
                <div className={styles.cardHead}>
                  <b>{file.mediaType.replace("application/", "").replace("image/", "").toUpperCase()} · {(file.sizeBytes / 1024).toFixed(1)} KB</b>
                  <span className={file.visibility === "digest_public" ? styles.badge : `${styles.badge} ${styles.badgeWarn}`}>{file.visibility === "digest_public" ? "Hash público" : "Privado"}</span>
                </div>
                <span className={styles.mono}>SHA-256 {file.sha256}</span>
                {anchor ? (
                  <span className={styles.muted}>Anclaje {anchor.status}{anchor.txHash ? ` · tx ${shortHash(anchor.txHash)}` : ""}{mode === "simulado" ? " · simulado" : ""}</span>
                ) : canWrite && (
                  <div>
                    <button type="button" className={styles.ghost} disabled={!!busy} onClick={() => run(`anchor-${file.id}`, async () => {
                      const result = await api<AnchorSummary>(`/lots/${lot.id}/anchors`, { method: "POST", idempotent: true, json: { evidenceId: file.id } });
                      return `Anclaje ${result.status}${mode === "simulado" ? " (simulado, sin transacción real)" : ` en Fuji · ${shortHash(result.txHash ?? "")}`}.`;
                    })}>{busy === `anchor-${file.id}` ? "Anclando…" : mode === "fuji" ? "Anclar en Fuji" : "Anclar (simulado)"}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {canWrite && <EvidenceForm busy={busy === "evidence"} onSubmit={(file, visibility) => run("evidence", async () => {
          const body = new FormData();
          body.set("file", file);
          body.set("visibility", visibility);
          const saved = await api<EvidenceSummary>(`/lots/${lot.id}/evidence`, { method: "POST", idempotent: true, body });
          return `Evidencia guardada. SHA-256 ${shortHash(saved.sha256)}.`;
        })} />}
      </article>

      {canWrite && lot.availableGrams > 0 && (
        <SplitForm max={lot.availableGrams} busy={busy === "split"} onSubmit={grams => run("split", async () => {
          const result = await api<{ parent: Lot; child: Lot }>(`/lots/${lot.id}/splits`, { method: "POST", idempotent: true, json: { grams } });
          return `Sublote ${shortId(result.child.id)} creado con ${kg(grams)}. Quedan ${kg(result.parent.availableGrams)}.`;
        })} />
      )}

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.h2}>Ficha pública</h2>
          {publication && <span className={styles.badge}>Publicada</span>}
        </div>
        {publication && publicUrl && (
          <div className={styles.qr}>
            <QrCode value={publicUrl} label={`Código QR de la ficha ${publication.code}`} />
            <div style={{ display: "grid", gap: 6 }}>
              <span className={styles.k}>Código {publication.code}</span>
              <Link href={`/lotes/${publication.code}`} target="_blank">{publicUrl}</Link>
              {publication.geofence && <span className={styles.muted}>{geofenceLabels[publication.geofence.status]}</span>}
              {publicUrl.includes("localhost") && <span className={styles.muted}>Para escanear desde el celular, iniciá con npm run demo.</span>}
            </div>
          </div>
        )}
        {canWrite ? (
          <PublishForm initial={publication ? sectionsOf(publication) : sections.map(([key]) => key)} published={!!publication} busy={busy === "publish"} onSubmit={fields => run("publish", async () => {
            const result = await api<PublicLot>(`/lots/${lot.id}/publish`, { method: "POST", idempotent: true, json: { consent: true, fields } });
            return `Ficha ${result.code} publicada.`;
          })} />
        ) : !publication && <p className={styles.muted}>El lote no está publicado.</p>}
      </article>

      <article className={styles.card}>
        <h2 className={styles.h2}>Historial</h2>
        <ol className={styles.timeline}>
          {events.map(event => (
            <li key={event.id}>
              <b>{eventLabels[event.type]}</b> <span className={styles.muted}>· {dateTime(event.occurredAt)}</span>
              <div className={styles.muted}>{describe(event)}</div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}

function sectionsOf(publication: PublicLot): PublicField[] {
  const fields: PublicField[] = [];
  if (publication.events.length) fields.push("events");
  if (publication.evidence.length) fields.push("evidence");
  if (publication.observations.length) fields.push("observations");
  if (publication.geofence) fields.push("geofence");
  return fields;
}

function describe(event: LotEvent) {
  switch (event.type) {
    case "extraction_declared": return `${event.payload.productCode} · ${event.payload.location.latitude.toFixed(4)}, ${event.payload.location.longitude.toFixed(4)}`;
    case "measurement_recorded": return `${kg(event.payload.grams)} · ${event.payload.instrument}`;
    case "lot_split": return `${kg(event.payload.grams)} al sublote ${shortId(event.payload.childId)}`;
    case "sublot_created": return `${kg(event.payload.grams)} desde el lote ${shortId(event.payload.parentId)}`;
    case "evidence_attached": return `Documento ${shortId(event.payload.evidenceId)}`;
    case "lot_published": return `Código ${event.payload.publicCode}`;
    case "anchor_confirmed": return `Anclaje ${shortId(event.payload.anchorId)}`;
    default: return "";
  }
}

function MeasureForm({ busy, onSubmit }: { busy: boolean; onSubmit: (grams: number, instrument: string) => void }) {
  const [kgValue, setKg] = useState("100");
  const [instrument, setInstrument] = useState("Balanza de plataforma");
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(Math.round(Number(kgValue) * 1000), instrument.trim()); };
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2 className={styles.h2}>Pesaje inicial</h2>
      <div className={styles.row}>
        <label className={styles.field}>Masa (kg)<input className={styles.input} type="number" min="0.001" step="0.001" value={kgValue} onChange={event => setKg(event.target.value)} required /></label>
        <label className={styles.field}>Instrumento<input className={styles.input} value={instrument} onChange={event => setInstrument(event.target.value)} maxLength={120} required /></label>
        <button className={styles.btn} disabled={busy}>{busy ? "Registrando…" : "Registrar pesaje"}</button>
      </div>
    </form>
  );
}

function EvidenceForm({ busy, onSubmit }: { busy: boolean; onSubmit: (file: File, visibility: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState("digest_public");
  const submit = (event: FormEvent) => { event.preventDefault(); if (file) onSubmit(file, visibility); };
  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row}>
        <label className={styles.field}>Archivo (PDF, JPG, PNG o WebP · máx. 10 MB)
          <input className={styles.input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} required />
        </label>
        <label className={styles.field}>Visibilidad
          <select className={styles.input} value={visibility} onChange={event => setVisibility(event.target.value)}>
            <option value="digest_public">Hash público (verificable en la ficha)</option>
            <option value="private">Privado</option>
          </select>
        </label>
        <button className={styles.btn} disabled={busy || !file}>{busy ? "Subiendo…" : "Adjuntar"}</button>
      </div>
    </form>
  );
}

function SplitForm({ max, busy, onSubmit }: { max: number; busy: boolean; onSubmit: (grams: number) => void }) {
  const [kgValue, setKg] = useState(String(Math.min(30, max / 1000)));
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(Math.round(Number(kgValue) * 1000)); };
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2 className={styles.h2}>Fraccionar</h2>
      <div className={styles.row}>
        <label className={styles.field}>Masa del sublote (kg, máx. {kg(max)})<input className={styles.input} type="number" min="0.001" max={max / 1000} step="0.001" value={kgValue} onChange={event => setKg(event.target.value)} required /></label>
        <button className={styles.btn} disabled={busy}>{busy ? "Fraccionando…" : "Crear sublote"}</button>
      </div>
    </form>
  );
}

function PublishForm({ initial, published, busy, onSubmit }: { initial: PublicField[]; published: boolean; busy: boolean; onSubmit: (fields: PublicField[]) => void }) {
  const [fields, setFields] = useState<PublicField[]>(initial);
  const [consent, setConsent] = useState(false);
  const toggle = (key: PublicField) => setFields(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]));
  const submit = (event: FormEvent) => { event.preventDefault(); if (consent) onSubmit(fields); };
  return (
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.muted}>Siempre se muestran producto, área declarada y fecha. Nunca se publican coordenadas exactas, usuarios ni archivos.</p>
      {sections.map(([key, label]) => (
        <label key={key} className={styles.check}><input type="checkbox" checked={fields.includes(key)} onChange={() => toggle(key)} /> {label}</label>
      ))}
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /> Autorizo publicar estos datos</label>
      <button className={styles.btn} disabled={busy || !consent}>{busy ? "Publicando…" : published ? "Actualizar ficha" : "Publicar ficha"}</button>
    </form>
  );
}
