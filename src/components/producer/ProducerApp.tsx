"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DemoPersona, Lot } from "@/contracts/v1";
import { api, kg, message, shortId } from "@/components/app/client";
import styles from "@/components/app/app.module.css";
import { LotDetail } from "./LotDetail";
import { NewLotForm } from "./NewLotForm";

type Session = { persona: DemoPersona | null; personas: DemoPersona[] };
type Status = { blockchainMode: "fuji" | "simulado"; publicBaseUrl: string };
const roleLabels = { producer: "Productor", verifier: "Verificador", buyer: "Comprador", admin: "Administración" } as const;

export function ProducerApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Session>("/session"), api<Status>("/status")])
      .then(([current, info]) => { setSession(current); setStatus(info); })
      .catch(caught => setError(message(caught)));
  }, []);

  const applyLots = useCallback((list: Lot[]) => {
    setLots(list);
    setSelected(current => (current && list.some(lot => lot.id === current) ? current : list[0]?.id ?? null));
  }, []);

  const loadLots = useCallback(async () => {
    try {
      applyLots(await api<Lot[]>("/lots"));
    } catch (caught) {
      setError(message(caught));
    }
  }, [applyLots]);

  const personaId = session?.persona?.id;
  useEffect(() => {
    if (!personaId) return;
    let active = true;
    api<Lot[]>("/lots").then(list => { if (active) applyLots(list); }).catch(caught => setError(message(caught)));
    return () => { active = false; };
  }, [personaId, applyLots]);

  async function choose(persona: DemoPersona | null) {
    setError(null);
    setLots([]);
    setSelected(null);
    setCreating(false);
    try {
      if (persona) await api("/session", { method: "POST", json: { personaId: persona.id } });
      else await api("/session", { method: "DELETE" });
      setSession(current => current && { ...current, persona });
    } catch (caught) {
      setError(message(caught));
    }
  }

  const persona = session?.persona;
  const canWrite = persona?.role === "producer";
  const roots = lots.filter(lot => !lot.parentId || !lots.some(item => item.id === lot.parentId));
  const childrenOf = (id: string) => lots.filter(lot => lot.parentId === id);

  function renderLot(lot: Lot, depth = 0): React.ReactNode {
    return (
      <li key={lot.id} className={depth ? styles.child : undefined}>
        <button type="button" className={`${styles.item} ${lot.id === selected && !creating ? styles.itemOn : ""}`} onClick={() => { setSelected(lot.id); setCreating(false); }}>
          <b>{depth ? "↳ " : ""}LOTE {shortId(lot.id)}</b>
          <span className={styles.muted}>{lot.productCode} · {kg(lot.availableGrams)}</span>
        </button>
        {childrenOf(lot.id).length > 0 && <ul className={styles.list} style={{ marginTop: 8 }}>{childrenOf(lot.id).map(child => renderLot(child, depth + 1))}</ul>}
      </li>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><b>Sal de Origen</b><span>Panel del productor</span></Link>
        <nav className={styles.nav} aria-label="Sesión">
          {status && <span className={status.blockchainMode === "fuji" ? styles.badge : `${styles.badge} ${styles.badgeWarn}`}>{status.blockchainMode === "fuji" ? "Fuji en vivo" : "Anclaje simulado"}</span>}
          {persona && <span>{persona.label}</span>}
          {persona && <button type="button" className={styles.ghost} onClick={() => choose(null)}>Cambiar persona</button>}
          <Link href="/">Visor</Link>
        </nav>
      </header>

      {error && <div className={styles.main}><p className={styles.error} role="alert">{error}</p></div>}

      {session && !persona && (
        <main className={styles.narrow}>
          <div>
            <p className={styles.k}>Sesión demo</p>
            <h1 className={styles.h1}>¿Con quién entrás?</h1>
            <p className={styles.muted}>Datos sintéticos. Cada organización ve sólo sus lotes y sólo los productores pueden registrar cambios.</p>
          </div>
          <div className={styles.personas}>
            {session.personas.map(item => (
              <button key={item.id} type="button" className={styles.item} onClick={() => choose(item)}>
                <span className={styles.k}>{roleLabels[item.role]}</span>
                <b>{item.organization.name}</b>
                <span className={styles.muted}>{item.label}</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {persona && status && (
        <main className={`${styles.main} ${styles.split}`}>
          <aside className={styles.card} aria-label="Lotes">
            <div className={styles.cardHead}>
              <h2 className={styles.h2}>Lotes</h2>
              {canWrite && <button type="button" className={styles.btn} onClick={() => setCreating(true)}>Nuevo lote</button>}
            </div>
            <p className={styles.muted}>{persona.organization.name}</p>
            {lots.length === 0 ? <p className={styles.muted}>No hay lotes para esta organización.</p> : <ul className={styles.list}>{roots.map(lot => renderLot(lot))}</ul>}
            {!canWrite && <p className={styles.notice}>Tu rol puede consultar pero no modificar lotes.</p>}
          </aside>
          {creating ? (
            <NewLotForm onCancel={() => setCreating(false)} onCreated={async lot => { setCreating(false); await loadLots(); setSelected(lot.id); }} />
          ) : selected ? (
            <LotDetail key={selected} lotId={selected} canWrite={canWrite} mode={status.blockchainMode} baseUrl={status.publicBaseUrl} onChanged={loadLots} onSelect={setSelected} />
          ) : (
            <section className={styles.card}><p className={styles.muted}>{canWrite ? "Creá el primer lote para empezar." : "Elegí un lote."}</p></section>
          )}
        </main>
      )}
    </div>
  );
}
