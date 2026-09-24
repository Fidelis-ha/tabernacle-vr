# SPEC: Lade-Verfeinerung, realer Boden, originalgetreue Zelte, Tiere, Horizont, Mobile-Tier

## A. Bundeslade filigran + originalgetreuer (HolyOfHolies.tsx)
Grundlage: Ex 25,10-22. Maße UNVERÄNDERT (2,5×1,5×1,5 Ellen, 4 Ringe unten an den Ecken,
eingesteckte Stangen). Nur Detailqualität:
- Korpus: 2 unterschiedlich hohe Gold-Bretter-Lagen (untere etwas dunkler patiniert —
  Holz überzogen) mit sichtbarer horizontaler Fugennaht (dünne dunkle Linie als Geometrie-
  Streifen, nicht Textur)
- Goldkranz (Krone) als gedrechselte Welle: Torus + 2 schmale Ringe leicht versetzt (gestuft)
- Ringe: echte rundgebogene Ösen (Torus arc π*1.5), innen dunkle Fassung (kleiner dunkler
  Zylinder als Durchbruchs-Andeutung), Stangen liegen sichtbar IN den Ösen
- Kapporet (Deckel): leicht überstehend (je 0,05 m), abschließender Rand (flacher Torus)
- Cherubim: aus EINEM Stück mit der Kapporet geschlagen (Ex 25,19) — Füße am Deckel
  angedeutet (2 kleine Goldkugeln als Standflächen), Körper leicht nach vorn geneigt,
  Flügel 2-segmentig (vorhanden), Flügel berühren einander in der Mitte (Ex 25,20 —
  prüfen/korrigieren auf tatsächliche Berührung), Können nach unten geneigt blicken
  (Kopf leicht vorgebeugt)
- Innerschatten: Lade-Innenraum bei geöffneter Sicht nicht nötig (geschlossen)
- Material: GOLD mit goldRoughTexture + bumpMap (Hammerung), dunklere Akzent-Fugen

## B. Sandboden realistischer (textures.ts makeEarth/makeSand + Floor-Komponenten)
- Unebenheit: Vorhofs-Plane + Wüsten-Plane bekommen Vertex-Displacement (leichte Dellen
  und Hügel, Amplitude 3-6 cm im Vorhof, 15-30 cm außerhalb, noise-basiert, seeded random —
  DAS Vorhofsgeometrie 32x32 Segmente, Wüste behält ihre 64x64)
- Steine: 40-70 kleine Steine (InstancedMesh, 3-4 Stein-Geometrien: Dodecahedron/
  abgeflachte Sphäre, skaliert/flach gedrückt), halb im Boden versenkt, Sand-Farben
  (0xC9B18C bis 0x8A7355), außerhalb der Gebäude-Fundamente + Geräte-Standflächen
  (Kollisions-AABBs als Sperrzonen-Liste nutzen), kein castShadow
- Textur: makeSand/makeEarth verfeinern — Körnung 2-stufig (fein + grobe Kiesel-Punkte),
  Fußspuren/Wellen-Pattern (leichte Dünen-Rippel: horizontale Sinus-Bänder), Farbtiefe
  (3 Sand-Töne statt 1), repeat hoch (18-24)
- Sperrzonen: kein Stein UNTER Altar/Becken/Zelt/Säulen-Reihen (Abfrage der x/z-Position
  beim Platzieren gegen die bekannten Rechtecke)

## C. Zelte originalgetreuer (CampIsrael.tsx)
Biblisch-historisch (Wüstenzelt der Bronzezeit, keine Pyramiden):
- Form: flaches, langgezogenes Zeltdach (Prisma bleibt Hauptform) mit seitlichem
  Herabhängen (Überhang-Plane bis ~0,3 m über Boden an den Langseiten, leicht schräg)
- Aufbau: 2-3 zentrale Stützstangen (dünne dunkle Zylinder, ragen oben leicht raus)
- Abspannung: 3-5 Seile je Zelt (dünne Zylinder von Dachkante schräg zum Boden),
  mit kleinen Zeltpflock-Kegeln am Ende
- Eingang: dunkle Öffnung-Andeutung an einer Giebelseite (dunkles flaches Plane-Element
  vor der Front, halb-transparent dunkel)
- Stoff: Ziegenhaar-Textur (goatHairTexture wiederverwenden!) mit Fleck-Kontrollen:
  3 Farbvarianten (0x9A7A58-Basis, 2x abgedunkelt/aufgehellt als 2 weitere Material-
  Instanzen — Material-Budget: 3 neue Instanzen erlaubt), grobe Naht-Streifen
  (dunkle vertikale Linien in der Textur-Übersetzung via Textur-Offset)
- Steher: keine Pyramiden-Silhouette mehr — Prismen-Flachdach dominant, Kegel-Form nur
  noch für 20% kleine Herdenzelte mit flacher Proportion (r=1.8, h=1.1)

## D. Tiere (NEU: src/components/Animals.tsx, dezent + biblisch passend)
- Herden: 12-18 Schafe/Ziegen (weiß-beige, einige dunkelbraun), 3-5 Esel (grau-braun)
- Positionen: außerhalb des Vorhofs, im Camp-Bereich zwischen Zeltgruppen (nutze
  Camp-Israel-Positionen als Anker + Versatz), Ostantrieb frei lassen (Platz des Volkes)
- Geometrie: Low-Poly aber FORM-Treu (nicht Quader mit Beinen):
  - Schaf/Ziege: Körper (abgeflachte Kapsel = skalierte Sphäre), Kopf (kleine Kugel +
    Schnauzen-Kegel leicht abwärts), 4 Beine (dünne Zylinder), Ohren (2 kleine flache
    Kegel seitlich), Schwanz-Stummel; Ziege: kleiner Bart-Kegel, Hörner (2 gebogene
    kleine Tori/Segmente), Körper schlanker
  - Esel: größer, langohrig (2 lange aufrechte Kegel), Mähnen-Streifen (dunkle dünne
    Box auf dem Hals-Rücken), Schwanz mit Büschel
- Animation: MINIMAL — 2-3 Tiere bewegen Kopf (sanftes Nicken, useFrame, Phasen versetzt),
  1-2 Esel schlagen mit dem Schwanz (Rotation), KEINE Lauf-Animation (Budget + Ruhe)
- Alles InstancedMesh wo möglich (Schaf-Körper 1x, Kopf 1x, Beine 1x-Instanz je Tier via
  InstancedMesh je Teil), Materialien: 3 neue (Schafwolle hell, Ziege dunkelbraun,
  Esel grau) + bestehende Ressourcen
- 0 castShadow (Budget), Draw-Calls Ziel: < 15 für alle Tiere
- Kommentar im Code: "Herde des Volks (deutbare Zutat, Ex 12,38: 'auch Kleinvieh zog mit')"

## E. Horizont-Umgebung (Scene.tsx + neue Komponente HorizonFar.tsx)
- Ferne Hügelkette: 8-12 sehr große, flache Halbkugel-/Kegel-Segmente (r 60-120, h 8-20)
  am Rand 300-420 m, Wüsten-Haze-Farbe (0xC9B79A, fog-blendend — nehmen die Fog-Farbe an),
  1-2 InstancedMeshes, kein Schatten
- Ferne Dörfer/Weiler: 5-7 dunkle Punkte-Cluster (je 3-5 winzige Quader 2-4 m + 1 Turm-
  Stummel) auf Hügeln bei 250-350 m, Farbe 0x6B5A48 (Silhouette-Effekt durch Fog)
- Palmen-Gruppe: 1 Oase-Andeutung (5-8 Palmen: dünner gebogener Stamm = gekippter
  Zylinder + Blätter-Kranz aus 6-8 flachen gebogenen Planes), bei 200 m seitlich,
  silhouettiert (Fog macht Rest)
- Vögel: 3-5 Geier/Bussarde hoch am Himmel (2 flache Dreiecks-Flügel + Körper-Kapsel),
  kreisende Animation (useFrame, langsame Kreisbahn, Phasen versetzt) — dezent, klein
- Feuer/Rauch-Camps des Lager-Volks sind bereits da (Rauchsäulen CampIsrael) — konsistent
  lassen
- Draw-Call-Budget: Horizon < 10

## F. Qualitäts-Absenkung Mittelklasse-Smartphone (App.tsx + neuer utils/quality.ts)
- utils/quality.ts: detectQuality() — Heuristik:
  navigator.userAgent mobile + (deviceMemory <= 4 || hardwareConcurrency <= 6 ||
  GPU-String via WEBGL_debug_renderer_info matcht /Adreno 5|Adreno 6[0-2]|Mali-G[5-7]|
  PowerVR|Apple A1[0-2]/) => 'low'; sonst 'high'. Speicherbar via localStorage override.
- Store-Slot quality: 'low' | 'high' (zustand, init einmalig)
- Bei 'low':
  - Canvas dpr [0.75, 1.25] (statt [1,2]), antialias aus
  - Bloom/Vignette AUS (auch außerhalb XR)
  - Schatten: Sonne 512er Shadowmap statt 1024, shadow camera gleich
  - Sparkles-Felder: nur Vorhof-Feld, opacity halbiert
  - Wolken: 4 statt 8, Opacity leicht reduziert
  - Steine: 20 statt 40-70; Tiere: 6 statt 12-18; Vögel: 2 statt 5
  - Rauchsäulen: 3 statt 5
  - Vertex-Displacement bleibt (keine Kosten zur Laufzeit)
  - Foveation (XR) bleibt 1
- Implementierung: ein QUALITY-Konstanten-Objekt (utils/quality.ts exportiert
  QUALITY_SETTINGS mit je Tier), Komponenten lesen den Wert — KEINE Duplikat-Logik
- Hinweiszeile: bei 'low' zeigt die UI einen dezenteren Zusatz "⚡ Leicht-Modus" (klein,
  oben rechts neben Pause)

## G. Unverändert
- Biblische Maße + Geräte-Positionen (SPEC-originalgetreue.md)
- Material-Singleton/Instancing-Struktur, Draw-Call-Gesamtbudget: mit D+E+F-Zugängen
  sollte die Summe weiter < 250 liegen (low-Tier deutlich darunter)
- Audio, Steuerung, Wand-Fixes (A1-A3 der letzten SPEC), ?debugcam=1-Hook

## H. Akzeptanz
- npm run build fehlerfrei
- debugcam-Screenshots: Lade-Detail (Fugen, Krone, berührende Flügel, Ösen),
  Steine im Sand + Unebenheit sichtbar, Zelte mit Seilen/Stangen/Überhang,
  Tiere mit Form-Treue, Horizont mit Hügeln/Dörfern/Palmen/Vögeln,
  ?quality=low erzwingt Light-Modus (testbar via URL-Param override im detectQuality)
- Marc kann beide Stufen prüfen: URL ?quality=low erzwingt, ?quality=high erzwingt
