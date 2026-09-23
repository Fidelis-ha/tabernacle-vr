import * as THREE from 'three';

// Prozedurale Canvas-Texturen (SPEC aaa, Abschnitt b) — einmalig erzeugt,
// als Modul-Singletons geteilt. Kein Netzwerk-Asset-Load.

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

// Per-pixel grain: base color + random variation
function grain(ctx: CanvasRenderingContext2D, size: number, base: [number, number, number], variation: number) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * variation;
    d[i] = Math.max(0, Math.min(255, base[0] + n));
    d[i + 1] = Math.max(0, Math.min(255, base[1] + n));
    d[i + 2] = Math.max(0, Math.min(255, base[2] + n));
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// --- Sand / Erde (Wuestenboden ausserhalb des Vorhofs) ---
function makeSand(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  grain(ctx, 256, [194, 168, 120], 30);
  // dunklere Koernung + ein paar Steinchen
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,95,60,${0.08 + Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(220,200,160,${0.1 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, 26, 26);
}

// --- Feste Erde (Vorhof-Boden) ---
function makeEarth(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  grain(ctx, 256, [139, 115, 85], 34);
  // Tretspuren / Flecken — fein und dezent (kein Pflaster-Raster in der Distanz)
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
  return toTexture(c, 16, 16);
}

// --- Leinen / Byssus: feines Webmuster ---
function makeLinen(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#F5EFE0';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = `rgba(190,178,152,${0.16 + Math.random() * 0.1})`;
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = `rgba(255,252,240,${0.14 + Math.random() * 0.1})`;
    ctx.fillRect(x, 0, 1, 256);
  }
  return toTexture(c, 10, 2);
}

// --- Ziegenhaar: grobe vertikale Struktur ---
function makeGoatHair(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = '#55504A';
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
    ctx.strokeStyle = 'rgba(30,26,22,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  return toTexture(c, 4, 1);
}

// --- Holz: Laengsmaserung (Akazien) ---
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
    g.addColorStop(0, `rgba(130,122,112,${a})`);
    g.addColorStop(1, 'rgba(130,122,112,0)');
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

// --- Goldene Cherubim-Andeutung auf Stoff zeichnen ---
function drawCherub(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  // aeusserer Fluegel
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 42 * s, y - 30 * s, x - 62 * s, y - 4 * s);
  ctx.stroke();
  // innerer Fluegel nach oben
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 18 * s, y - 42 * s, x + 44 * s, y - 46 * s);
  ctx.stroke();
}

// --- Tor des Vorhofs: 4 Streifen blau/violett/scharlach/byssus (Ex 27,16) ---
function makeGate(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const colors = ['#1E3A5F', '#4B0082', '#8B0000', '#F5EFE0'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * 64, 0, 64, 256);
  });
  // Leinenstruktur darueber
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, 256, 1);
  }
  // Goldfaeden als Wirkerei: dicke, kontrastreiche vertikale + horizontale
  // Goldlinien (2-3 px), damit die Wirkerei auch auf Distanz lesbar bleibt
  for (let x = 6; x < 256; x += 14) {
    ctx.fillStyle = 'rgba(212,175,55,0.42)';
    ctx.fillRect(x, 0, 2, 256);
  }
  for (let y = 10; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(212,175,55,0.3)';
    ctx.fillRect(0, y, 256, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- Parochet: 4 Farben + Cherubim-Wirkerei (Ex 26,31) ---
function makeVeil(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const colors = ['#1E3A5F', '#4B0082', '#8B0000', '#F5EFE0'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * 64, 0, 64, 256);
  });
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, 256, 1);
  }
  drawCherub(ctx, 96, 150, 1.15, 0.5);
  drawCherub(ctx, 176, 150, 1.15, 0.5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Unterseite der Byssus-Decke: 4-farbige Streifen + Cherubim (Ex 26,1) ---
function makeUnderRoof(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 256);
  const colors = ['#1E3A5F', '#4B0082', '#8B0000', '#F5EFE0'];
  const bandH = 256 / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[i % 4];
    ctx.fillRect(0, i * bandH, 512, bandH);
  }
  for (let x = 0; x < 512; x += 5) {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(x, 0, 1, 256);
  }
  for (const frac of [0.28, 0.5, 0.72]) {
    drawCherub(ctx, 256 - 70, 256 * frac, 1.3, 0.34);
    drawCherub(ctx, 256 + 70, 256 * frac, 1.3, 0.34);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Eingangsschirm des Heiligen: 5 Streifen (Ex 26,36) ---
function makeScreen(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const colors = ['#1E3A5F', '#4B0082', '#8B0000', '#F5EFE0', '#1E3A5F'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * 51.2, 0, 51.2, 256);
  });
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, 256, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
