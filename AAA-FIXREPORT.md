# AAA-FIXREPORT

Grundlage: `.reviews/review_aaa_funktion.txt` + `.reviews/review_aaa_design.txt`.
Alle 19 Befunde in `src/` bearbeitet. Biblische Masse (CUBIT=0,45 etc.) unveraendert.
`npm run build` (tsc + vite): **fehlerfrei**. Kein Commit.

| # | Befund | Status | Umsetzung |
|---|--------|--------|-----------|
| 1 | Zelte versinken im Boden | **erledigt** | `CampIsrael.tsx`: `toTransforms(list, halfHeight)` — `position.y = halbeHoehe * scale` (Kegel/gestreift 1,1 · Prisma 0,95) |
| 2 | Sonne im Norden / zu hoch | **erledigt** | EINE exportierte Konstante `SUN_DIRECTION = [-30, 14, 24]` (Sued-West, ~20 Grad Elevation) in `TabernacleLighting.tsx`; genutzt von Sky, DirectionalLight (`COURTYARD_CENTER + SUN_DIRECTION`) und Env-Sonnenkugel in `Scene.tsx` |
| 3 | Camp unsichtbar | **erledigt** | `CampIsrael.tsx`: Ostkeil enger (`dir.z < -0.7` statt -0.45), Scale-Range `1.2 + rand()*0.6` (1,2–1,8) |
| 4 | Flammen statisch, 7x Material | **erledigt** | EIN geteiltes `FLAME`-MeshStandardMaterial in `materials.ts` (Menora + Altarfeuer); `useFrame`-Animation in `HolyPlace.tsx` (7 Flaemmchen) und `TabernacleCourtyard.tsx` (3 Altarkegel): y-Scale ±15 %, Phasen versetzt, langsame Rotation — keine Allokation pro Frame |
| 5 | Shekinah-Glow zu gross/statisch, Licht zu gelb | **erledigt** | `TabernacleLighting.tsx`: Glow-Sprite scale 1,9 m / opacity 0,55; Hauptlicht 0xFFF4DC / intensity 2,2; zweites Licht verkleinert (0,7, distance 5) |
| 6 | Wolken im Fog, identisch | **erledigt** | `Scene.tsx`: `fog={false}` am Cloud-spriteMaterial, pro Sprite `rotation` variiert, x-Scale bei ungeraden Indizes gespiegelt, opacity 0,4–0,55 |
| 7 | God-Rays zu kurz | **erledigt** | Beide Planes spannen von Decke y ≈ 4,4 bis Kapporet y ≈ 1,0 (Plane 1: Länge 4,0 / rot −0,55; Plane 2: Länge 4,45 / rot −0,7, Oberende bleibt hinter dem Vorhang z > 40,5) |
| 8 | Vector3-Allokation pro Frame | **erledigt** | `App.tsx`: Modul-Konstanten `_dir/_right/_up` + `set()/crossVectors()` in der Browser-Bewegung — nichts wird mehr pro Frame erzeugt |
| 9 | Audio erst im Pausenmenue | **erledigt** | `GameUI.tsx`: neue `ensureAudioStarted()`; aufgerufen beim ersten Canvas-`pointerdown` (`GameStateManager`) und beim VR-Button-Click (`App.tsx`), togglePause nutzt denselben Pfad |
| 10 | Listener nutzt lokale camera.position | **erledigt** | `updateAudioListener` verwendet `camera.getWorldPosition(_listenerPos)` + `camera.getWorldDirection(_forward)` — korrekt in und ausserhalb XR |
| 11 | preserveDrawingBuffer | **erledigt** | Aus `App.tsx` Canvas-`gl`-Options entfernt |
| 12 | Slider-Zipper-Noise | **erledigt** | `GameUI.tsx`: alle 5 GainNodes via `setTargetAtTime(v, ctx.currentTime, 0.05)` |
| 13 | Identische Inline-Geometrien | **erledigt** | Modul-Konstanten: `HolyPlace.tsx` (Tischkranz-Torus, 4 Beine, Eckenringe, Raeuchar-Hoerner/Ringe, Flammchen-Kegel), `HolyOfHolies.tsx` (Lade-Ringe), `TabernacleCourtyard.tsx` (Altar-Hoerner/Ringe, Rostbalken) |
| 14 | castShadow auf 60 Sockeln | **erledigt** | `TabernacleCourtyard.tsx`: `castShadow` vom sockets-InstancedMesh entfernt (Bretter/Waende/Altar bleiben) |
| 15 | Tor flach, kein Gold | **erledigt** | `textures.ts` `makeGate()`: Goldfaden-Wirkerei (vertikale + horizontale Goldlinien); `TabernacleCourtyard.tsx`: Tor-Plane mit 8 Segmenten, Sinus-z ±0,03 (Modul-Geometrie `gateGeo`) |
| 16 | Vorhangwaende zu stiff | **erledigt** | 20 Segmente je Wand, Sinus-Sag ~2,5 cm pro Feld (`makeSaggingWall()`; Sued/Nord teilen eine Geometrie, West + Ost je eigene) |
| 17 | Stauch auch im Allerheiligsten | **erledigt** | `Scene.tsx`: Vorhof-Feld auf Vorhof beschraenkt (z 0–30), Zelt-Feld nur noch im Heiligen (z 31,7–40,3) mit opacity 0,1 / size 1, Allerheiligstes staubfrei |
| 18 | Fog-Farbe | **erledigt** | `Scene.tsx`: fog 0xCFC2A6 |
| 19 | Composer-MSAA auf Quest-Browser | **erledigt** | `EffectComposer multisampling={0}` (mipmapBlur kompensiert) |

## Anmerkungen / Abweichungen

- **#2:** Die Sky-Sonne wird als Richtung interpretiert; DirectionalLight und Env-Kugel stehen wie bisher `COURTYARD_CENTER + Richtung` bzw. auf der Richtung selbst — nur Werte geaendert.
- **#4:** Die drei Altarfeuer-Kegel behalten ihre drei unterschiedlichen Groessen (keine identischen Geometrien), teilen sich aber jetzt EIN Flammen-Material; der Farbverlauf der Flammen entfaellt dadurch (Preis der Budget-Regel).
- **#7:** Plane 2 erhaelt flachere Neigung (−0,95 → −0,7), damit sie bei geforderter Laenge nicht durch den Parochet (z = 40,5) ragt.
- **#12:** Die `setTargetAtTime`-Writes sind an `audioContext` gekoppelt, damit vor der Audio-Initialisierung keine Nodes beschrieben werden.

## Verifikation

- `npm run build` (tsc && vite build): OK, 981 Module, keine TS-Fehler.
- Chunks > 1500 kB sind Vite-Warnungen zum Code-Splitting (Bestand, nicht Teil dieses Fixes).
