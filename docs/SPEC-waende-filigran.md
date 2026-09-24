# SPEC: Wand-Positions-Fix + Filigrane Gegenstände + echte Texturen

## A. Wand-Positions-Fehler (priorität 1 — biblisch falsch)

### A1. Vorhofs-Wand steht INNEN statt an der Säulenlinie
Befund (Screenshot 104): Die weiße Byssus-Vorhangwand der Vorhofs-Umzäunung ist nach innen
versetzt — sie beginnt erst neben der Säulenreihe und steht auf dem Vorhof.
BIBLISCH (Ex 27,9-15): Die Vorhänge (Byssus, 100 Ellen lang × 5 Ellen hoch) hängen DIREKT
an den 60 Säulen (Kupferfüße, silberne Haken, silberne Verbindungsstangen).
FIX (TabernacleCourtyard.tsx):
- Vorhangwände exakt auf die Säulenlinie legen (x = ±COURTYARD_HALF_WIDTH, z = 0 und 45
  bzw. entsprechend der Layout-Konstanten in TabernacleFloor.tsx).
- Vorhang-Oberkante an der Säulenhöhe, Aufhängung an den silbernen Haken (keine Abstandseile
  zur Wand — die Abspannseile nach außen zu den Erzpflocken bleiben).
- Der Versatz-Abstand (falls aktuell z.B. 1-2 m nach innen) = 0. Säulenreihe = Wandschiene.
- Prüfen: Ostseite — Tor (20 Ellen, bunt) ebenfalls exakt zwischen den 4 Torpfosten-Säulen.

### A2. Westwand aus Leinwand statt vergoldeter Bretter
Befund (Screenshot 102): An der Zelt-Westwand ist eine cremeweiße Stofffläche sichtbar,
auf der der Parochet hängt.
BIBLISCH (Ex 26,22-25; 36,27-30): Die Westwand = 6 vergoldete Akazienbretter + 2 Eckbretter
auf 16 Silbersockeln. Der Parochet (4-farbig mit Cherubimwirkerei, Ex 26,31-33) hängt an 4
goldenen Säulen VOR dieser Goldwand — er verdeckt sie teilweise, ersetzt sie aber NICHT.
FIX (HolyOfHolies.tsx / HolyPlace.tsx):
- Westwand: volle Goldbalkenwand (identische Konstruktion wie Nord/Süd, 6 Bretter + 2 Ecken,
  Silbersockel sichtbar).
- Parochet als eigenständige Ebene knapp davor (an den 4 goldenen Säulen mit Silbersockeln,
  Ex 26,32) — Parochet füllt die Zeltbreite, aber die Goldwand oben/unten/Seiten kann
  sichtbar bleiben (Parochet ist 14 Ellen breit × 4 Ellen hoch, Bretterwand 10 Ellen hoch).
- KEINE weiße/cremefarbene Leinwand-Ebene in Innenräumen — innen gibt es nur:
  Goldbretter + 4-farbige Cherubimdecke (unten sichtbar).

### A3. Bunter Behang/Byssus deckt außen sichtbar
Befund (Screenshot 103): Zwischen Goldwand und Dach schaut eine helle Schicht + bunter
Streifen nach AUßen heraus.
BIBLISCH (Ex 26,1-14): Die Cherubim-Decke (Schicht a, 4-farbig) liegt als INNENDECKE auf
den Brettern (von außen unsichtbar). Außen sichtbar sind nur: Ziegenhaar (Schicht b, über
beide Seiten weit reichend), rot gefärbte Widderfelle (Schicht c) und Tachasch-Felle (Schicht d)
als Dach + seitlicher Überhang.
FIX (HolyPlace.tsx RoofLayers + TabernacleCourtyard sofern beteiligt):
- Die Byssus/Curtain-Layer (Schicht a) vollständig INNEN rendern (BackSide oder innere
  Geometrie exakt unter den Brettern) — von außen unsichtbar.
- Außenansicht: nur Ziegenhaar-Grau (mit Sag/Textur), Widderfell-Rot als schmale Kante
  und dunkle Tachasch-Oberfläche. Bunter Streifen darf außen nirgends sichtbar sein.
- Dachüberhang: Schicht b ragt seitlich weit hinab (biblisch „verlängert" Ex 26,9) — das
  ist korrekt so, aber sie muss die Goldwand von AUßEN überdecken (Goldwand ist außen
  sichtbar NUR unterhalb des Überhangs — Ex 26,12 Deutung; bislangige Umsetzung: Goldwand
  außen sichtbar, das bleibt).

## B. Filigranere Gegenstände (priorität 2 —Marc: "filigraner")

Ziel: Die heiligen Geräte sollen edel/wertig wirken, nicht blockig. Mehr Details, mehr
Geometrie-Sorgfalt — Draw-Call-Budget beachten (Wiederverwendung!):

### B1. Menora (HolyPlace.tsx)
- Schaft: konisch leicht zulaufend, 3 Knäufe (Kugeln) mit je einer Blütenkalotte
  (kleiner Kegel) darüber und darunter
- Arme: geschwungen (TubeGeometry entlang CatmullRomCurve3 — bereits vorhanden, prüfen),
  je Arm: Knauf + Kelchblüten-Form (InvertedCone + kleine Schale) unter jeder Lampe
- 7 Lampen: kleine Schalenform (Zylinder + Konus), Flamme leicht transparent (2 Ebenen)
- Fuß: Dreifuß-Ansatz oder gestufter Sockel (2-3 Zylinder-Stufen)
- Material: GOLD mit feiner roughness-Variation (Bump/Canvas-Textur B2)

### B2. Neue Canvas-Texturen (textures.ts) — "richtige Texturen"
- makeGold(): feines Hammer-Schlag-Muster (leichtes Zell-Noise, sehr dezent, bumpMap) —
  Gold wirkt gehämmert statt plastikglatt. Auf GOLD-Material als bumpMap (intensity niedrig).
- makeBread(): Schaubrote — goldbraune Oberfläche mit Körnung + dunkleren Rändern,
  leichte Beule (bump). Auf die 12 Brote anwenden (statt plain color).
- makeLinen(): verfeinern — feine Fadenstruktur (2-Pixel-Raster) + leichte Irritation,
  für Vorhangswände + Parochet-Basis
- makeWood(): Akazien-Holzmaserung sichtbarer machen (Längsstruktur mit Knoten-Andeutung),
  dezent auf den Balkenwänden UNTER dem Goldüberzug? Nein: Balken sind vergoldet —
  makeWood nur für Torpfosten? NICHT einbauen wo biblisch vergoldet. Akazien sichtbar:
  nur bei den Geräten, die in Ex 25 Holz mit Goldüberzug haben → alles Gold bleibt Gold.
  makeWood landet als Reserve für spätere Bedürfnisse (Nicht-Heiligtum-Möbel).
- makeBronze(): für Altar/Becken — dunkle Patina-Mischung (grünliche Flecken an Rändern,
  glänzende Reibflächen in der Mitte), auf BRONZE-Material
- makeVeil(): Parochet/Wand-Behang — Wirkerei-Muster sichtbarer: kleine wiederholte
  Cherubim-Silhouetten (2-3 gezeichnete Formen, golden, alpha 0.35) über die 4 Farbstationen

### B3. Schaubrottisch (HolyPlace.tsx)
- Doppelkranz als gedrechselte Welle (Torus mit gestufter Skalierung oder 2 überlagerte
  Tori leicht versetzt), Beine leicht profilierter (Zylinder mit Ring-Fuß)
- Brote: flach-rund mit makeBread-Textur, 2 Stapel à 6, leicht gedreht versetzt

### B4. Brandopferaltar + Becken (TabernacleCourtyard.tsx)
- Altar: Kasten mit sichtbarem Rahmen-Fries oben (4 schmale Leisten), Hörner filigraner
  (leicht konisch, abgerundete Spitze via kleine Kugel), Stangen mit Ring-Halterungen
- Becken: elliptischer Rand (Torus skaliert), Fuß als Kelchform (2 Konen), Wasser-Fläche
  mit leichter Wellen-Normal-Animation? NEIN — statisch, aber makeBronze-Patina
- Rost: sichtbar unter der Mitte (Gitter aus 4-5 dünnen Stäben, half-depth im Inneren)

### B5. Lade + Cherubim (HolyOfHolies.tsx)
- Lade: Goldkranz oben als "Krone" (Torus-Ring am Rand), Tragstangen-Ringe mit
  sichtbarem Ring-Ausschnitt, Korpus mit makeGold-bumpMap
- Cherubim: Flügel als dünne, leicht gebogene Flächen (2 Segmente pro Flügel mit Knick),
  statt flacher Planes; Gesichter-Kugel mit feinerer Silhouette (Kegel-Schnabel NEIN —
  Cherubim haben kein vorgegebenes Aussehen: elegant-abstrakt lassen, aber filigraner)

## C. Nichts davon verändern
- Biblische Maße (CUBIT etc.) — unverändert
- Positionen der Geräte (SPEC-originalgetreue.md) — unverändert
- Performance-Struktur: Instancing/Material-Singletons/Draw-Call-Budget < 250
- Audio, Steuerung, GameUI, Loading-Flow

## D. Akzeptanz
- npm run build fehlerfrei
- Screenshots (debugcam) zeigen: Vorhofs-Wand AN den Säulen; Westwand innen GOLD mit
  Parochet davor; Außenansicht OHNE bunten Streifen; Geräte mit sichtbar feineren
  Details (Menora-Blüten, Altar-Fries, Becken-Kelch, Lade-Krone)
- Neue Texturen sichtbar: Gold-Hammerung (Bump), Brot-Körnung, Bronze-Patina, Veil-Wirkerei
