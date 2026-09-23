import * as THREE from 'three';

// All materials use MeshPhysicalMaterial for realistic PBR rendering
// Clone them when used to avoid shared state issues

// Gold - highly reflective with clearcoat for Kapporet, Lampstand, Incense Altar
export const GOLD = {
  color: 0xD4AF37,
  metalness: 1.0,
  roughness: 0.1,
  envMapIntensity: 1.5,
};

// Burnished Bronze/Copper - with patina effect
export const BRONZE = {
  color: 0xB87333,
  metalness: 0.9,
  roughness: 0.3,
  envMapIntensity: 1.0,
};

// Silver - bright reflective
export const SILVER = {
  color: 0xE8E8E8,
  metalness: 1.0,
  roughness: 0.15,
  envMapIntensity: 1.5,
};

// Fine Linen (White) - woven texture effect
export const LINEN_WHITE = {
  color: 0xFAF0E6,
  metalness: 0.0,
  roughness: 0.85,
};

// Blue Purpure (Tekhelet) - royal dyed fabric
export const BLUE_PURPURE = {
  color: 0x1E3A5F,
  metalness: 0.0,
  roughness: 0.7,
};

// Purple (Argaman) - royal purple
export const PURPLE = {
  color: 0x4B0082,
  metalness: 0.0,
  roughness: 0.7,
};

// Scarlet (Shani) - vibrant red
export const SCARLET = {
  color: 0x8B0000,
  metalness: 0.0,
  roughness: 0.7,
};

// Goat Hair - rough, semi-transparent canvas
export const GOAT_HAIR = {
  color: 0x4A4A4A,
  metalness: 0.0,
  roughness: 0.9,
  transparent: true,
  opacity: 0.9,
};

// Badger Skins - dark leather
export const BADGER_SKIN = {
  color: 0x3D2B1F,
  metalness: 0.0,
  roughness: 0.95,
};

// Ram Skins (Reddied) - tanned leather
export const RAM_SKIN = {
  color: 0x5C3A21,
  metalness: 0.0,
  roughness: 0.9,
};

// Acacia Wood - golden hardwood
export const ACACIA_WOOD = {
  color: 0x5C4033,
  metalness: 0.0,
  roughness: 0.6,
};

// Packed Earth - dusty ground
export const PACKED_EARTH = {
  color: 0x8B7355,
  metalness: 0.0,
  roughness: 0.98,
};

// Oil Flame - emissive fire
export const OIL_FLAME = {
  color: 0xFFD700,
  emissive: 0xFFAA00,
  emissiveIntensity: 3.0,
  metalness: 0.0,
  roughness: 0.1,
};

// Bronze Basin Water - reflective
export const WATER = {
  color: 0x87CEEB,
  metalness: 0.1,
  roughness: 0.0,
  transparent: true,
  opacity: 0.5,
};

// Helper to create MeshStandardMaterial from preset
export function createMaterial(preset: Record<string, unknown>): THREE.MeshStandardMaterial {
  const { emissive, emissiveIntensity, ...rest } = preset as {
    emissive?: number;
    emissiveIntensity?: number;
    [key: string]: unknown;
  };
  const mat = new THREE.MeshStandardMaterial(rest);
  if (emissive !== undefined) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = emissiveIntensity ?? 1;
  }
  return mat;
}

// Helper to create MeshPhysicalMaterial (better for metals)
export function createPhysicalMaterial(preset: Record<string, unknown>): THREE.MeshPhysicalMaterial {
  const { emissive, emissiveIntensity, ...rest } = preset as {
    emissive?: number;
    emissiveIntensity?: number;
    [key: string]: unknown;
  };
  const mat = new THREE.MeshPhysicalMaterial(rest);
  if (emissive !== undefined) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = emissiveIntensity ?? 1;
  }
  return mat;
}