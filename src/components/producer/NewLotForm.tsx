"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Lot } from "@/contracts/v1";
import { api, message } from "@/components/app/client";
import styles from "@/components/app/app.module.css";

type Site = { id: string; label: string };

const localNow = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function NewLotForm({ onCreated, onCancel }: { onCreated: (lot: Lot) => void; onCancel: () => void }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({ productCode: "sal-artesanal", extractedAt: localNow(), latitude: "-23.64", longitude: "-66.01", accuracyM: "12", siteId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<string | null>(null);

  useEffect(() => {
    api<Site[]>("/extraction-sites").then(list => {
      setSites(list);
      setForm(current => ({ ...current, siteId: current.siteId || list[0]?.id || "" }));
    }).catch(() => setSites([]));
  }, []);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [key]: event.target.value }));

  function useDeviceGps() {
    if (!navigator.geolocation) return setGps("Este navegador no ofrece GPS.");
    setGps("Buscando ubicación…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(current => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6), accuracyM: String(Math.max(1, Math.round(coords.accuracy))) }));
        setGps(`Ubicación del dispositivo con precisión de ${Math.round(coords.accuracy)} m.`);
      },
      () => setGps("No se pudo leer el GPS (requiere permiso y HTTPS o localhost)."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const recordedAt = new Date().toISOString();
      const lot = await api<Lot>("/lots", {
        method: "POST", idempotent: true,
        json: {
          productCode: form.productCode.trim(),
          extractedAt: new Date(form.extractedAt).toISOString(),
          location: {
            latitude: Number(form.latitude), longitude: Number(form.longitude), recordedAt,
            ...(form.accuracyM ? { accuracyM: Number(form.accuracyM) } : {}),
            ...(form.siteId ? { siteId: form.siteId } : {}),
          },
        },
      });
      onCreated(lot);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit} aria-labelledby="new-lot">
      <div className={styles.cardHead}>
        <h2 id="new-lot" className={styles.h2}>Nuevo lote</h2>
        <button type="button" className={styles.ghost} onClick={onCancel}>Cancelar</button>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>Producto
          <input className={styles.input} value={form.productCode} onChange={set("productCode")} pattern="[a-z0-9][a-z0-9\-]{0,39}" required />
        </label>
        <label className={styles.field}>Extracción
          <input className={styles.input} type="datetime-local" value={form.extractedAt} onChange={set("extractedAt")} required />
        </label>
      </div>
      <label className={styles.field}>Sitio de extracción
        <select className={styles.input} value={form.siteId} onChange={set("siteId")}>
          <option value="">Sin sitio registrado</option>
          {sites.map(site => <option key={site.id} value={site.id}>{site.label}</option>)}
        </select>
      </label>
      <div className={styles.row}>
        <label className={styles.field}>Latitud
          <input className={styles.input} type="number" step="any" min={-90} max={90} value={form.latitude} onChange={set("latitude")} required />
        </label>
        <label className={styles.field}>Longitud
          <input className={styles.input} type="number" step="any" min={-180} max={180} value={form.longitude} onChange={set("longitude")} required />
        </label>
        <label className={styles.field}>Precisión (m)
          <input className={styles.input} type="number" step="any" min={1} value={form.accuracyM} onChange={set("accuracyM")} />
        </label>
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.ghost} onClick={useDeviceGps}>Usar GPS del dispositivo</button>
        {gps && <p className={styles.muted}>{gps}</p>}
      </div>
      <p className={styles.muted}>La ubicación es declarada por el productor. Se compara con el área de estudio de Salinas Grandes.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.btn} disabled={busy}>{busy ? "Creando…" : "Crear lote"}</button>
    </form>
  );
}
