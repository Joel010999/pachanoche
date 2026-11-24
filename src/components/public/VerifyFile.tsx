"use client";

import { useState } from "react";
import { api, dateTime, message, sha256File, shortHash } from "@/components/app/client";
import styles from "@/components/app/app.module.css";

type Result =
  | { kind: "match"; sha256: string; anchored: boolean; txHash?: string; timestamp?: string; mode: "fuji" | "simulado" }
  | { kind: "mismatch"; sha256: string }
  | { kind: "error"; text: string };

type VerifyResponse = { verified: boolean; mode: "fuji" | "simulado"; txHash?: string; timestamp?: string };

export function VerifyFile({ digests }: { digests: string[] }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const sha256 = await sha256File(file);
      if (!digests.includes(sha256)) return setResult({ kind: "mismatch", sha256 });
      const remote = await api<VerifyResponse>("/verify", { method: "POST", json: { sha256 } });
      setResult({ kind: "match", sha256, anchored: remote.verified, txHash: remote.txHash, timestamp: remote.timestamp, mode: remote.mode });
    } catch (caught) {
      setResult({ kind: "error", text: message(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>
      <label className={styles.field}>Elegí el documento que recibiste. El hash se calcula en este dispositivo y el archivo no se envía.
        <input className={styles.input} type="file" onChange={event => check(event.target.files?.[0])} disabled={busy} />
      </label>
      {busy && <p className={styles.muted}>Calculando SHA-256…</p>}
      {result?.kind === "match" && (
        <p className={styles.notice} role="status">
          <b>Coincide con el documento registrado.</b><br />
          <span className={styles.mono}>{result.sha256}</span><br />
          {result.anchored
            ? `Anclado${result.mode === "simulado" ? " (simulado, sin transacción real)" : " en Avalanche Fuji"}${result.txHash ? ` · tx ${shortHash(result.txHash)}` : ""}${result.timestamp ? ` · ${dateTime(result.timestamp)}` : ""}.`
            : "Todavía no tiene anclaje registrado."}
        </p>
      )}
      {result?.kind === "mismatch" && (
        <p className={styles.error} role="alert">
          <b>No coincide.</b> El archivo fue modificado o no es el documento publicado.<br />
          <span className={styles.mono}>{result.sha256}</span>
        </p>
      )}
      {result?.kind === "error" && <p className={styles.error} role="alert">{result.text}</p>}
    </div>
  );
}
