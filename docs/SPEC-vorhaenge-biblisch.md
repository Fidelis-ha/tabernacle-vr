# SPEC: Vorhänge exakt nach Bibeltext (Ex 26,1.31.36 / Ex 27,16)

## Biblische Vorgabe (Luther 2017, wörtlich geprüft)
- **Ex 26,1 (10 Deckteppiche der Wohnung):** feines Leinen + blauer/roter Purpur + Karmesin;
  „Cherubim sollst du **einweben**, wie es ein Kunstweber macht" → ALLE 4 Farben FLÄCHIG im
  Stoff, Cherubim als eingewebte Muster.
- **Ex 26,31 (Parochet):** 4 Farben + Cherubim eingewebt in kunstreicher Arbeit.
- **Ex 26,36 (Eingangsdecke):** „bunt gewebt" aus 4 Farben — **KEINE Cherubim**.
- **Ex 27,16 (Vorhofstor):** 4 Farben gewirkt — **KEINE Cherubim**.
- **Ex 27,9-18 (Vorhofsbehänge):** nur gezwirntes feines (weißes) Leinen — keine Farben,
  keine Cherubim (nur prüfen, dass das stimmt; nicht ändern falls korrekt).
- „Einweben" (hebr. ḥoshev) = Kunstweberarbeit/Wirkerei, NICHT Stickerei, NICHT Gold.
  Cherubim-Darstellung: **flächige Wirkerei-Silhouetten in den Stofffarben**
  (Violett/Karmesin/Blau, je nach Untergrund hell/dunkel abgesetzt) — Marc hat am
  24.09. genau diese Ausführung gewählt. Goldene Cherubim bleiben AUSSCHLIESSLICH
  die Lade-Cherubim (Massivgold, Ex 25,18).

## A — Tor des Vorhofs (textures.ts makeGate)
A1. Cherubim-Ornamente ENTFERNEN (Ex 27,16 nennt keine).
A2. 4 Farben als Wirkerei: weiche vertikale Übergänge beibehalten (aus perf-stoffe),
    aber Farbeinteilung deutlicher strukturiert wirken lassen — feine Web-Streifen
    IN den Farbfeldern (Kunstweber-Look), nicht nur Verlauf.

## B — Eingangsdecke des Zeltes (textures.ts makeScreen)
B1. Cherubim-Ornamente ENTFERNEN (Ex 26,36 nennt keine).
B2. Wie A2: bunt gewebt, 4 Farben, weiche Übergänge + Web-Struktur.

## C — 10 Deckteppiche (textures.ts makeUnderRoof) — UMBAU
C1. Von „Byssus-dominant + Randborden" auf **4-Farben-Fläche** umstellen:
    Fläche aus feinem Leinen-Grundton (0xE8DFC8) mit flächigen Wirkerei-Feldern
    in Blau (0x2E4A78), Violett (0x6B2D5B), Karmesin (0x8E2B25) — z. B. als
    große, weich überblendete Bahnen/Felder (je Teppich-Bahn ein Farbcharakter),
    die zusammen den Vorhang formen. NICHT grell kariert; antik gedeckt.
C2. **Cherubim-Silhouetten eingewebt**: mehrere flächige Cherubim-Figuren
    (stilisiert: 2 Flügel + Körper, geometrisch, low-poly-artig) in den
    Stofffarben auf dem Untergrund — wiederholtes Muster wie Kunstweberarbeit,
    verteilt über die Fläche (nicht nur Rand).
C3. Feine vertikale Nähte (10 Teppiche) beibehalten; Schlaufen-Reihe oben
    (blaue Schlaufen, Ex 26,4) darf als dezente blaue Perforation angedeutet
    bleiben — optional, falls trivial.

## D — Parochet (textures.ts makeVeil)
D1. Cherubim BLEIBEN (Ex 26,31), aber als **flächige Wirkerei-Silhouetten in
    Stofffarben** statt goldbraun: auf dem 4-Farb-Grund deutlich abgesetzt
    (z. B. dunkle Silhouette auf hellem Feld bzw. helle auf dunklem Feld),
    gleichmäßig wiederholt über die Fläche.
D2. Weiche Übergänge der 4 Farben beibehalten, Web-Struktur wie A2.

## E — Gemeinsame Details
E1. Die Cherubim-Silhouette EINMAL als wiederverwendbare Zeichen-Funktion
    (z. B. drawCherubim(ctx, x, y, size, color) in textures.ts) — konsistent
    in C2 und D1; Flügel hochgebogen zum Dach-Hinweis (Ex 25,20-Anmutung).
E2. Gewebe-Overlay (weave) bleibt auf allen Vorhängen.
E3. low-Tier ohne Normal-Maps — wie bisher.

## Unveränderlich
- Biblische Maße/Positionen; Farben-Konstanten ANTIQUE_* bleiben; Material-Singletons;
  Draw-Call-Budget; keine /tmp-Nutzung; .reviews/ nicht anfassen.
- Am Ende: npm run build bis fehlerfrei. Kein Commit.
- Bericht: .reviews/vorhaenge_bibel_fixreport.md je Abschnitt erledigt/abgewandelt.
