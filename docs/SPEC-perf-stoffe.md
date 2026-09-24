# SPEC: Performance-Fix (Shiftphone 8) + CC0-Stoffe + Vorhänge + Zeltdecken

## Kontext
- Shiftphone 8 (QCM6490, **Adreno 643**, 12 GB, 8 Kerne): viele schwarze Frames bei Bewegung.
- Ursache: `WEAK_GPU`-Regex in `src/utils/quality.ts:63` matcht Adreno 643 NICHT
  (`Adreno 6[0-2]` = nur 60/61/62) → Gerät läuft im HIGH-Tier (dpr [1,2] + PostFX +
  Shadow 1024) → GPU-Überlast + Ruckler beim Bewegungs-Regress.
- Research (Entwickler-Anleitungen): pmndrs "Scaling Performance" (r3f.docs.pmnd.rs):
  1) **PerformanceMonitor** (drei) mit dynamischem dpr (onIncline/onDecline),
  2) **Movement-Regression** (Sketchfab-Pattern: bei Bewegung Qualität senken, im Stillstand erhöhen),
  3) Draw-Calls instanziert (erledigt), 4) LOD. Krapton 2026: Texturen 512px für Mobile,
  Draco/LOD für glTF (n/a — wir bauen prozedural).

## A — Performance-Fixes (höchste Priorität)
A1. `quality.ts` WEAK_GPU erweitern:
    `/Adreno [5-6]|Mali-G[5-7]|Mali-[GT]7|PowerVR|Apple A1[0-2]|Xclipse|Immortalis/i`
    (Adreno 643 → weak; konservativ: ALLE mobilen Adreno 6xx sind weak für dpr 2 + Bloom.)
A2. **Dynamisches dpr via PerformanceMonitor** in `App.tsx`:
    `const [dpr, setDpr] = useState(...)` initial aus `QUALITY_SETTINGS[quality].dpr`;
    `<PerformanceMonitor bounds={(r)=>(r>90?[45,85]:[28,55])} flipflops={3}
      onDecline={()=>setDpr(d=>Math.max(minDpr, d-0.25))}
      onIncline={()=>setDpr(d=>Math.min(maxDpr, d+0.25))}
      onFallback={()=>setDpr(minDpr)} />` innerhalb Canvas; `<Canvas dpr={dpr}>`.
    minDpr = quality.dpr[0], maxDpr = quality.dpr[1].
A3. **Movement-Regression**: `GameUI`/Joystick/`LocomotionController` bewegen die Kamera.
    Einfachster sauberer Weg: kleiner Hook `MovementRegress` in App.tsx/Scene:
    `useFrame` liest Kameraposition; wenn |Δpos| > 0.01 → drei `performance.regress()`
    (`const performance = useThree(s=>s.performance)` + store regression aktiv halten:
    `performance.regress()` pro Bewegungs-Frame). R3F multipliziert dpr automatisch mit
    performance.current, WENN das dpr-Prop nicht fix gesetzt ist → mit A2 kombinieren:
    dpr-State als Basis, regress drosselt zusätzlich (Standard-Verhalten von drei).
A4. **Shader-Precompile gegen Ruckler beim Bewegungs-Regress**: nach Load einmal
    `gl.compile(scene, camera)` + `gl.compile(scene, xrCam?)` — pragmatisch: in `onCreated`
    via requestAnimationFrame nach erstem Frame `gl.compile` auf die Szene (Kairos prüft
    API-Verfügbarkeit; `renderer.compileAsync` in r160+). Ziel: keine Hitches wenn neue
    Objekte sichtbar werden.
A5. Test-Override dokumentieren: `?quality=low` erzwingt Low auch auf Adreno 643.

## B — CC0-Stoff-Texturen einbauen (ambientCG, CC0, bereits in public/textures/)
- `public/textures/fabric-weave/{color,normal,rough}.jpg` (512px, feines Gewebe) → Byssus-Vorhänge, Tor, Parochet-GRUNDSTOFF
- `public/textures/fabric-burlap/{color,normal,rough,ao}.jpg` (512px, grober Leinen-Look) → Zelte (ersetzt makeGoatHair), Herdenzelte
- Laden via drei `useTexture('/textures/fabric-burlap/color.jpg')` o. TextureLoader,
  `wrapS=wrapT=RepeatWrapping`, repeat ~ (4,4) Zelte, (3,2) Vorhänge; colorSpace SRGB für color.
- **Tinting**: color-Map ist hellgrau → Material-`color` multipliziert (Zeltfarben
  (Zeltfarben 0xB99A76/0x93794F/0xCFAE82 bleiben!). Normal-Map nur im HIGH-Tier
  (low-Tier: normalMap=null — spart Mobile Bandbreite/GPU). AO (burlap) als aoMap mit uv2-Set falls trivial, sonst weglassen.
- `makeGoatHair` durch die echte Textur ersetzen; Canvas-Version als Fallback behalten
  (falls Fetch failed → onError → Canvas-Textur). Material-Singletons NICHT brechen.

## C — Vorhänge originalgetreuer (Ex 26,31; 26,36; 27,16; 28,6)
Biblisch: Feines Geleininen (Byssus) mit Blau, Violett(Purpurrot), Scharlach + Cherubim-Wirkerei.
C1. Palette entschärfen (aktuell vermutlich zu grell/kunterbunt): 
    Blau = 0x2E4A78 (gedecktes Antikblau), Violett = 0x6B2D5B, Scharlach = 0x8E2B25,
    Byssus = 0xE8DFC8 (naturweiß, NICHT reinweiß). Als Konstanten in materials.ts.
C2. Tor + Parochet + Eingangsschirm: Streifen NUR vertikal-bündig mit Gewebe-Textur
    (fabric-weave als map, Farbverlauf in der Canvas-Textur weicher — keine harten
    Kantengrenzen; Cherubim-Motive in Gold/Goldbraun dezent über beide Farben.
C3. Die 10 Byssus-Zeltvorhänge (HolyPlace:293): Wie C2, aber Byssus dominiert,
    Farb-Akzente nur als schmale Borden an den Rändern (bibl. "Ränder von Blau").

## D — Zeltdecken stofflich (CampIsrael, roofGeo/skirtGeo)
D1. `makeTentRoofGeo()`: Segmentierung erhöhen (mind. 8×6), dann STATISCHE Deformation
    im Code: Sackung zwischen den Stützstangen (sin über x), leichte Ecken-Knicke,
    Windwellen-Bake (zufällige Phase pro Instanz NICHT möglich bei Instancing —
    statt dessen: 3 fertige Varianten der Geometrie, abwechselnd verwendet). Normalen neu berechnen.
D2. LEICHTE Wind-Animation: onBeforeCompile auf tentMat A/B/C: vertex-displacement
    `pos.y += sin(worldPos.x*0.8 + time*1.2) * 0.04 * (uv.y)` (oben mehr als Saum).
    Über `uTime`-Uniform in useFrame aktualisiert. low-Tier: ohne Animation.
D3. Saum (skirt) bekommt gleiche Behandlung (leicht wellig, nicht geradlinig).

## E — Verifikation (Kairos)
- Build ✓, `?quality=low`-Screenshots (Vorhang-Zoom, Zelt-Detail, Overlay mit dpr).
- Screenshots unter .reviews/shots/ (200er-Serie), Einträge in BEOBACHTUNGEN.md.

## Unveränderlich
- Biblische Maße (docs/SPEC-originalgetreue.md), Geräte-Positionen, Layout-Konstanten.
- Draw-Call-Budget < 250; Material-Singletons; keine /tmp-Nutzung; .reviews/ nicht anfassen.
