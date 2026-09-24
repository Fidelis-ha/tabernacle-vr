// Qualitaets-Tier (SPEC F): EINMALige Detektion beim Import, URL-Param-Override
// (?quality=low|high), localStorage-Override, sonst Mobile-Heuristik.
// Alle Komponenten lesen NUR QUALITY_SETTINGS — keine Duplikat-Logik.

export type QualityTier = 'low' | 'high';

export interface QualitySettings {
  dpr: [number, number];
  antialias: boolean;
  postFX: boolean; // Bloom + Vignette
  shadowMapSize: number;
  courtyardSparkles: boolean;
  tentSparkles: boolean;
  altarSparkles: boolean;
  sparklesOpacity: number;
  clouds: number;
  cloudOpacity: number;
  stones: number;
  sheep: number; // Schafe + Ziegen
  donkeys: number;
  birds: number; // Geier am Horizont
  smokeColumns: number;
}

export const QUALITY_SETTINGS: Record<QualityTier, QualitySettings> = {
  high: {
    dpr: [1, 2],
    antialias: true,
    postFX: true,
    shadowMapSize: 1024,
    courtyardSparkles: true,
    tentSparkles: true,
    altarSparkles: true,
    sparklesOpacity: 1,
    clouds: 8,
    cloudOpacity: 1,
    stones: 56,
    sheep: 15,
    donkeys: 4,
    birds: 4,
    smokeColumns: 5,
  },
  low: {
    dpr: [0.75, 1.25],
    antialias: false,
    postFX: false,
    shadowMapSize: 512,
    courtyardSparkles: true, // nur das Vorhof-Feld bleibt
    tentSparkles: false,
    altarSparkles: false,
    sparklesOpacity: 0.5,
    clouds: 4,
    cloudOpacity: 0.8,
    stones: 20,
    sheep: 6,
    donkeys: 2,
    birds: 2,
    smokeColumns: 3,
  },
};

// Schwacher GPU-String (Mittelklasse-Smartphones, SPEC F)
const WEAK_GPU = /Adreno 5|Adreno 6[0-2]|Mali-G[5-7]|PowerVR|Apple A1[0-2]/i;

function detectGpuString(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) return '';
    return gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '';
  } catch {
    return '';
  }
}

function isMobileUA(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

let _cachedQuality: QualityTier | null = null;

export function detectQuality(): QualityTier {
  // Memoisiert (Re-Review-Befund): detectQuality() wird bei Store-Init +
  // 6-7 Komponenten aufgerufen — ohne Cache wuerde jedes Mal ein Canvas +
  // WebGL-Kontext erzeugt (Kontext-Limit-/Startup-Risiko auf Mobile).
  if (_cachedQuality) return _cachedQuality;
  let result: QualityTier;
  // 1) URL-Param-Override (?quality=low / ?quality=high)
  if (typeof window !== 'undefined') {
    const url = new URLSearchParams(window.location.search).get('quality');
    if (url === 'low' || url === 'high') result = url;
    // 2) localStorage-Override (dauerhaft gesetzt, URL hat Vorrang)
    else {
      try {
        const stored = localStorage.getItem('quality');
        if (stored === 'low' || stored === 'high') result = stored;
      } catch {
        /* localStorage blockiert — Heuristik faellt durch */
      }
    }
  }

  // 3) Mobile-Heuristik: nur mobile UA kann auf 'low' fallen,
  //    und nur bei schwachem Speicher/CPU/GPU
  if (!result) {
    if (!isMobileUA()) result = 'high';
    else {
      const nav = navigator as Navigator & { deviceMemory?: number };
      const weak =
        (nav.deviceMemory ?? 8) <= 4 ||
        (navigator.hardwareConcurrency ?? 8) <= 6 ||
        WEAK_GPU.test(detectGpuString());
      result = weak ? 'low' : 'high';
    }
  }
  _cachedQuality = result;
  return result;
}
