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
    ctx.fillStyle = 'rgba(212,175,55,0.6)';
    ctx.fillRect(x, 0, 3, 256);
  }
  for (let y = 10; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(212,175,55,0.45)';
    ctx.fillRect(0, y, 256, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- Parochet: 4 Farben + Cherubim-Wirkerei (Ex 26,31) ---
// B2: Wirkerei sichtbarer — kleine wiederholte Cherubim-Silhouetten
// (2 gezeichnete Formen, golden, alpha 0.35) über die 4 Farbstationen
function makeVeil(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const colors = ['#1E3A5F', '#4B0082', '#8B0000', '#F5EFE0'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * 64, 0, 64, 256);
  });
  // Byssus-Basis: feines Leinenraster über allen Feldern
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(x, 0, 1, 256);
  }
  // Wirkerei-Raster: kleine Cherubim-Silhouetten (Form A breit gefächert,
  // Form B schmal aufgerichtet), versetzt über alle 4 Farbfelder
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * 64 + (row % 2 === 0 ? 22 : 46);
      const cy = row * 60 + 34;
      if ((row + col) % 2 === 0) drawCherub(ctx, cx, cy, 0.42, 0.35);
      else drawCherubNarrow(ctx, cx, cy, 0.42, 0.35);
    }
  }
  // grosse Cherubim im mittleren Band (Hauptwirkerei)
  drawCherub(ctx, 96, 150, 1.15, 0.5);
  drawCherub(ctx, 176, 150, 1.15, 0.5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Schmale Cherubim-Silhouette (zweite Wirkerei-Form, B2) ---
function drawCherubNarrow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
  ctx.lineWidth = 4 * s;
  ctx.lineCap = 'round';
  // beidseitig steil aufragende Flügel
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 16 * s, y - 34 * s, x - 22 * s, y - 52 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 16 * s, y - 34 * s, x + 22 * s, y - 52 * s);
  ctx.stroke();
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
export const goldTexture = makeGold();
export const goldRoughTexture = makeGoldRough();
export const breadTexture = makeBread();
export const bronzeTexture = makeBronze();
