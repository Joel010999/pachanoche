"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";
import type { VisorModel } from "@/app/visor-model";
import { CaptureInfo } from "./CaptureInfo";
import { DetailCard } from "./DetailCard";
import { Hotspots } from "./Hotspots";
import { LotPanel } from "./LotPanel";
import styles from "./visor.module.css";

const Salina3D = dynamic(() => import("@/components/salina-3d/Salina3D"), {
  ssr: false,
  loading: () => <div className={styles.pane} aria-busy="true" />,
});

const tabs = [
  { id: "photo", label: "Foto en vivo" },
  { id: "3d", label: "3D" },
  { id: "satellite", label: "Satélite" },
] as const;
type Tab = typeof tabs[number]["id"];


export function Visor({ model }: { model: VisorModel }) {
  const [tab, setTab] = useState<Tab>("photo");
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState<{ id: string } | null>(null);

  const openSpot = open ? model.hotspots.find(spot => spot.id === open.id) : undefined;
  const close = useCallback(() => setOpen(null), []);

  /** Abre el cartel del objeto; los carteles siempre aparecen fijos en la esquina derecha. */
  const openAt = (id: string) => setOpen({ id });

  return (
    <div className={styles.root}>
      <section className={styles.view} aria-label="Vista de las piletas">
        {tab === "photo" && (
          <div className={styles.stage}>
            <Image src="/salina/piletas-1.jpg" alt="Piletas de evaporación en Salinas Grandes" fill priority sizes="100vw" className={styles.photo} />
            <Hotspots hotspots={model.hotspots} hovered={hovered} open={open?.id ?? null} onHover={setHovered} onOpen={openAt} />
            {model.hotspots.map(spot => (
              <button
                key={spot.id}
                type="button"
                data-pin={spot.id}
                className={`${styles.point} ${open?.id === spot.id ? styles.pointOpen : ""} ${hovered === spot.id ? styles.pointHover : ""}`}
                style={{ left: `${(spot.dot[0] / 1920) * 100}%`, top: `${(spot.dot[1] / 1440) * 100}%` }}
                aria-label={`${spot.label}: ver detalle`}
                aria-expanded={open?.id === spot.id}
                onPointerEnter={() => setHovered(spot.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(spot.id)}
                onBlur={() => setHovered(null)}
                onClick={() => openAt(spot.id)}
              ><span /></button>
            ))}
          </div>
        )}
        {tab === "3d" && <div className={styles.pane}><Salina3D /></div>}
        {tab === "satellite" && (
          <div className={styles.pane}>
            <Image
              src="https://copernicuslac-chile.eu/wp-content/uploads/2026/04/Salinas-Grandes.jpg"
              alt="Vista satelital Sentinel-2 de Salinas Grandes, 23 de febrero de 2025"
              fill unoptimized sizes="100vw" className={styles.satellite}
            />
          </div>
        )}
        <div className={styles.shade} />

        <div className={styles.top}>
          <div>
            <div className={styles.brand}><b>Sal de Origen</b><span className={styles.live}><i />EN VIVO</span></div>
            <p className={styles.sub} style={{ margin: "8px 0 0" }}>{model.camera.place} · {model.camera.label} · {model.camera.time}</p>
          </div>
          <dl className={styles.chips} style={{ margin: 0 }}>
            {model.conditions.map(item => (
              <div key={item.label} className={styles.chip}><dt><small>{item.label}</small></dt><dd style={{ margin: 0 }}>{item.value}</dd></div>
            ))}
          </dl>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Modo de vista">
          {tabs.map(item => (
            <button
              key={item.id} type="button" role="tab" aria-selected={tab === item.id}
              className={`${styles.tab} ${tab === item.id ? styles.tabOn : ""}`}
              onClick={() => { setOpen(null); setTab(item.id); }}
            >{item.label}</button>
          ))}
        </div>

        {tab !== "3d" && <CaptureInfo key={tab} capture={model.capture} kind={tab === "satellite" ? "scene" : "photo"} />}
        {tab === "photo" && <p className={styles.credit} style={{ margin: 0 }}>{model.photoCredit}</p>}
        {tab === "satellite" && <p className={styles.credit} style={{ margin: 0 }}>Sentinel-2 · 23 feb 2025 · CopernicusLAC Chile</p>}

        <div className={styles.timeline}>
          <div className={styles.tlHead}><span>{model.timeline.title}</span><span>{model.timeline.range}</span></div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${model.timeline.progress}%` }} />
            {model.timeline.steps.map(step => <span key={step.label} className={styles.ev} style={{ left: `${step.at}%` }} />)}
          </div>
          <ol className={styles.labels} style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {model.timeline.steps.map(step => <li key={step.label} style={{ display: "contents" }}><span style={{ left: `${Math.max(step.at, 3)}%` }}>{step.label}</span></li>)}
          </ol>
        </div>

        {tab === "photo" && open && openSpot && <DetailCard key={open.id} detail={openSpot.detail} onClose={close} />}
      </section>
      <LotPanel lot={model.lot} />
    </div>
  );
}
