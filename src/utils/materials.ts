// All material presets use MeshStandardMaterial properties
// Spread them into <meshStandardMaterial {...PRESET} /> to avoid shared state issues

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

// Fine twisted Byssus (white linen) - courtyard curtains (Ex 27:9)
export const BYSSUS_WHITE = {
  color: 0xF5EFE0,
  metalness: 0.0,
  roughness: 0.82,
};

// The four curtain colors (Ex 26:1 / 27:16 / 26:31)
// Tekhelet - blue
export const CURTAIN_BLUE = {
  color: 0x1E3A5F,
  metalness: 0.0,
  roughness: 0.7,
};

// Argaman - purple
export const CURTAIN_PURPLE = {
  color: 0x4B0082,
  metalness: 0.0,
  roughness: 0.7,
};

// Shani - scarlet
export const CURTAIN_SCARLET = {
  color: 0x8B0000,
  metalness: 0.0,
  roughness: 0.7,
};

// Byssus (fourth curtain color)
export const CURTAIN_BYSSUS = BYSSUS_WHITE;

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

// Tachash (sea cow) skins - dark outer cover
export const TACHASH = {
  color: 0x2E2118,
  metalness: 0.0,
  roughness: 0.95,
};

// Badger Skins - dark leather
export const BADGER_SKIN = {
  color: 0x3D2B1F,
  metalness: 0.0,
  roughness: 0.95,
};

// Ram Skins (Reddied) - tanned leather, dyed red (Ex 26:14)
export const RAM_SKIN = {
  color: 0x8B3E2F,
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

// Desert Sand - wilderness floor around the courtyard
export const DESERT_SAND = {
  color: 0xC2A878,
  metalness: 0.0,
  roughness: 1.0,
};

// Oil Flame - emissive fire
export const OIL_FLAME = {
  color: 0xFFD700,
  emissive: 0xFFAA00,
  emissiveIntensity: 3.0,
  metalness: 0.0,
  roughness: 0.1,
};

// Bronze Basin Water - dark, greenish, reflective
export const WATER = {
  color: 0x3E5C52,
  metalness: 0.3,
  roughness: 0.05,
  transparent: true,
  opacity: 0.75,
};