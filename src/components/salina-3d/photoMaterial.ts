import { ShaderMaterial, Vector2, Vector3, type Texture } from "three";
import { PHOTO_EYE, SALINA } from "./photoMesh";

const DEG = Math.PI / 180;
const pitch = SALINA.camera.pitchDeg * DEG;

/**
 * Material del suelo y cielo. Dentro de la foto usa las coordenadas de la malla (reproduce la foto
 * exacta). En el suelo fuera de la foto (abajo y a los costados), en vez de espejar la imagen,
 * continúa la hilera: corre cada punto del suelo un número entero de piletas a lo largo de la hilera
 * hasta que cae dentro de la foto y lo proyecta ahí. Así los bordes y las piletas siguen alineados.
 */
export function createTerrainMaterial(map: Texture): ShaderMaterial {
  const { lane, camera } = SALINA;
  return new ShaderMaterial({
    uniforms: {
      map: { value: map },
      eye: { value: PHOTO_EYE.clone() },
      camX: { value: new Vector3(1, 0, 0) },
      camY: { value: new Vector3(0, Math.cos(pitch), -Math.sin(pitch)) },
      camZ: { value: new Vector3(0, Math.sin(pitch), Math.cos(pitch)) },
      tanHalf: { value: new Vector2(Math.tan((camera.hfovDeg * DEG) / 2), Math.tan((camera.vfovDeg * DEG) / 2)) },
      laneDir: { value: new Vector2(lane.dirXZ[0], lane.dirXZ[1]) },
      lanePeriod: { value: lane.period },
      // a partir de esta distancia (borde inferior de la foto) el suelo ya está en la foto
      photoNear: { value: lane.rimDistances[0] - lane.period * 0.35 },
    },
    vertexShader: /* glsl */ `
      attribute float below;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vShade;
      varying float vBelow;
      void main() {
        vUv = uv;
        vShade = color.r;
        vBelow = below;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 eye, camX, camY, camZ;
      uniform vec2 tanHalf, laneDir;
      uniform float lanePeriod, photoNear;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vShade;
      varying float vBelow;

      void main() {
        vec2 uv = vUv;
        if (vBelow > 0.0) {
          // avanza el punto del suelo de a una pileta por la hilera hasta que cae dentro de la foto
          vec3 p = vec3(vWorld.x, 0.0, vWorld.z);
          vec3 step = vec3(laneDir.x, 0.0, laneDir.y) * lanePeriod;
          float along = dot(p.xz, laneDir);
          p += step * max(ceil((photoNear - along) / lanePeriod), 0.0);
          vec2 ph = vec2(-1.0);
          for (int i = 0; i < 48; i++) {
            vec3 d = p - eye;
            float z = -dot(d, camZ);
            vec2 c = vec2(dot(d, camX), dot(d, camY)) / z;
            ph = vec2(0.5 + 0.5 * c.x / tanHalf.x, 0.5 - 0.5 * c.y / tanHalf.y);
            if (ph.x >= 0.002 && ph.x <= 0.998 && ph.y <= 0.998) break;
            p += step;
          }
          bool found = ph.x >= 0.0 && ph.x <= 1.0 && ph.y <= 1.0;
          vec2 shifted = found ? vec2(ph.x, 1.0 - ph.y) : uv;
          uv = mix(uv, shifted, smoothstep(0.0, 0.25, vBelow));
        }
        vec4 texel = texture2D(map, uv);
        gl_FragColor = vec4(texel.rgb * vShade, 1.0);
        #include <colorspace_fragment>
      }
    `,
    vertexColors: true,
  });
}
