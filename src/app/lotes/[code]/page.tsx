import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { dateTime, eventLabels, geofenceLabels, shortHash } from "@/components/app/client";
import { VerifyFile } from "@/components/public/VerifyFile";
import styles from "@/components/app/app.module.css";
import { projectPublicLot } from "@/server/api/publication";
import { container } from "@/server/container";

export const metadata: Metadata = { title: "Ficha pública · Sal de Origen" };

const productLabel = (code: string) => (code === "sal-artesanal" ? "Sal artesanal" : code.replaceAll("-", " "));

async function baseUrl() {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  const list = await headers();
  return `${list.get("x-forwarded-proto") ?? "http"}://${list.get("host") ?? "localhost:3000"}`;
}

export default async function PublicLotPage(props: PageProps<"/lotes/[code]">) {
  const { code } = await props.params;
  const { lots, blockchainMode } = container();
  const publication = lots.publication(code);
  if (!publication) notFound();
  const lot = await projectPublicLot(publication);
  const url = `${await baseUrl()}/lotes/${lot.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const optical = lot.observations.find(item => item.collection === "sentinel-2-l2a");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><b>Sal de Origen</b><span>Ficha pública</span></Link>
        <span className={styles.k}>Código {lot.code}</span>
      </header>
      <main className={styles.narrow}>
        <article className={styles.card}>
          <p className={styles.k}>Del territorio al mercado</p>
          <h1 className={styles.h1}>{productLabel(lot.productCode)}</h1>
          <dl className={styles.grid}>
            <div><dt>Área declarada</dt><dd>{lot.declaredArea}</dd></div>
            <div><dt>Extracción declarada</dt><dd>{dateTime(lot.extractedAt)}</dd></div>
            {lot.geofence && <div><dt>Área de estudio</dt><dd>{geofenceLabels[lot.geofence.status]}</dd></div>}
          </dl>
          {lot.geofence && (
            <p className={styles.muted}>
              Comparación de la ubicación declarada con el polígono {lot.geofence.polygonVersion}.{lot.geofence.reason ? ` ${lot.geofence.reason}` : ""}
            </p>
          )}
        </article>

        {lot.evidence.length > 0 && (
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.h2}>Documentos verificables</h2>
              <span className={blockchainMode === "fuji" ? styles.badge : `${styles.badge} ${styles.badgeWarn}`}>{blockchainMode === "fuji" ? "Avalanche Fuji" : "Anclaje simulado"}</span>
            </div>
            <ul className={styles.list}>
              {lot.evidence.map(file => (
                <li key={file.id} className={styles.item} style={{ cursor: "default" }}>
                  <span className={styles.mono}>SHA-256 {file.sha256}</span>
                  <span className={styles.muted}>
                    {file.anchor
                      ? `Anclaje ${file.anchor.status} · red ${file.anchor.chainId}${file.anchor.txHash ? ` · tx ${shortHash(file.anchor.txHash)}` : ""}${blockchainMode === "simulado" ? " · simulado" : ""}`
                      : "Sin anclaje todavía"}
                  </span>
                </li>
              ))}
            </ul>
            <VerifyFile digests={lot.evidence.map(file => file.sha256)} />
          </article>
        )}

        {optical && (
          <article className={styles.card}>
            <h2 className={styles.h2}>Contexto territorial</h2>
            {optical.previewUrl && <Image className={styles.photo} src={optical.previewUrl} alt="Escena Sentinel-2 de Salinas Grandes" width={1020} height={747} />}
            <dl className={styles.grid}>
              <div><dt>Escena</dt><dd className={styles.mono}>{optical.itemId}</dd></div>
              <div><dt>Adquisición (UTC)</dt><dd>{optical.acquiredAt.replace("T", " ").slice(0, 16)}</dd></div>
              {optical.resolutionM && <div><dt>Resolución</dt><dd>{optical.resolutionM} m</dd></div>}
              {optical.cloudCoverPercent !== undefined && <div><dt>Nubosidad</dt><dd>{optical.cloudCoverPercent} %</dd></div>}
            </dl>
            <p className={styles.muted}>{optical.attribution} La escena describe el contexto del sitio; la coordenada del lote es declarada.</p>
          </article>
        )}

        {lot.events.length > 0 && (
          <article className={styles.card}>
            <h2 className={styles.h2}>Recorrido del lote</h2>
            <ol className={styles.timeline}>
              {lot.events.map((event, index) => (
                <li key={`${event.type}-${index}`}><b>{eventLabels[event.type]}</b> <span className={styles.muted}>· {dateTime(event.occurredAt)}</span></li>
              ))}
            </ol>
          </article>
        )}

        <article className={styles.card}>
          <div className={styles.qr}>
            <div dangerouslySetInnerHTML={{ __html: qr }} aria-label={`Código QR de ${url}`} role="img" />
            <div style={{ display: "grid", gap: 6 }}>
              <span className={styles.k}>Compartir esta ficha</span>
              <span className={styles.mono}>{url}</span>
              <span className={styles.muted}>La ficha muestra sólo lo que autorizó el productor. No incluye coordenadas exactas, usuarios ni archivos.</span>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
