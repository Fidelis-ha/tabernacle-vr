# Tabernacle VR

Eine immersive WebXR-Anwendung, die die bibliche Stiftshütte (Exodus) in 3D nachbaut —
gebaut mit React Three Fiber, three.js und Vite.

## Features

- **Stiftshütte in 3D**: Vorhof, Heiliges und Allerheiligstes als begehbare Szenen
- **WebXR-Unterstützung**: VR-Modus mit Teleport-Locomotion (Controller + Hände)
- **Atmosphäre**: dynamische Beleuchtung, GLSL-Shader (Rauch/Weihrauch), Postprocessing
- **Game-UI**: Zustand-basiertes Spielzustands-Management (Zustand-Store)
- **Ladebildschirm** mit Fortschrittsanzeige

## Entwicklung

Voraussetzungen: Node.js 20+, npm.

```bash
npm install
npm run dev        # Dev-Server auf Port 3000
```

> Hinweis: `vite.config.ts` referenziert `key.pem`/`cert.pem` (self-signed, HTTPS für
> WebXR auf dem Gerät). Werden sie nicht gefunden, HTTPS in der Dev-Config deaktivieren
> oder eigene Zertifikate erzeugen (`openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365`).

## Build

```bash
npm run build      # Typecheck + Produktionbuild nach dist/
npm run preview    # Build lokal ausliefern
```

## Deployment (Vercel)

Das Projekt ist als Vite-Projekt konfiguriert und lässt sich direkt auf Vercel deployen:

```bash
npm i -g vercel
vercel             # Preview-Deployment
vercel --prod      # Production (nur nach Freigabe)
```

## Struktur

```
src/
  App.tsx                    # Einstieg: Canvas, XR-Store, Loading-Flow
  main.tsx                   # React-Mount + globales Error-Handling
  components/
    Scene.tsx                # Szenen-Setup (Kamera, Steuerung)
    TabernacleCourtyard.tsx  # Vorhof mit Brandopferaltar & Waschbecken
    HolyPlace.tsx            # Heiliges: Leuchter, Schaubrote, Räucheraltar
    HolyOfHolies.tsx         # Allerheiligstes: Bundeslade mit Cherubim
    TabernacleFloor.tsx      # Boden
    TabernacleLighting.tsx   # Lichtstimmung
    TabernacleAtmosphere.tsx # Weihrauch/Rauch-Partikel (Shader)
    GameUI.tsx               # HUD + Spielzustand (Zustand)
    LoadingOverlay.tsx       # Ladebildschirm
  utils/materials.ts         # Materialbibliothek (Gold, Holz, Leinen …)
```
