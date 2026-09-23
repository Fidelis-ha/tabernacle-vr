# SPEC: AAA-Update — Zielplattform Meta Quest 3 (eine Qualitätsstufe)

Ziel: Die App soll sich auf der Meta Quest 3 (72 Hz, WebXR im Browser) so gut wie möglich anfühlen —
Kino-Optik, aber innerhalb des harten Budgets. Keine Qualitätssstufen: EINE getunte Konfiguration,
die auf der Quest 3 stabil 72 Hz läuft und auf Desktop/Handy entsprechend besser aussieht.

## Quest-3-Budget-Regeln (Meta-Doku, verbindlich für alle Änderungen)
1. **Draw Calls sind der CPU-Killer**, nicht Polygone. Ziel: gesamt < 250 Draw Calls (vorher ~600+).
2. **Instancing überall**, wo sich Meshes wiederholen (Säulen, Bretter, Sockel, Ringe, Brote, Pflöcke, Zelte).
3. **Nur die Sonne wirft Schatten** (eine DirectionalLight, 1024er Shadowmap, PCFSoft). Kein Schattenwurf
   von Punktlichtern; `castShadow` nur auf großen Silhouetten (Wände, Dach, Altar, Lade).
4. **Postprocessing läuft NICHT in XR-Sessions** (EffectComposer nur außerhalb XR). In XR gilt:
   ACES-Tonemapping + Foveation statt Postprocessing.
5. Materialinstanzen cachen: jedes Material-Preset genau EINE Instanz (useMemo/Modul-Singleton), geteilt
   über alle Meshes. Kein `<meshStandardMaterial {...preset}>` pro Mesh mehr, sondern `material={sharedMat}`.
6. `gl.xr.setFoveation(1)` setzen (starkes Foveation, für Standstill-Experience ideal).
7. Canvas: `dpr={[1, 2]}`, `antialias` an außer in XR; `powerPreference: 'high-performance'`.
8. Geometrien wiederverwenden (gleiche Box-/Zylinder-Geometrie als Modulkonstante, nicht pro Mesh neu).

## Visuelle Bausteine (alle 4, quest-3-gerecht umgesetzt)

### a) Kino-Look
- `gl.toneMapping = ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.1` — überall.
- **Bloom (@react-three/postprocessing): NUR außerhalb XR** (EffectComposer mit Bloom + Vignette;
  luminanceThreshold ~0.75, intensity dezent). In XR: stattdessen emissive-Materialien stärker
  (Menora-Flammen, Altarfeuer, Shekinah-Glow-Sprite) — leuchtet auch ohne Bloom glaubwürdig.
- Soft Shadows: `shadowMap.type = PCFSoftShadowMap`, Sonne 1024, `shadow.camera` eng um Vorhof (±25 m).
- Vignette nur Desktop (Teil des Composers).

### b) Prozedurale Materialien (kein Download, Canvas-Texturen)
- `src/utils/textures.ts`: kleine Canvas-Texturen (256px, einmalig erzeugt):
  - Sand/Erde: Noise + Körnung (Farbvariation), repeat groß
  - Leinen/Byssus: feines Webmuster (helle Streifen), für Vorhänge + Tor
  - Ziegenhaar: grobe vertikale Struktur
  - Holz: Längsmaserung für Akazienbretter
- Anwendung: map + leichtes bumpMap auf Boden, Vorhängen, Balken. Materialkosten im Blick: keine
  normalMaps mit hoher Auflösung, repeat moderat. Alte flat colors ersetzen wo sinnvoll (NICHT bei
  Gold/Metallen — die bleiben PBR-plain mit envMap).
- Environment-Map: bleibt, aber als ERZEUGTE PMREM-Szene (kleiner Gradient-Raum) statt Netz-HDR —
  oder drei `<Environment preset>` mit `download: false`-Alternative. Falls Netz-HDR: nur Desktop,
  in XR einfachere Lichter (Ambient + Hemisphere). Kein Blocked-Load auf der Quest.

### c) Umgebung (eine Szene, eine Stimmung)
- **Himmel:** drei `<Sky>` (Preetham) mit Wüsten-Stimmung (turbidity hoch, sonniger Nachmittag, Sonne
  tief-südlich passend zur Lichtrichtung) ODER cheap Gradient-Shader-Sky — Sky-Komponente ist billig,
  nehmen. Alte einfarbige Sphäre ersetzen.
- **Wolken:** 6-10 billige Sprite-/Billboard-Wolken (Canvas-Textur, weich) hoch am Himmel, langsam
  driftend (useFrame, wenige Objekte). KEIN drei-Clouds (Volumen = teuer).
- **Dünen:** eine Low-Poly-Plane (64x64 Segmente reicht) mit Vertex-Noise-Verformung außerhalb des
  Vorhofs, Radius ~80-150 m, Sandtextur, receiveShadow aus. 1 Draw Call.
- **Heat-Haze: bewusst weggelassen** (Screen-Space-Distortion zu teuer für XR-Budget) — im SPEC-Dokument
  als Entscheidung vermerkt.
- **Staub im Wind:** drei `<Sparkles>`-Felder (2-3 Instanzen, dezent) in Vorhof + Umgebung, langsame
  Drift. GPU-cheap.
- **Wolkensäule/Feuersäule über der Stiftshütte?** NEIN — nicht dauerhaft biblisch (Ex 40,34-38: Wolkensäule
  war Zeichen, nicht Dauerzustand). Shekinah-Glow im Allerheiligsten genügt.

### d) Licht-Inszenierung
- **God Rays über der Lade:** Fake-Volumetrik — 1-2 additive Kegel/Planes mit Gradient-Shader (von oben
  durch den Vorhang-Spalt auf die Lade, sehr dezent, warmes Gold). 2 Draw Calls, XR-tauglich.
- Flackernde Punktlichter beibehalten (Menora, Altarfeuer), KEINE Schatten.
- Shekinah: additives Glow-Sprite (Canvas-Radialgradient) über der Lade + bestehende Punktlichter.

## Inhalte — Leben ohne Ablenkung (dezenter Zusatz, als eigene Komponente entfernbar)
- **Camp Israel** (eigene `src/components/CampIsrael.tsx`, Export + Einbindung, Kommentar: „deutbare Zutat
  nach 4. Mose 2, nicht Teil der Exodus-Spezifikation"):
  - 40-60 einfache Low-Poly-Zelte (Kegel/Prismen, 2-3 Formen, InstancedMesh, Stofffarben gedeckt:
    sand/braun/graubeige, ein paar mit gestreiftem Muster), im Ring um den Vorhof (Abstand 25-40 m,
    Vorhofskeil Ost bleibt frei als Platz des Volkes)
  - 4-6 Rauchsäulen (aufsteigende, transparente, animierte Sprites) bei Zeltgruppen — „kochende Feuer"
  - ein paar einfache Menschengestalten? NEIN — zu viel Ablenkung und Uncanny-Risiko. Nur Zelte + Rauch.
  - Keine castShadow, eigene kleine Ambience-Gruppe, < 15 Draw Calls durch Instancing.
- **Tiere:** keine. (Ablenkungsgefahr + Animationen teuer.)
-Loading-Flow/Hinweise: keine Änderung außer nötigenfalls Text.

## Audio-Aufwertung (GameUI.tsx)
- **Räumliches Audio (WebAudio PannerNode):** Altarfeuer-Loop an Position (0, 1.4, 27), Menora-Flackern
  (0, 1, 36) leise, Wind-Loop global mit langsamer Richtungsmodulation. Listener folgt Kamera/Origin
  (Update in useFrame, sparsam ~10 Hz).
- **Musikschicht:** prozedurale, sehr dezente Ambient-Pad-Schicht beim Start (2-3 detunierte Sinus-
  Oszillateure + Lowpass + sehr langsame LFO-Modulation, Dauerton -24 dB unter Ambient) — kein Track,
  kein Download, ruhig und sakral. Über Audio-Einstellungen abschaltbar (neuer Slider „Musik").
- Feuer-Sound verbessern: Rausch-Buffer (Noise) + Bandpass mit LFO statt reiner Oszillator-Klang.
- Slider-Regler bleiben funktional (GainNodes-Set aus v1 beibehalten).

## Akzeptanzkriterien
- `npm run build` fehlerfrei
- Draw-Call-Sanierung umgesetzt: Materialien geteilt, wiederholte Meshes instanziert (Säulen, Bretter,
  Sockel, Pflöcke, Zelte)
- Bloom/Vignette nur außerhalb XR; in XR Foveation + ACES aktiv
- Sky + Wolken + Dünen + Staub + Camp sichtbar; alles ohne castShadow außer Sonne
- God-Rays-Fake + Shekinah-Sprite über der Lade
- Räumliches Audio + Musikschicht + neuer Musik-Slider
- Biblische Maße aus SPEC-originalgetreue.md unverändert
- Kein Netzwerk-Asset-Load zur Laufzeit (alles prozedural)
