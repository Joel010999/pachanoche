"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
import { DoubleSide, FileLoader, SRGBColorSpace, TextureLoader, Vector3, type PerspectiveCamera, type Texture } from "three";
import { createTerrainMaterial } from "./photoMaterial";
import { PHOTO_AXIS, PHOTO_EYE, SALINA, buildObjectGeometry, buildPhotoGeometry } from "./photoMesh";

const LIME = "#d8eb85";
const INK = "#0f1f19";
const PANEL = "rgba(10,20,16,.72)";

/** Punto del suelo donde el eje óptico de la foto toca el salar: centro de giro de la cámara. */
const TARGET_DISTANCE = SALINA.camera.height / -PHOTO_AXIS.y;
const TARGET = PHOTO_EYE.clone().addScaledVector(PHOTO_AXIS, TARGET_DISTANCE);
/** Fracción del campo visual de la foto que muestra la cámara (deja margen para girar sin ver bordes). */
const FOV_FILL = 0.9;
const IDLE_MS = 3500;

function configureTexture(texture: Texture, anisotropy: number) {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
}

function usePhotoTexture(src: string) {
  const gl = useThree((s) => s.gl);
  const texture = useLoader(TextureLoader, src);
  useLayoutEffect(() => configureTexture(texture, gl.capabilities.getMaxAnisotropy()), [texture, gl]);
  return texture;
}

/** Suelo y cielo: la foto sin objetos, proyectada sobre la malla de profundidad. */
function PhotoTerrain() {
  const texture = usePhotoTexture(SALINA.clean);
  const depthBuffer = useLoader(FileLoader, SALINA.grid.src, (loader) => {
    loader.setResponseType("arraybuffer");
  });
  const geometry = useMemo(() => buildPhotoGeometry(new Uint16Array(depthBuffer as ArrayBuffer)), [depthBuffer]);
  const material = useMemo(() => createTerrainMaterial(texture), [texture]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

/** Montículo, personas y bulto: recortes de la foto original con volumen propio. */
function PhotoObjects() {
  const texture = usePhotoTexture(SALINA.image.src);
  const mask = useLoader(TextureLoader, SALINA.objectsMask);
  const geometries = useMemo(() => SALINA.objects.map(buildObjectGeometry), []);
  useLayoutEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  return (
    <>
      {geometries.map((geometry, i) => (
        <mesh key={SALINA.objects[i].name} geometry={geometry} renderOrder={1}>
          <meshBasicMaterial
            map={texture}
            alphaMap={mask}
            transparent
            alphaTest={0.04}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

function LotMarker() {
  const [px, py, pz] = SALINA.anchors.moundPeak;
  const [bx, , bz] = SALINA.anchors.moundBase;
  const r = SALINA.anchors.moundRadius;
  return (
    <group>
      <mesh position={[bx, 0.04, bz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[r * 1.15, r * 1.15 + 0.09, 96]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html position={[px, py + 0.12, pz]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px 6px 6px",
              borderRadius: 999,
              background: PANEL,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(216,235,133,.35)",
              color: "#eef3e6",
              fontSize: 12,
              lineHeight: 1.2,
              boxShadow: "0 6px 20px rgba(0,0,0,.25)",
            }}
          >
            <span
              style={{
                background: LIME,
                color: INK,
                fontWeight: 700,
                letterSpacing: ".04em",
                padding: "3px 7px",
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              SDO-7K2Q
            </span>
            <span>Lote en cosecha</span>
          </div>
          <div style={{ width: 1.5, height: 46, background: `linear-gradient(${LIME}, rgba(216,235,133,.2))` }} />
          <div
            style={{
              width: 9,
              height: 9,
              marginBottom: -4.5,
              borderRadius: "50%",
              background: LIME,
              boxShadow: `0 0 0 4px rgba(216,235,133,.28)`,
            }}
          />
        </div>
      </Html>
    </group>
  );
}

function fitCameraToPhoto(camera: PerspectiveCamera, aspect: number) {
  const photoAspect = SALINA.image.width / SALINA.image.height;
  const tanV = Math.tan((SALINA.camera.vfovDeg * Math.PI) / 360);
  const fitV = aspect >= photoAspect ? (tanV * photoAspect) / aspect : tanV;
  camera.fov = (2 * Math.atan(fitV * FOV_FILL) * 180) / Math.PI;
  camera.updateProjectionMatrix();
}

/** Ajusta el FOV para que la vista quede siempre dentro de la foto (modo "cover"). */
function FitCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => fitCameraToPhoto(camera, size.width / Math.max(size.height, 1)), [camera, size]);
  return null;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Giro limitado alrededor del centro de la foto. Mientras nadie toca la vista, la cámara se mece
 * despacio de lado a lado para que se perciba el relieve (salvo con "reducir movimiento").
 */
function Controls() {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const lastTouch = useRef(prefersReducedMotion() ? Infinity : -Infinity);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const controls = ref.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.1);
    if (performance.now() - lastTouch.current < IDLE_MS) return;
    const t0 = clock.current;
    const t1 = (clock.current += dt);
    const az = (t: number) => 0.12 * Math.sin(t * 0.22);
    const po = (t: number) => 0.018 * Math.sin(t * 0.17 + 1.1);
    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + az(t1) - az(t0));
    controls.setPolarAngle(controls.getPolarAngle() + po(t1) - po(t0));
    controls.update();
  });

  const initialPolar = Math.atan2(TARGET_DISTANCE * -PHOTO_AXIS.z, PHOTO_EYE.y - TARGET.y);
  return (
    <OrbitControls
      ref={ref}
      target={TARGET}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.35}
      zoomSpeed={0.5}
      minDistance={TARGET_DISTANCE * 0.62}
      maxDistance={TARGET_DISTANCE * 1.12}
      minAzimuthAngle={-0.2}
      maxAzimuthAngle={0.2}
      minPolarAngle={initialPolar - 0.1}
      maxPolarAngle={Math.min(initialPolar + 0.035, Math.PI / 2 - 0.02)}
      onStart={() => {
        lastTouch.current = Infinity;
      }}
      onEnd={() => {
        lastTouch.current = prefersReducedMotion() ? Infinity : performance.now();
      }}
    />
  );
}

const startPosition = new Vector3().copy(PHOTO_EYE);

export default function Salina3D() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "linear-gradient(#3c66a3 0%, #8ea6c4 38%, #c9cfd6 41%, #d7d5d2 60%, #9fb5b5 100%)",
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        dpr={[1, 2]}
        resize={{ debounce: 0 }}
        gl={{ antialias: true }}
        camera={{ position: startPosition.toArray(), fov: 45, near: 0.2, far: 6000 }}
        onCreated={({ camera }) => camera.lookAt(TARGET)}
      >
        <FitCamera />
        <Suspense fallback={null}>
          <PhotoTerrain />
          <PhotoObjects />
          <LotMarker />
        </Suspense>
        <Controls />
      </Canvas>
    </div>
  );
}
