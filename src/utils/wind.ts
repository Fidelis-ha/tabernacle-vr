import * as THREE from 'three';
import { detectQuality } from './quality';

// Wind-Animation via onBeforeCompile (SPEC-perf-stoffe D2 / SPEC-marc-feedback3 E3):
// pos.y += sin(worldPos.x * freq + uTime * speed + phase) * amp * uv.y
// EIN geteiltes uTime-Uniform, Muster wie CampIsrael-applyWind; low-Tier OHNE
// Animation. customProgramCacheKey trennt die Programme pro Parameter-Set.
export const fabricUTime = { value: 0 };
const IS_LOW_TIER = detectQuality() === 'low';

export function applyFabricWind(
  mat: THREE.Material,
  freq: number,
  speed: number,
  phase: number,
  amp: number
) {
  if (IS_LOW_TIER) return;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = fabricUTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec4 windWorld = instanceMatrix * vec4(transformed, 1.0);
  #else
    vec4 windWorld = vec4(transformed, 1.0);
  #endif
  transformed.y += sin(windWorld.x * ${freq.toFixed(3)} + uTime * ${speed.toFixed(3)} + ${phase.toFixed(3)}) * ${amp.toFixed(4)} * uv.y;`
      );
  };
  mat.customProgramCacheKey = () => `fabric-wind-${freq}-${speed}-${phase}-${amp}`;
}
