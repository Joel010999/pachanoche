"use client";

import { useEffect, useRef } from "react";
import type { VisorDetail } from "@/app/visor-model";
import styles from "./visor.module.css";

type Props = { detail: VisorDetail; onClose: () => void };

/** Cartel de detalle, fijo en la esquina superior derecha de la vista. */
export function DetailCard({ detail, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.detail}
      role="dialog"
      aria-label={detail.title}
      tabIndex={-1}
    >
      <div className={styles.row}>
        <span className={styles.k}>{detail.kicker}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar detalle">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <h3 className={styles.detailTitle}>{detail.title}</h3>
      <p className={styles.lead} style={{ margin: "4px 0 0" }}>{detail.subtitle}</p>
      {detail.badge && <span className={styles.badge} style={{ display: "inline-block", marginTop: 10 }}>{detail.badge}</span>}
      <dl className={`${styles.grid} ${styles.detailGrid}`}>
        {detail.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {detail.list && (
        <>
          <p className={styles.k} style={{ margin: "14px 0 6px" }}>{detail.list.title}</p>
          <ol className={styles.detailList}>{detail.list.items.map(item => <li key={item}>{item}</li>)}</ol>
        </>
      )}
      {detail.note && <p className={styles.note}>{detail.note}</p>}
    </div>
  );
}
