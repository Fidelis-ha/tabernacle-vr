import * as THREE from 'three';
import {
  sandTexture,
  earthTexture,
  linenTexture,
  goatHairTexture,
  woodTexture,
  gateTexture,
  veilTexture,
  underRoofTexture,
  screenTexture,
} from './textures';

// Material-Singletons (Budget-Regel 5): JEDES Preset genau EINE geteilte
// Instanz auf Modulebene. Komponenten verwenden material={GOLD} statt
// <meshStandardMaterial {...preset} />.
// AUSNAHME: wirklich individuelle emissive Effekte (Glut, Flacker-Lichter)
// brauchen eigene Instanzen — identische Flammen teilen sich FLAME.

// Gemeinsames Flammen-Material (Menora-Laemmchen + Altarfeuer-Kegel):
// EINE geteilte emissive Instanz statt 7+ identischer Duplikate
export const FLAME = new THREE.MeshStandardMaterial({
  color: 0xFF9933,
  emissive: 0xFFAA00,
  emissiveIntensity: 2.2,
});

// Gold - hochreflektierend, PBR-plain mit envMap (KEINE Textur)
export const GOLD = new THREE.MeshStandardMaterial({
  color: 0xD4AF37,
  metalness: 1.0,
  roughness: 0.18,
  envMapIntensity: 1.0,
});

// Bronze/Kupfer mit Patina
export const BRONZE = new THREE.MeshStandardMaterial({
  color: 0xB87333,
  metalness: 0.9,
  roughness: 0.3,
  envMapIntensity: 1.0,
});

// Silber - hell reflektierend
export const SILVER = new THREE.MeshStandardMaterial({
  color: 0xE8E8E8,
  metalness: 1.0,
  roughness: 0.15,
  envMapIntensity: 1.5,
});

// Gezwirnter Byssus (Leinen) fuer Vorhof-Vorhaenge (Ex 27,9)
export const BYSSUS = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.85,
  map: linenTexture,
  bumpMap: linenTexture,
  bumpScale: 0.015,
  side: THREE.DoubleSide,
});

// Innenseite der Byssus-Decke (blau/violett, Cherubim via Textur)
export const BYSSUS_CHERUBIM = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.75,
  map: underRoofTexture,
  side: THREE.DoubleSide,
});

// Ziegenhaar - grobe Struktur, halbtransparent
export const GOAT_HAIR = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.92,
  map: goatHairTexture,
  transparent: true,
  opacity: 0.94,
  side: THREE.DoubleSide,
});

// Rot gefaerbte Widderfelle (Ex 26,14)
export const RAM_SKIN = new THREE.MeshStandardMaterial({
  color: 0x8B3E2F,
  roughness: 0.9,
  side: THREE.DoubleSide,
});

// Tachasch-Felle - dunkle Dachhaut
export const TACHASH = new THREE.MeshStandardMaterial({
  color: 0x2E2118,
  roughness: 0.95,
  side: THREE.DoubleSide,
});

// Akazienholz mit Laengsmaserung
export const ACACIA_WOOD = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.65,
  map: woodTexture,
  bumpMap: woodTexture,
  bumpScale: 0.01,
});

// Wuestensand (Boden ausserhalb)
export const SAND = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 1.0,
  map: sandTexture,
  bumpMap: sandTexture,
  bumpScale: 0.03,
});

// Feste Erde (Vorhof)
export const EARTH = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.95,
  map: earthTexture,
  bumpMap: earthTexture,
  bumpScale: 0.02,
});

// Tor des Vorhofs: bunt gewirkte Decke als Textur (Ex 27,16)
export const GATE_MAT = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.75,
  map: gateTexture,
  side: THREE.DoubleSide,
});

// Parochet: 4 Farben + Cherubim-Wirkerei als Textur (Ex 26,31)
export const VEIL_MAT = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.65,
  metalness: 0.05,
  map: veilTexture,
  side: THREE.DoubleSide,
});

// Eingangsschirm des Heiligen (Ex 26,36)
export const SCREEN_MAT = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.7,
  map: screenTexture,
  side: THREE.DoubleSide,
});

// Hängetau
export const ROPE = new THREE.MeshStandardMaterial({
  color: 0xD8CBB0,
  roughness: 0.9,
});

// Schaubrote
export const BREAD = new THREE.MeshStandardMaterial({
  color: 0xD4A574,
  roughness: 0.85,
});

// Wasser im Becken
export const WATER = new THREE.MeshStandardMaterial({
  color: 0x3E5C52,
  metalness: 0.3,
  roughness: 0.05,
  transparent: true,
  opacity: 0.75,
});
