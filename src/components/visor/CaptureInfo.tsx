"use client";

import { useId, useState } from "react";
import type { VisorModel } from "@/app/visor-model";
import styles from "./visor.module.css";

type Props = { capture: VisorModel["capture"]; kind: "photo" | "scene" };

/** Datos de captura (cuándo y dónde se tomó la imagen). Cerrado por defecto; se abre con el botón de la esquina. */
export function CaptureInfo({ capture, kind }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const title = kind === "photo" ? "Ubicación del lote" : "Escena satelital";

  const rows: Array<[string, string, string?]> = kind === "photo"
    ? [
      ["Declarada", capture.photo.takenAt],
      ["Ubicación", capture.photo.coords, styles.mono],
      ["Precisión", `${capture.photo.accuracy} · ${capture.photo.heading}`],
      ["Geocerca", capture.photo.geofence, capture.photo.geofence.startsWith("Dentro") ? styles.geoOk : undefined],
    ]
    : [
      ["Escena", capture.scene.id, styles.mono],
      ["Tomada", capture.scene.takenAt],
      ["Satélite", capture.scene.platform],
      ["Resolución", capture.scene.resolution],
      ["Nubes", capture.scene.clouds],
      ["Recorte", capture.scene.bbox],
    ];

  return (
    <div className={styles.captureWrap}>
      {open && (
        <section id={panelId} className={styles.capture} aria-label={title}>
          <span className={styles.k}>{title}</span>
          <dl className={styles.captureRows}>
            {rows.map(([label, value, className]) => <div key={label}><dt>{label}</dt><dd className={className}>{value}</dd></div>)}
          </dl>
        </section>
      )}
      <button
        type="button"
        className={`${styles.captureBtn} ${open ? styles.captureBtnOn : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {kind === "photo"
            ? <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>
            : <><path d="M12 2l3 3-3 3-3-3z" /><path d="M5 12l-3 3 3 3 3-3z" /><path d="M19 12l-3 3 3 3 3-3z" /><path d="M9 9l6 6" /></>}
        </svg>
        {title}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
