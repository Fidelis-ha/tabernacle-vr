import * as THREE from 'three';
import { detectQuality } from './quality';

// Prozedurale Canvas-Texturen (SPEC aaa, Abschnitt b) — einmalig erzeugt,
// als Modul-Singletons geteilt. Kein Netzwerk-Asset-Load.

// SPEC-perf-stoffe C1 — Antik-Palette (Ex 26,31; gedeckt statt grell).
// Materials.ts fuehrt dieselben Töne als numerische Konstanten (0x...).
export const ANTIQUE_BLUE = '#2E4A78';     // gedecktes Antikblau
export const ANTIQUE_PURPLE = '#6B2D5B';   // Purpurrot/Violett
export const ANTIQUE_SCARLET = '#8E2B25';  // Scharlach
export const BYSSUS_TONE = '#E8DFC8';      // feines Geleininen, naturweiss

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  return [c, ctx];
}

function toTexture(
  c: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// --- SPEC-perf-stoffe B: CC0-Stoff-Texturen (ambientCG, CC0 — siehe
// public/textures/LICENSE-CC0.md) ---
// - fabric-weave (feines Gewebe) → Byssus-Vorhaenge, Tor, Parochet-Grundstoff
// - fabric-burlap (grob) → Zelte (ersetzt makeGoatHair als map), Herdenzelte
// TextureLoader laedt asynchron; bei Fetch-Failure wird das Canvas-Bild der
// Fallback-Textur in DIESELBE Textur-Instanz uebernommen (Material-Singletons
// bleiben unangetastet). Normal-Maps werden nur im HIGH-Tier geladen
// (low-Tier: null — spart Mobile Bandbreite/GPU).
const fabricLoader = new THREE.TextureLoader();

// Callbacks: Canvas-Texturen (Tor/Parochet/Schirm/Dach-Innenseite) kompositieren
// die Gewebe-Textur ueber ihre Farbverlaeufe, sobald das Bild geladen ist.
const weaveRedraws: ((img: HTMLImageElement) => void)[] = [];

function loadFabricColor(
  url: string,
  repeatX: number,
  repeatY: number,
  fallback: THREE.CanvasTexture,
  onImage?: (img: HTMLImageElement) => void
): THREE.Texture {
  const tex = fabricLoader.load(
    url,
    (t) => {
      if (onImage && t.image) onImage(t.image as HTMLImageElement);
    },
    undefined,
    () => {
      // onError: Canvas-Fallback (Identitaet der Textur bleibt erhalten)
      if (fallback.image) {
        tex.image = fallback.image;
        tex.needsUpdate = true;
      }
    }
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function loadFabricNormal(url: string, repeatX: number, repeatY: number): THREE.Texture | null {
  if (detectQuality() !== 'high') return null; // Normal-Maps nur HIGH-Tier
  const tex = fabricLoader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

// Weiches Ueberblenden der Gewebe-Struktur in eine Canvas-Textur (C2:
// "Gewebe-Textur drunter"): Overlay-Komposition, danach needsUpdate.
function registerWeaveOverlay(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  tex: THREE.CanvasTexture,
  alpha = 0.3
) {
  weaveRedraws.push((img) => {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    tex.needsUpdate = true;
  });
}

// SPEC-marc-feedback2 F: GEWIRKTE FARBFLÄCHEN statt vertikaler Streifen
// (Marc-Entscheidung 24.09.): große, weich überblendete Farb-Flecken/Bahnen —
// 2-3 übergroße radiale bzw. diagonale Farbfelder JE Farbe (Grundton + Felder
// der übrigen Farben), darüber feine Web-Struktur (addWeaveStripes) und
// Cherubim-Silhouetten wo biblisch. Ziel: wie ein echter Figurenstoff —
// KEINE erkennbare Streifenrichtung, keine harten Kanten, antik gedeckt.
function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function fillWovenFields(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[]
) {
  // Deterministischer Zufall (stabile Texturen über Reloads); Seed je Canvas
  // abweichend, damit Tor/Parochet/Schirm/Dach nicht identische Felder zeigen
  let seed = (0x57123 ^ Math.imul(w, 131) ^ Math.imul(h, 31)) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Grundton
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);
  const span = Math.max(w, h) * 1.4;
  for (let i = 1; i < colors.length; i++) {
    // 2-3 übergroße radiale Farbfelder je Farbe, weich auslaufend
    const fields = 2 + Math.floor(rand() * 2);
    for (let k = 0; k < fields; k++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = (0.45 + rand() * 0.45) * span;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, hexToRgba(colors[i], 0.75));
      g.addColorStop(0.6, hexToRgba(colors[i], 0.4));
      g.addColorStop(1, hexToRgba(colors[i], 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // 1 diagonale Bahn je Farbe, Richtung je Feld NEU gewürfelt —
    // dadurch entsteht keine erkennbare Streifenrichtung
    const ang = rand() * Math.PI * 2;
    const x0 = rand() * w;
    const y0 = rand() * h;
    const g2 = ctx.createLinearGradient(
      x0,
      y0,
      x0 + Math.cos(ang) * span,
      y0 + Math.sin(ang) * span
    );
    g2.addColorStop(0, hexToRgba(colors[i], 0));
    g2.addColorStop(0.5, hexToRgba(colors[i], 0.5));
    g2.addColorStop(1, hexToRgba(colors[i], 0));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }
}

// --- Sand / Erde (Wuestenboden ausserhalb des Vorhofs) ---
// SPEC B: 2-stufige Koernung (fein + grobe Kiesel), 3 Sand-Toene,
// Duenen-Rippel (horizontale Sinus-Baender), repeat hoch (18-24)
function makeSand(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  // 3 Sand-Toene als weiche ueberlappende Flecken (Farbtiefe statt 1 Ton)
  ctx.fillStyle = '#C2A878';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['rgba(201,177,140,0.30)', 'rgba(178,150,108,0.28)', 'rgba(138,115,85,0.22)'];
  for (const tone of tones) {
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 24 + Math.random() * 56;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, tone);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  // Stufe 1: feine Koernung
  for (let i = 0; i < 2400; i++) {
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(120,95,60,${0.06 + Math.random() * 0.14})`
      : `rgba(224,204,164,${0.05 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  // Stufe 2: grobe Kiesel-Punkte
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = `rgba(105,82,52,${0.14 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Duenen-Rippel: horizontale Sinus-Baender (leicht wellig)
  for (let y = 4; y < 256; y += 10) {
    ctx.strokeStyle = `rgba(150,124,88,${0.08 + Math.random() * 0.06})`;
    ctx.lineWidth = 2 + Math.random() * 1.5;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + Math.sin(x * 0.05 + y * 0.3) * 3.2;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  return toTexture(c, 20, 20);
}

// --- Feste Erde (Vorhof-Boden) ---
// SPEC B: Tretspuren + Wellen-Pattern + 3 Erdtoene, repeat hoch
function makeEarth(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['rgba(160,132,98,0.26)', 'rgba(120,98,70,0.28)', 'rgba(100,80,56,0.2)'];
  for (const tone of tones) {
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 26 + Math.random() * 58;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, tone);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  // feine Koernung
  for (let i = 0; i < 2000; i++) {
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(78,60,40,${0.06 + Math.random() * 0.12})`
      : `rgba(190,166,130,${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  // Tretspuren / Flecken — fein und dezent
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = `rgba(90,70,48,${0.04 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 256, Math.random() * 256,
      4 + Math.random() * 10, 3 + Math.random() * 7,
      Math.random() * Math.PI, 0, Math.PI * 2
    );
    ctx.fill();
  }
  // Wellen-Pattern: leichte Trittrillen (weiche Sinus-Baender)
  for (let y = 6; y < 256; y += 14) {
    ctx.strokeStyle = `rgba(96,76,52,${0.06 + Math.random() * 0.05})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + Math.sin(x * 0.04 + y * 0.2) * 4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  return toTexture(c, 18, 18);
}

// --- Leinen / Byssus: feines Webmuster (B2: 2-Pixel-Raster + leichte Irritation) ---
function makeLinen(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#F5EFE0';
  ctx.fillRect(0, 0, 256, 256);
  // feine Fadenstruktur im 2-Pixel-Raster (Kette)
  for (let x = 0; x < 256; x += 2) {
    ctx.fillStyle = `rgba(255,252,240,${0.1 + Math.random() * 0.12})`;
    ctx.fillRect(x, 0, 1, 256);
  }
  // Schussfaden im 2-Pixel-Raster
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = `rgba(190,178,152,${0.08 + Math.random() * 0.1})`;
    ctx.fillRect(0, y, 256, 1);
  }
  // leichte Irritation: versetzte Knickstellen + Flusen
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.strokeStyle = `rgba(200,188,160,${0.12 + Math.random() * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(180,168,140,${0.08 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  return toTexture(c, 10, 2);
}

// --- Ziegenhaar: grobe vertikale Struktur (Basis aufgehellt: Re-Review-Befund
//     "Zelte lesen sich als schwarze Silhouette" — dunkle Texturbasis x helle
//     Materialfarbe ergab trotzdem fast-schwarz) ---
function makeGoatHair(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#8A8378';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2 + Math.random() * 5) {
    const dark = Math.random() > 0.5;
    ctx.strokeStyle = dark
      ? `rgba(38,34,30,${0.25 + Math.random() * 0.3})`
      : `rgba(110,104,94,${0.2 + Math.random() * 0.3})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, 85, x + (Math.random() - 0.5) * 8, 170, x + (Math.random() - 0.5) * 6, 256);
    ctx.stroke();
  }
  // Querverbindungen (Webnaehte)
  for (let y = 24; y < 256; y += 42 + Math.random() * 20) {
    ctx.strokeStyle = 'rgba(30,26,22,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  return toTexture(c, 4, 1);
}

// --- Holz: Laengsmaserung (Akazien) mit Knoten-Andeutung (B2, Reserve:
//     NICHT auf vergoldeten Balken/Geraeten — nur Nicht-Heiligtum-Moebel) ---
function makeWood(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#6B4A32';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2 + Math.random() * 6) {
    const dark = Math.random() > 0.4;
    ctx.strokeStyle = dark
      ? `rgba(52,34,20,${0.2 + Math.random() * 0.3})`
      : `rgba(140,102,64,${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (Math.random() - 0.5) * 6, 85, x + (Math.random() - 0.5) * 6, 170, x + (Math.random() - 0.5) * 4, 256);
    ctx.stroke();
  }
  // Knoten-Andeutungen: kleine ovale Maserungswirbel
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    for (let r = 2; r < 12; r += 2.5) {
      ctx.strokeStyle = `rgba(52,34,20,${0.14 + Math.random() * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return toTexture(c, 2, 1);
}

// --- Sandstreifen fuer Zelte (gedecktes Muster) ---
function makeTentStripe(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128);
  ctx.fillStyle = '#A89068';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = 'rgba(96,78,52,0.5)';
    ctx.fillRect(x, 0, 7, 128);
  }
  return toTexture(c, 3, 1);
}

// --- Weiche Wolke (Billboard-Sprite) ---
function makeCloud(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 14; i++) {
    const x = 60 + Math.random() * 136;
    const y = 100 + Math.random() * 56;
    const r = 26 + Math.random() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,250,240,0.6)');
    g.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Radialer Glow (Shekinah) ---
function makeGlow(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,244,214,1)');
  g.addColorStop(0.3, 'rgba(255,224,150,0.55)');
  g.addColorStop(0.7, 'rgba(255,200,110,0.16)');
  g.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Rauch-Sprite ---
function makeSmoke(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128);
  for (const [dx, dy, r, a] of [
    [64, 68, 52, 0.5],
    [52, 52, 30, 0.35],
    [78, 56, 28, 0.3],
  ] as const) {
    const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
    g.addColorStop(0, `rgba(96,86,74,${a})`);
    g.addColorStop(1, 'rgba(96,86,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- God-Rays-Gradientkeim (vertikal + horizontal auslaufend) ---
function makeGodRay(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 256);
  const v = ctx.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, 'rgba(255,226,160,0.9)');
  v.addColorStop(0.55, 'rgba(255,210,140,0.4)');
  v.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 64, 256);
  // horizontal weich auslaufen
  ctx.globalCompositeOperation = 'destination-in';
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.5, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 64, 256);
  ctx.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- SPEC-vorhaenge E1: Wiederverwendbare Cherubim-Wirkerei-Silhouette ---
// Stilisiert, geometrisch (low-poly-artig), 2 Flügel hochgebogen zum
// Dach-Hinweis (Ex 25,20-Anmutung). Flächige Silhouette in Stofffarben
// (Ex 26,1/26,31: "einweben" = Wirkerei, NICHT Gold) — konsistent in
// Deckteppichen (C2) und Parochet (D1).
function drawCherubim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const s = size;
  ctx.fillStyle = color;
  // Körper: geometrisch, nach unten spitz zulaufend (Gewand-Form)
  ctx.beginPath();
  ctx.moveTo(x, y - 24 * s);
  ctx.lineTo(x + 9 * s, y - 10 * s);
  ctx.lineTo(x + 6 * s, y + 26 * s);
  ctx.lineTo(x, y + 34 * s);
  ctx.lineTo(x - 6 * s, y + 26 * s);
  ctx.lineTo(x - 9 * s, y - 10 * s);
  ctx.closePath();
  ctx.fill();
  // Kopf
  ctx.beginPath();
  ctx.arc(x, y - 29 * s, 6.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // linker Flügel: hochgebogen (Spitze über Kopfhöhe)
  ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 12 * s);
  ctx.quadraticCurveTo(x - 32 * s, y - 26 * s, x - 44 * s, y - 52 * s);
  ctx.quadraticCurveTo(x - 24 * s, y - 18 * s, x - 9 * s, y + 6 * s);
  ctx.closePath();
  ctx.fill();
  // rechter Flügel (gespiegelt)
  ctx.beginPath();
  ctx.moveTo(x + 5 * s, y - 12 * s);
  ctx.quadraticCurveTo(x + 32 * s, y - 26 * s, x + 44 * s, y - 52 * s);
  ctx.quadraticCurveTo(x + 24 * s, y - 18 * s, x + 9 * s, y + 6 * s);
  ctx.closePath();
  ctx.fill();
}

// Helligkeit eines Pixels (für hell/dunkel-Absetzung der Wirkerei) — die
// Feldfarbe wird direkt aus dem Gewebe-Sampling gelesen (F: keine Streifen-
// Geometrie mehr, aus der man eine Feldfarbe ableiten könnte).
function tapestryColorAt(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  const px = Math.max(0, Math.min(ctx.canvas.width - 1, x | 0));
  const py = Math.max(0, Math.min(ctx.canvas.height - 1, y | 0));
  const d = ctx.getImageData(px, py, 1, 1).data;
  const luma = (0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]) / 255;
  return luma > 0.5
    ? 'rgba(107,45,91,0.55)'   // Violett-Silhouette auf hellem Feld
    : 'rgba(232,223,200,0.5)'; // Byssus-Hell-Silhouette auf dunklem Feld
}

// A2/B2/D2: feine Web-Streifen IN den Farbfeldern (Kunstweber-Look):
// Kette (vertikal, hell/dunkel alternierend) + angedeuteter Schuss.
function addWeaveStripes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  step = 4
) {
  for (let x = 0; x < w; x += step) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, 0, 1, h);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(x + step / 2, 0, 1, h);
  }
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, y, w, 1);
  }
}

// --- Tor des Vorhofs: bunt gewirkte Decke blau/violett/scharlach/byssus
// (Ex 27,16). A1: KEINE Cherubim (Ex 27,16 nennt keine). F: gewirkte
// FARBFLÄCHEN (fillWovenFields) + feine Web-Struktur — keine Streifenrichtung
// erkennbar; die Gewebe-Textur wird nach dem Laden ueberblendet. ---
function makeGate(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  fillWovenFields(ctx, 256, 256, [ANTIQUE_BLUE, ANTIQUE_PURPLE, ANTIQUE_SCARLET, BYSSUS_TONE]);
  // feine Web-Struktur in den Farbfeldern (Canvas-eigene Basis, bis das
  // Weave-Bild laedt)
  addWeaveStripes(ctx, 256, 256, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  registerWeaveOverlay(c, ctx, t, 0.32);
  return t;
}

// --- Parochet: 4 Farben + Cherubim-Wirkerei (Ex 26,31) ---
// D1: Antik-Palette, F: gewirkte Farbflächen (fillWovenFields), Cherubim als
// flaeche Wirkerei-Silhouetten in Stofffarben (hell auf dunklem Feld, dunkel
// auf hellem Feld, Feldfarbe per Pixel-Sampling), gleichmaessig wiederholt;
// Byssus-Grundstoff = fabric-weave (Overlay nach Bild-Laden + als Material-Map). ---
const VEIL_COLORS = [ANTIQUE_BLUE, ANTIQUE_PURPLE, ANTIQUE_SCARLET, BYSSUS_TONE];
function makeVeil(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  fillWovenFields(ctx, 256, 256, VEIL_COLORS);
  // Byssus-Basis: feines Leinenraster über allen Feldern
  addWeaveStripes(ctx, 256, 256, 3);
  // D1: Wirkerei-Raster — Cherubim-Silhouetten in Stofffarben, abgesetzt
  // vom lokalen Farbfeld (hell auf dunkel, dunkel auf hell), versetzt
  // über die ganze Flaeche
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * 64 + (row % 2 === 0 ? 24 : 44);
      const cy = row * 60 + 40;
      drawCherubim(ctx, cx, cy, 0.5, tapestryColorAt(ctx, cx, cy));
    }
  }
  // grosse Cherubim im mittleren Band (Hauptwirkerei, Stofffarben)
  drawCherubim(ctx, 116, 150, 0.95, tapestryColorAt(ctx, 116, 150));
  drawCherubim(ctx, 196, 150, 0.95, tapestryColorAt(ctx, 196, 150));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  registerWeaveOverlay(c, ctx, t, 0.35);
  return t;
}

// --- Gold: feines Hammer-Schlag-Muster (B2) — als bumpMap, dezentes
//     Zell-Noise aus überlappenden flachen Schlägen ---
function makeGold(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  // Hammer-Schläge: weiche runde Vertiefungen (hell/dunkel-Rand), sehr dezent
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 7 + Math.random() * 12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(108,108,108,0.55)');
    g.addColorStop(0.75, 'rgba(148,148,148,0.28)');
    g.addColorStop(1, 'rgba(160,160,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // feiner Zell-Noise-Grund
  for (let i = 0; i < 2600; i++) {
    const v = 118 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// --- Gold-Hammerung als ROUGHNESS-Map (B2-Nachbesserung): bei metalness 1.0
//     verschluckt die Env-Reflexion die bumpMap — die Roughness-Map moduliert
//     dagegen die Glaette pro Pixel und ist in jedem Licht sichtbar. Hell =
//     rau (Schlag-Mitte), dunkel = glatt (Schlag-Rand + Grund). ---
function makeGoldRough(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  // Grund: glatt (dunkel, low roughness)
  ctx.fillStyle = '#3A3A3A';
  ctx.fillRect(0, 0, 256, 256);
  // Hammer-Schläge: raue Mitte (hell), glatter Rand
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 7 + Math.random() * 12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(200,200,200,0.75)');
    g.addColorStop(0.6, 'rgba(120,120,120,0.4)');
    g.addColorStop(1, 'rgba(58,58,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
function makeBread(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  // Grund-Kruste mit hellem Zentrum (flach-rundes Schaubrot von oben)
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  g.addColorStop(0, '#E8B878');
  g.addColorStop(0.7, '#D9A05B');
  g.addColorStop(1, '#9C6633');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // Koernung / Broetchen-Poren
  for (let i = 0; i < 1500; i++) {
    const dark = Math.random() > 0.45;
    ctx.fillStyle = dark
      ? `rgba(120,72,32,${0.1 + Math.random() * 0.2})`
      : `rgba(240,205,150,${0.08 + Math.random() * 0.16})`;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  // dunklere Backränder (Ringe nahe der Kante)
  for (let r = 92; r < 126; r += 7) {
    ctx.strokeStyle = `rgba(110,64,26,${0.12 + Math.random() * 0.12})`;
    ctx.lineWidth = 1.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Bronze: dunkle Patina-Mischung (B2) — Reibglanz in der Mitte,
//     gruenliche Patina-Flecken an den Raendern ---
function makeBronze(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  // heller Reibflächen-Kern (multipliziert mit der Bronze-Grundfarbe)
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 140);
  g.addColorStop(0, '#F0D8BC');
  g.addColorStop(0.55, '#E2BE96');
  g.addColorStop(1, '#C09468');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // gruenliche Patina-Flecken, zu den Raendern hin dichter
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 70 + Math.random() * 70; // bevorzugt aussen
    const x = 128 + Math.cos(a) * rr;
    const y = 128 + Math.sin(a) * rr;
    const r = 4 + Math.random() * 14;
    const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
    pg.addColorStop(0, `rgba(96,142,110,${0.28 + Math.random() * 0.3})`);
    pg.addColorStop(1, 'rgba(96,142,110,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // dunkle Koernung
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(60,40,24,${0.06 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Unterseite der Byssus-Decke (Ex 26,1: 10 Vorhaenge) ---
// C1: 4-Farben-Flaeche statt Byssus-dominant: feines Leinen (0xE8DFC8) als
// Grundton, darauf flaeche Wirkerei-Bahnen in Blau/Violett/Karmesin (je
// Teppich-Bahn ein Farbcharakter), antik gedeckt (Byssus-Schleier darueber).
// F: GEWIRKTE FARBFLÄCHEN (fillWovenFields) statt Bahnen-Streifen; die 10
// Nähte bleiben als dezente Bahnen-Andeutung (ohne Streifenrichtung).
// C2: Cherubim-Silhouetten eingewebt — mehrere flaeche Figuren in Stofffarben,
// wiederholt ueber die ganze Flaeche.
// C3: 10 vertikale Naehte + blaue Schlaufen-Perforation oben (Ex 26,4). ---
function makeUnderRoof(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 256);
  // 3 Farb-Stoffe als gewirkte Felder (Byssus als Grundton)
  fillWovenFields(ctx, 512, 256, [ANTIQUE_BLUE, ANTIQUE_PURPLE, ANTIQUE_SCARLET]);
  // antik gedeckt: Byssus-Schleier ueber den Farbfeldern
  ctx.fillStyle = 'rgba(232,223,200,0.26)';
  ctx.fillRect(0, 0, 512, 256);
  // feine Web-Struktur in den Farbfeldern (Kunstweber-Look)
  addWeaveStripes(ctx, 512, 256, 4);
  // C2: Cherubim-Wirkerei-Muster — wiederholt, verteilt ueber die Flaeche
  // (nicht nur Rand), Silhouetten in Stofffarben abgesetzt vom Untergrund
  // (Feldfarbe per Pixel-Sampling NACH dem Byssus-Schleier)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = col * 102.4 + 51 + (row % 2 === 0 ? 0 : 51.2);
      const cy = row * 78 + 66;
      drawCherubim(ctx, cx % 512, cy, 0.55, tapestryColorAt(ctx, cx % 512, cy));
    }
  }
  // dezente vertikale Nähte: Andeutung der 10 einzelnen Deckteppiche
  for (let i = 1; i < 10; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect((i * 512) / 10, 12, 1, 232);
  }
  // C3: Schlaufen-Reihe oben (Ex 26,4 "Ränder von Blau") — dezente
  // blaue Perforation
  for (let x = 8; x < 512; x += 16) {
    ctx.fillStyle = 'rgba(46,74,120,0.5)';
    ctx.fillRect(x, 2, 4, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  registerWeaveOverlay(c, ctx, t, 0.3);
  return t;
}

// --- Eingangsschirm des Heiligen (Ex 26,36) ---
// B1: KEINE Cherubim (Ex 26,36: nur "bunt gewebt"). B2: Antik-Palette.
// F: gewirkte Farbflächen (fillWovenFields) + feine Web-Struktur,
// Gewebe-Overlay.
function makeScreen(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  fillWovenFields(ctx, 256, 256, [
    ANTIQUE_BLUE,
    ANTIQUE_PURPLE,
    ANTIQUE_SCARLET,
    BYSSUS_TONE,
  ]);
  addWeaveStripes(ctx, 256, 256, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  registerWeaveOverlay(c, ctx, t, 0.32);
  return t;
}

// --- Vertikaler Wuesten-Gradient (generierte Environment-Szene) ---
function makeEnvGradient(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(16, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5E82A6');   // Zenit: gedecktes Wuestenblau
  g.addColorStop(0.55, '#C9C2AC');
  g.addColorStop(0.72, '#D8C4A0'); // staubiger Horizont
  g.addColorStop(1, '#8B7355');   // Boden
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Modul-Singletons: einmalige Erzeugung beim ersten Import
export const sandTexture = makeSand();
export const earthTexture = makeEarth();
export const linenTexture = makeLinen();
export const goatHairTexture = makeGoatHair();
export const woodTexture = makeWood();
export const tentStripeTexture = makeTentStripe();
export const cloudTexture = makeCloud();
export const glowTexture = makeGlow();
export const smokeTexture = makeSmoke();
export const godRayTexture = makeGodRay();
export const gateTexture = makeGate();
export const veilTexture = makeVeil();
export const underRoofTexture = makeUnderRoof();
export const screenTexture = makeScreen();
export const envGradientTexture = makeEnvGradient();
export const goldTexture = makeGold();
export const goldRoughTexture = makeGoldRough();
export const breadTexture = makeBread();
export const bronzeTexture = makeBronze();

// --- SPEC-perf-stoffe B: CC0-Stoffe (ambientCG) ---
// weaveColor: Byssus-Grundstoff (repeat 3,2 Vorhaenge); sobald das Bild da ist,
// werden die Canvas-Texturen von Tor/Parochet/Schirm/Dach-Innenseite mit der
// Gewebe-Struktur ueberblendet. Fallback: Canvas-Leinen.
export const weaveColorTexture = loadFabricColor(
  '/textures/fabric-weave/color.jpg',
  3,
  2,
  linenTexture,
  (img) => {
    for (const redraw of weaveRedraws) redraw(img);
  }
);
export const weaveNormalTexture = loadFabricNormal('/textures/fabric-weave/normal.jpg', 3, 2);

// burlapColor: Ziegenhaar-Zeltstoff (repeat 4,4 Zelte) — ersetzt makeGoatHair
// als map; Canvas-Ziegenhaar bleibt onError-Fallback. Tinting via Material.color.
export const burlapColorTexture = loadFabricColor(
  '/textures/fabric-burlap/color.jpg',
  4,
  4,
  goatHairTexture
);
export const burlapNormalTexture = loadFabricNormal('/textures/fabric-burlap/normal.jpg', 4, 4);
