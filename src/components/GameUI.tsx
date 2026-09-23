import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Audio context for ambient sounds
let audioContext: AudioContext | null = null;
let ambientGainNode: GainNode | null = null;
let fireGainNode: GainNode | null = null;
let windGainNode: GainNode | null = null;

interface AudioSettings {
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
    const masterGain = audioContext.createGain();
    masterGain.gain.value = settings.master;
    masterGain.connect(audioContext.destination);
    
    ambientGainNode = audioContext.createGain();
    ambientGainNode.gain.value = settings.ambient;
    ambientGainNode.connect(masterGain);
    
    fireGainNode = audioContext.createGain();
    fireGainNode.gain.value = settings.fire;
    fireGainNode.connect(masterGain);
    
    windGainNode = audioContext.createGain();
    windGainNode.gain.value = settings.wind;
    windGainNode.connect(masterGain);
    
    createAmbientTone(audioContext, 80, ambientGainNode, 'sawtooth');
    createAmbientTone(audioContext, 120, ambientGainNode, 'sine');
    createAmbientTone(audioContext, 200, fireGainNode, 'square');
    createAmbientTone(audioContext, 350, fireGainNode, 'sawtooth');
    createAmbientTone(audioContext, 60, windGainNode, 'sine');
    createAmbientTone(audioContext, 90, windGainNode, 'triangle');
    
    console.log('Audio initialized');
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

interface GameUIProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onSettingsChange: (settings: AudioSettings) => void;
  settings: AudioSettings;
}

export function GameUI({ isPaused, onTogglePause, onRestart, onSettingsChange, settings }: GameUIProps) {
  if (!isPaused) {
    return (
      <Html center position={[0, 3, 0]}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '15px 25px',
          borderRadius: '10px',
          color: '#FFD700',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          cursor: 'pointer',
          border: '1px solid #D4AF37',
        }} onClick={onTogglePause}>
          ⏸ Pause (ESC)
        </div>
      </Html>
    );
  }
  
  return (
    <Html center position={[0, 2, 0]}>
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
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#FFD700',
          fontSize: '24px',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
        }}>
          ⛪ Stiftshütte
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
              onChange={(e) => onSettingsChange({ ...settings, master: Number(e.target.value) / 100 })}
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
              onChange={(e) => onSettingsChange({ ...settings, ambient: Number(e.target.value) / 100 })}
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
              onChange={(e) => onSettingsChange({ ...settings, fire: Number(e.target.value) / 100 })}
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
              onChange={(e) => onSettingsChange({ ...settings, wind: Number(e.target.value) / 100 })}
              style={{ width: '100%', marginLeft: '10px' }}
            />
          </label>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button 
            onClick={onTogglePause}
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
            onClick={onRestart}
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
    </Html>
  );
}

// Game state manager - inside Canvas so useThree works
export function GameStateManager() {
  const { camera } = useThree();
  const [isPaused, setIsPaused] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);
  
  const handleTogglePause = useCallback(() => {
    if (!audioStarted) {
      initAudio(settings);
      setAudioStarted(true);
    }
    setIsPaused(!isPaused);
  }, [isPaused, audioStarted, settings]);
  
  const handleSettingsChange = useCallback((newSettings: AudioSettings) => {
    setSettings(newSettings);
    // Note: Audio would need to be reconnected with new values
    // For simplicity, audio init happens once
  }, []);
  
  const handleRestart = useCallback(() => {
    camera.position.set(0, 1.6, -5);
    camera.rotation.set(0, 0, 0);
    setIsPaused(false);
  }, [camera]);
  
  // ESC key for pause - useEffect inside component that has access to hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause]);
  
  return (
    <GameUI 
      isPaused={isPaused}
      onTogglePause={handleTogglePause}
      onRestart={handleRestart}
      onSettingsChange={handleSettingsChange}
      settings={settings}
    />
  );
}