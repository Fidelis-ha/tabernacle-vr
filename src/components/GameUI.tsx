import { useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { create } from 'zustand';

// Audio context for ambient sounds
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let ambientGainNode: GainNode | null = null;
let fireGainNode: GainNode | null = null;
let windGainNode: GainNode | null = null;

export interface AudioSettings {
  master: number;
  ambient: number;
  fire: number;
  wind: number;
}

const defaultSettings: AudioSettings = {
  master: 0.7,
  ambient: 0.4,
  fire: 0.6,
  wind: 0.2,
};

// Simple audio generation (no external files needed)
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

  return { osc, filter, lfo };
}

function initAudio(settings: AudioSettings) {
  if (audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = settings.master;
    masterGainNode.connect(audioContext.destination);

    ambientGainNode = audioContext.createGain();
    ambientGainNode.gain.value = settings.ambient;
    ambientGainNode.connect(masterGainNode);

    fireGainNode = audioContext.createGain();
    fireGainNode.gain.value = settings.fire;
    fireGainNode.connect(masterGainNode);

    windGainNode = audioContext.createGain();
    windGainNode.gain.value = settings.wind;
    windGainNode.connect(masterGainNode);

    createAmbientTone(audioContext, 80, ambientGainNode, 'sawtooth');
    createAmbientTone(audioContext, 120, ambientGainNode, 'sine');
    createAmbientTone(audioContext, 200, fireGainNode, 'square');
    createAmbientTone(audioContext, 350, fireGainNode, 'sawtooth');
    createAmbientTone(audioContext, 60, windGainNode, 'sine');
    createAmbientTone(audioContext, 90, windGainNode, 'triangle');
  } catch (e) {
    console.warn('Audio not available:', e);
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
  togglePause: () => void;
  setSettings: (settings: AudioSettings) => void;
  setMoveInput: (input: { x: number; z: number }) => void;
  setXrActive: (active: boolean) => void;
  restart: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  isPaused: false,
  audioStarted: false,
  settings: defaultSettings,
  restartToken: 0,
  resetPosition: { x: 0, z: -8 },
  moveInput: { x: 0, z: 0 },
  xrActive: false,
  togglePause: () => {
    const { audioStarted, settings, isPaused } = get();
    if (!audioStarted) {
      initAudio(settings);
      set({ audioStarted: true });
    }
    set({ isPaused: !isPaused });
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

  // Write slider values to the audio GainNodes
  useEffect(() => {
    if (masterGainNode) masterGainNode.gain.value = settings.master;
    if (ambientGainNode) ambientGainNode.gain.value = settings.ambient;
    if (fireGainNode) fireGainNode.gain.value = settings.fire;
    if (windGainNode) windGainNode.gain.value = settings.wind;
  }, [settings]);

  if (!isPaused) {
    return (
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 500,
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '15px 25px',
          borderRadius: '10px',
          color: '#FFD700',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          cursor: 'pointer',
          border: '1px solid #D4AF37',
        }} onClick={togglePause}>
          ⏸ Pause (ESC)
        </div>
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
  const { camera } = useThree();
  const togglePause = useGameStore((s) => s.togglePause);
  const restartToken = useGameStore((s) => s.restartToken);
  const resetPosition = useGameStore((s) => s.resetPosition);

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
