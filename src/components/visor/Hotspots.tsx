"use client";

import type { Shape, VisorHotspot } from "@/app/visor-model";
import styles from "./visor.module.css";

const points = (shape: Shape) => shape.map(([x, y]) => `${x},${y}`).join(" ");

type Props = {
  hotspots: VisorHotspot[];
  hovered: string | null;
  open: string | null;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
};

/** Capa SVG en coordenadas de la foto: cada objeto se resalta con su propio contorno. */
export function Hotspots({ hotspots, hovered, open, onHover, onOpen }: Props) {
  const activate = (id: string) => () => onOpen(id);

  return (
    <svg className={styles.hotspots} viewBox="0 0 1920 1440" preserveAspectRatio="none" aria-hidden="true">
      {hotspots.map(spot => {
        const state = open === spot.id ? styles.spotOpen : hovered === spot.id ? styles.spotHover : "";
        return (
          <g
            key={spot.id}
            data-spot={spot.id}
            className={`${styles.spot} ${state}`}
            aria-hidden="true"
            onPointerEnter={() => onHover(spot.id)}
            onPointerLeave={() => onHover(null)}
            onClick={activate(spot.id)}
          >
            {spot.hit && <polygon className={styles.spotHit} points={points(spot.hit)} />}
            {spot.shapes.map((shape, index) => (
              <polygon key={index} className={styles.spotShape} points={points(shape)} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
