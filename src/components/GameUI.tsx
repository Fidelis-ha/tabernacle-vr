import { useEffect, useCallback, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { detectQuality, type QualityTier } from '../utils/quality';

// === AUDIO (SPEC aaa: raeumliches Audio + Musikschicht, alles prozedural) ===
// - Altarfeuer: Noise-Buffer + Bandpass (LFO) ueber PannerNode an (0, 1.4, 27)
// - Menora-Flackern: leises gefiltertes Rauschen an (-1.1, 1, 36)
// - Wind-Loop: global, StereoPanner mit langsamer Richtungsmodulation
// - Musik: 2-3 detunierte Sinus-Oszillatoren + Lowpass + LFO, -24 dB unter Ambient
// - Slider-Regler steuern die GainNodes (Set aus v1 beibehalten)

let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let ambientGainNode: GainNode | null = null;
let fireGainNode: GainNode | null = null;
let windGainNode: GainNode | null = null;
let musicGainNode: GainNode | null = null;

export interface AudioSettings {
  master: number;
  ambient: number;
  fire: number;
  wind: number;
  music: number;
}

const defaultSettings: AudioSettings = {
  master: 0.7,
  ambient: 0.4,
  fire: 0.6,
  wind: 0.2,
  music: 0.35,
};

// Loopender Rausch-Buffer (2 s weisses Rauschen, prozedural erzeugt)
function createNoiseSource(context: AudioContext): AudioBufferSourceNode {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = context.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

// PannerNode an eine Weltposition (equalpower: XR-tauglich guenstig)
function createPanner(context: AudioContext, pos: [number, number, number]): PannerNode {
  const panner = context.createPanner();
  panner.panningModel = 'equalpower';
  panner.distanceModel = 'inverse';
  panner.refDistance = 2;
  panner.maxDistance = 60;
  panner.rolloffFactor = 1.2;
  if (panner.positionX) {
    panner.positionX.value = pos[0];
    panner.positionY.value = pos[1];
    panner.positionZ.value = pos[2];
  } else {
    panner.setPosition(pos[0], pos[1], pos[2]);
  }
  return panner;
}

// LFO auf einen AudioParam
function connectLFO(context: AudioContext, param: AudioParam, freq: number, depth: number) {
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = freq;
  lfoGain.gain.value = depth;
  lfo.connect(lfoGain);
  lfoGain.connect(param);
  lfo.start();
}

// Dezente Ambient-Toene (v1-Set beibehalten)
function createAmbientTone(context: AudioContext, freq: number, gain: GainNode, type: OscillatorType = 'sine') {
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();

  osc.type = type;
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 1;

  osc.connect(filter);
  filter.connect(gain);

  osc.start();

  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = 0.1 + Math.random() * 0.2;
  lfoGain.gain.value = freq * 0.02;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfo.start();
}

// Prozedurale Musikschicht: 2-3 detunierte Sinus-Oszillatoren + Lowpass +
// sehr langsame LFO-Modulation (ruhig, sakral, kein Track/Download)
function createMusicLayer(context: AudioContext, gain: GainNode) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 650;
  filter.Q.value = 0.7;

  const padGain = context.createGain();
  padGain.gain.value = 0.5;
  filter.connect(padGain);
  padGain.connect(gain);

  // sehr langsame Amplitudenmodulation (Atmen)
  connectLFO(context, padGain.gain, 0.02, 0.22);

  for (const freq of [110.2, 220, 220.9]) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const oscGain = context.createGain();
    oscGain.gain.value = 0.16;
    osc.connect(oscGain);
    oscGain.connect(filter);
    osc.start();
  }
}

function initAudio(settings: AudioSettings) {
  if (audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioContext;

    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = settings.master;
    masterGainNode.connect(ctx.destination);

    ambientGainNode = ctx.createGain();
    ambientGainNode.gain.value = settings.ambient;
    ambientGainNode.connect(masterGainNode);

    fireGainNode = ctx.createGain();
    fireGainNode.gain.value = settings.fire;
    fireGainNode.connect(masterGainNode);

    windGainNode = ctx.createGain();
    windGainNode.gain.value = settings.wind;
    windGainNode.connect(masterGainNode);

    musicGainNode = ctx.createGain();
    musicGainNode.gain.value = settings.music * 0.12; // ca. -24 dB unter Ambient
    musicGainNode.connect(masterGainNode);

    // Ambient
    createAmbientTone(ctx, 80, ambientGainNode, 'sawtooth');
    createAmbientTone(ctx, 120, ambientGainNode, 'sine');

    // Altarfeuer (z = 27): Noise + Bandpass mit LFO, raeumlich ueber Panner
    const fireNoise = createNoiseSource(ctx);
    const fireBand = ctx.createBiquadFilter();
    fireBand.type = 'bandpass';
    fireBand.frequency.value = 700;
    fireBand.Q.value = 1.1;
    connectLFO(ctx, fireBand.frequency, 0.35, 320);
    const firePanner = createPanner(ctx, [0, 1.4, 27]);
    fireNoise.connect(fireBand);
    fireBand.connect(firePanner);
    firePanner.connect(fireGainNode);
    fireNoise.start();

    // Menora-Flackern (z = 36), leise
    const menoraNoise = createNoiseSource(ctx);
    const menoraBand = ctx.createBiquadFilter();
    menoraBand.type = 'bandpass';
    menoraBand.frequency.value = 2600;
    menoraBand.Q.value = 4;
    connectLFO(ctx, menoraBand.frequency, 0.8, 700);
    const menoraGain = ctx.createGain();
    menoraGain.gain.value = 0.05;
    const menoraPanner = createPanner(ctx, [-1.1, 1, 36]);
    menoraNoise.connect(menoraBand);
    menoraBand.connect(menoraGain);
    menoraGain.connect(menoraPanner);
    menoraPanner.connect(fireGainNode);
    menoraNoise.start();

    // Wind: global, Richtungsmodulation ueber StereoPanner
    const windNoise = createNoiseSource(ctx);
    const windLow = ctx.createBiquadFilter();
    windLow.type = 'lowpass';
    windLow.frequency.value = 350;
    connectLFO(ctx, windLow.frequency, 0.06, 180);
    const windStereo = ctx.createStereoPanner();
    connectLFO(ctx, windStereo.pan, 0.045, 0.6);
    windNoise.connect(windLow);
    windLow.connect(windStereo);
    windStereo.connect(windGainNode);
    windNoise.start();

    // Musikschicht
    createMusicLayer(ctx, musicGainNode);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

// Listener folgt der Kamera (sparsam, ~10 Hz aus GameStateManager).
// WICHTIG: getWorldPosition/getWorldDirection statt camera.position —
// korrekt in UND ausserhalb XR (WebXRManager treibt matrixWorld).
const _forward = new THREE.Vector3();
const _listenerPos = new THREE.Vector3();
export function updateAudioListener(camera: THREE.Camera) {
  if (!audioContext || audioContext.state !== 'running') return;
  const l = audioContext.listener;
  camera.getWorldPosition(_listenerPos);
  camera.getWorldDirection(_forward);
  const p = _listenerPos;
  if (l.positionX) {
    const t = audioContext.currentTime;
    l.positionX.setTargetAtTime(p.x, t, 0.05);
    l.positionY.setTargetAtTime(p.y, t, 0.05);
    l.positionZ.setTargetAtTime(p.z, t, 0.05);
    l.forwardX.setTargetAtTime(_forward.x, t, 0.05);
    l.forwardY.setTargetAtTime(_forward.y, t, 0.05);
    l.forwardZ.setTargetAtTime(_forward.z, t, 0.05);
    l.upX.setTargetAtTime(0, t, 0.05);
    l.upY.setTargetAtTime(1, t, 0.05);
    l.upZ.setTargetAtTime(0, t, 0.05);
  } else {
    l.setPosition(p.x, p.y, p.z);
    l.setOrientation(_forward.x, _forward.y, _forward.z, 0, 1, 0);
  }
}

// === ZUSTAND STORE (SPEC point 16 - no dead dependency) ===
interface GameStore {
  isPaused: boolean;
  audioStarted: boolean;
  settings: AudioSettings;
  restartToken: number;
  resetPosition: { x: number; z: number };
  moveInput: { x: number; z: number };
  xrActive: boolean;
  quality: QualityTier; // SPEC F: einmalig beim Store-Init detektiert
  togglePause: () => void;
  setSettings: (settings: AudioSettings) => void;
  setMoveInput: (input: { x: number; z: number }) => void;
  setXrActive: (active: boolean) => void;
  restart: () => void;
}

// Audio beim ersten User-Gesture starten (Canvas-pointerdown, VR-Button,
// Pause-Menue) — nicht nur ueber togglePause
export function ensureAudioStarted() {
  const { audioStarted, settings } = useGameStore.getState();
  if (!audioStarted) {
    initAudio(settings);
    useGameStore.setState({ audioStarted: true });
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  isPaused: false,
  audioStarted: false,
  settings: defaultSettings,
  restartToken: 0,
  resetPosition: { x: 0, z: -8 },
  moveInput: { x: 0, z: 0 },
  xrActive: false,
  quality: detectQuality(),
  togglePause: () => {
    ensureAudioStarted();
    set({ isPaused: !get().isPaused });
  },
  setSettings: (settings) => set({ settings }),
  setMoveInput: (moveInput) => set({ moveInput }),
  setXrActive: (xrActive) => set({ xrActive }),
  restart: () => set((s) => ({ restartToken: s.restartToken + 1, isPaused: false })),
}));

// Pause menu - rendered as DOM overlay OUTSIDE the Canvas (zustand-driven),
// so it is visible at any position in the world.
export function GameUI() {
  const isPaused = useGameStore((s) => s.isPaused);
  const togglePause = useGameStore((s) => s.togglePause);
  const setSettings = useGameStore((s) => s.setSettings);
  const settings = useGameStore((s) => s.settings);
  const [menuHover, setMenuHover] = useState(false);

  // Write slider values to the audio GainNodes (setTargetAtTime gegen
  // Zipper-Noise bei schnellen Slider-Bewegungen)
  useEffect(() => {
    if (audioContext) {
      const t = audioContext.currentTime;
      if (masterGainNode) masterGainNode.gain.setTargetAtTime(settings.master, t, 0.05);
      if (ambientGainNode) ambientGainNode.gain.setTargetAtTime(settings.ambient, t, 0.05);
      if (fireGainNode) fireGainNode.gain.setTargetAtTime(settings.fire, t, 0.05);
      if (windGainNode) windGainNode.gain.setTargetAtTime(settings.wind, t, 0.05);
      if (musicGainNode) musicGainNode.gain.setTargetAtTime(settings.music * 0.12, t, 0.05);
    }
  }, [settings]);

  if (!isPaused) {
    // SPEC-marc-feedback2 D: dezenter, halbtransparenter Menü-Button oben
    // RECHTS (max ~40 px, opacity 0.55 / hover 0.9, KEIN dunkler Kasten).
    // Klick = gleiches togglePause; ESC-Hinweis nur als title-Tooltip.
    // Die Joystick-Fläche (unten links) bleibt frei.
    return (
      <div style={{
        position: 'absolute', top: '12px', right: '16px',
        zIndex: 500,
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        {useGameStore.getState().quality === 'low' && (
          <div style={{
            color: '#C9C2A0',
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            opacity: 0.55,
          }}>
            ⚡ Leicht-Modus
          </div>
        )}
        <button
          onClick={togglePause}
          title="Menü öffnen (ESC)"
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
          style={{
            height: '32px', maxHeight: '40px',
            padding: '0 12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: '#E8D5B7',
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            cursor: 'pointer',
            opacity: menuHover ? 0.9 : 0.55,
          }}
        >
          ☰ Menü
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(20, 15, 10, 0.95)',
        padding: '30px 40px',
        borderRadius: '15px',
        color: '#FAF0E6',
        fontFamily: 'Georgia, serif',
        textAlign: 'center',
        border: '2px solid #D4AF37',
        boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
        minWidth: '280px',
        pointerEvents: 'auto',
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          color: '#FFD700',
          fontSize: '24px',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
        }}>
          🕎 Stiftshütte
        </h2>

        <div style={{ margin: '20px 0', fontSize: '13px', color: '#C9A84C' }}>
          <p style={{ margin: '8px 0' }}>WASD / Pfeile - Bewegung</p>
          <p style={{ margin: '8px 0' }}>Maus + Linksklick - Drehen</p>
          <p style={{ margin: '8px 0' }}>VR: Controller-Sticks</p>
        </div>

        <div style={{ margin: '20px 0', textAlign: 'left' }}>
          <label style={{ display: 'block', margin: '8px 0', fontSize: '12px' }}>
            🔊 Master: {Math.round(settings.master * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings.master * 100}
              onChange={(e) => setSettings({ ...settings, master: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '8px 0', fontSize: '12px' }}>
            🎵 Ambient: {Math.round(settings.ambient * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings.ambient * 100}
              onChange={(e) => setSettings({ ...settings, ambient: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '8px 0', fontSize: '12px' }}>
            🔥 Feuer: {Math.round(settings.fire * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings.fire * 100}
              onChange={(e) => setSettings({ ...settings, fire: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '8px 0', fontSize: '12px' }}>
            💨 Wind: {Math.round(settings.wind * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings.wind * 100}
              onChange={(e) => setSettings({ ...settings, wind: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '8px 0', fontSize: '12px' }}>
            🎶 Musik: {Math.round(settings.music * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              value={settings.music * 100}
              onChange={(e) => setSettings({ ...settings, music: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button
            onClick={togglePause}
            style={{
              background: 'linear-gradient(180deg, #D4AF37 0%, #B8860B 100%)',
              border: 'none',
              padding: '10px 25px',
              borderRadius: '5px',
              color: '#1a1a2e',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ▶ Weiter
          </button>
          <button
            onClick={useGameStore.getState().restart}
            style={{
              background: 'transparent',
              border: '1px solid #D4AF37',
              padding: '10px 25px',
              borderRadius: '5px',
              color: '#FFD700',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ↺ Neustart
          </button>
        </div>
      </div>
    </div>
  );
}

// Game state manager - inside Canvas so useThree works
export function GameStateManager() {
  const { camera, gl } = useThree();
  const togglePause = useGameStore((s) => s.togglePause);
  const restartToken = useGameStore((s) => s.restartToken);
  const resetPosition = useGameStore((s) => s.resetPosition);
  const lastListenerUpdate = useRef(0);

  // Audio-Init beim ersten Canvas-pointerdown (User-Gesture-Policy der Browser)
  useEffect(() => {
    const el = gl.domElement;
    const onFirstPointerDown = () => ensureAudioStarted();
    el.addEventListener('pointerdown', onFirstPointerDown);
    return () => el.removeEventListener('pointerdown', onFirstPointerDown);
  }, [gl]);

  // Audio-Init auch bei reinem Tastatur-Start (WASD ohne Klick ist
  // ebenfalls eine User-Gesture, die ein AudioContext.resume() erlaubt)
  useEffect(() => {
    const onFirstKeyDown = () => ensureAudioStarted();
    window.addEventListener('keydown', onFirstKeyDown);
    return () => window.removeEventListener('keydown', onFirstKeyDown);
  }, []);

  // Audio-Listener folgt der Kamera, sparsam (~10 Hz)
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t - lastListenerUpdate.current < 0.1) return;
    lastListenerUpdate.current = t;
    updateAudioListener(camera);
  });

  // Desktop reset to start position: outside the gate, z = -8, looking west
  // (XR reset happens in LocomotionController via the XROrigin ref)
  useEffect(() => {
    if (restartToken > 0) {
      camera.position.set(resetPosition.x, 1.6, resetPosition.z);
      camera.rotation.set(0, Math.PI, 0);
    }
  }, [restartToken, resetPosition, camera]);

  // ESC key for pause
  const handleTogglePause = useCallback(() => {
    togglePause();
  }, [togglePause]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause]);

  return null;
}
