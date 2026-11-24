import Link from "next/link";
import type { VisorModel } from "@/app/visor-model";
import styles from "./visor.module.css";

export function LotPanel({ lot }: { lot: VisorModel["lot"] }) {
  const childKg = lot.child?.kg ?? 0;
  return (
    <aside className={styles.aside} aria-label="Información del lote">
      <div>
        <div className={styles.row}>
          <span className={styles.k}>Lote seleccionado</span>
          <span className={styles.badge} style={lot.integrity.anchored ? undefined : { background: "rgba(242, 180, 107, 0.16)", color: "var(--warn)" }}>{lot.integrity.badge}</span>
        </div>
        <h1 className={styles.h1}>{lot.code}</h1>
        <p className={styles.lead}>{lot.product}</p>
      </div>

      <section className={styles.card} aria-label="Origen">
        <h2 className={styles.k} style={{ margin: 0 }}>Origen</h2>
        <dl className={styles.grid}>
          <div><dt>Lugar</dt><dd>{lot.place}</dd></div>
          <div><dt>Extracción</dt><dd>{lot.extractedAt}</dd></div>
          <div><dt>Ubicación GPS</dt><dd>{lot.location}</dd></div>
          <div><dt>Productor</dt><dd>{lot.producer}</dd></div>
        </dl>
      </section>

      <section className={styles.card} aria-label="Masa">
        <div className={styles.row}><h2 className={styles.k} style={{ margin: 0 }}>Masa</h2><span className={styles.muted}>Pesaje inicial {lot.initialKg} kg</span></div>
        <div className={styles.bar} role="img" aria-label={`${lot.availableKg} kg disponibles y ${childKg} kg en sublote`}>
          <span style={{ flex: lot.availableKg, background: "var(--lime)" }} />
          <span style={{ flex: childKg, background: "#5f8f7c" }} />
        </div>
        <div className={styles.row} style={{ fontSize: 14 }}>
          <span><b>{lot.availableKg} kg</b> disponibles</span>
          {lot.child && <span><b>{lot.child.kg} kg</b> en {lot.child.code}</span>}
        </div>
      </section>

      <section className={styles.card} aria-label="Composición">
        <div className={styles.row}><h2 className={styles.k} style={{ margin: 0 }}>Composición</h2><span className={styles.ex}>Ejemplo · sin informe</span></div>
        <ul className={styles.comp}>
          {lot.composition.map(item => (
            <li key={item.label}>
              <div className={styles.compRow}><span>{item.label}</span><b>— %</b></div>
              <div className={styles.compTrack}><i style={{ width: `${item.bar}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className={styles.note}>Se completa con el informe de laboratorio sobre una muestra identificada.</p>
      </section>

      <section className={styles.card} aria-label="Integridad del registro">
        <h2 className={styles.k} style={{ margin: 0 }}>Integridad del registro</h2>
        <dl className={`${styles.grid} ${styles.grid1}`}>
          <div><dt>SHA-256 del documento</dt><dd className={styles.mono}>{lot.integrity.sha256}</dd></div>
          <div><dt>Transacción</dt><dd className={styles.mono}>{lot.integrity.txHash}</dd></div>
        </dl>
        <div className={styles.contract}>
          <span className={styles.contractName}>Contrato AnchorRegistry</span>
          <dl className={styles.contractRows}>
            <div><dt>Dirección</dt><dd className={styles.mono}>{lot.integrity.contractAddress}</dd></div>
            <div><dt>Red</dt><dd>{lot.integrity.chain}</dd></div>
            <div><dt>Evento</dt><dd>{lot.integrity.event}</dd></div>
            <div><dt>lotRef</dt><dd className={styles.mono}>{lot.integrity.lotRef}</dd></div>
          </dl>
        </div>
      </section>

      <Link href={lot.integrity.verifyHref} className={styles.btn} style={{ textAlign: "center", textDecoration: "none" }}>{lot.integrity.verifyLabel}</Link>
      <Link href="/productor" className={styles.muted} style={{ textAlign: "center" }}>Abrir el panel del productor</Link>
    </aside>
  );
}
