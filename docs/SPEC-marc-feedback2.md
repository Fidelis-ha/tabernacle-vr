# SPEC: Marc-Feedback 24.09. (Zelt-Bug, Tiere-Assets, Begehbarkeit, Pause-Button, Decken, Wirkerei)

## Marc-Befunde (wörtlich)
1. „Es steht ein Zelt in der Stiftshütte." (Bug!)
2. Tiere-Assets einsetzen; „Der Esel sieht nicht gut aus"; andere Tiere gut.
3. „Ich möchte auch um die Stiftshütte drumherum gehen können."
4. Einstellungs-Button ändern: „Pause" ungeeignet und zu aufdringlich.
5. Decken der Stiftshütte besser darstellen.
6. Vorhangstoff war (Marc-Frage + Entscheidung): KEINE Streifen — gewirkte
   Farbflächen, fließend-fleckig überlappend wie Kunstweber-Gewebe.

## A — BUG: Zelt im Vorhof (höchste Priorität)
`CampIsrael.tsx generateTents()`: Radius 25-40 m um CENTER_Z reicht IN den Vorhof
(Vorhof ~44×22 m → x ∈ [-22,22], z ∈ [0,45]).
A1. Platzierungs-Regel: Zelt-Positionen nur AKZEPTIEREN wenn AUSSERHALB des
    erweiterten Vorhof-Kastens: |x| > 27 ODER z < -7 ODER z > 52 (Puffer 5 m
    für Zeltbreite + Seile). Verworfene Specs neu würfeln (while bis gültig,
    mit Abbruchzähler). TENT_COUNT bleibt.
A2. Dieselbe Sperrzone für die Tiere in Animals.tsx (dort reicht es NICHT, nur
    die Zelt-Anker abzuklopfen — Sperr-Kasten zusätzlich).
A3. Verifikation: kein TENT_SPECS-Eintrag und kein Tier-Anker innerhalb
    |x| < 27 && z > -7 && z < 52. Als Konsolen-Assert oder Test-Kommentar.

## B — Tiere: Quaternius CC0-Assets (animiert)
Assets liegen bereit: `public/models/animals/{Donkey,Cow,Alpaca}.glb`
(CC0, Draco-komprimiert, Animationen inkl. Idle/Eating/Walk/Gallop).
Schaf bleibt prozedural (sieht gut aus, kein CC0-Schaf verfügbar — dokumentiert
in models/animals/LICENSE-CC0.md). Alpaca = Kamelid (Kamel-Ersatz, optisch nah).
B1. `Animals.tsx`: Donkey/Cow/Alpaca via drei `useGLTF('/models/animals/X.glb', true)`
    (Draco) laden; `useAnimations` mit GEMISCHTEN Clips pro Instanz (meist Idle/Eating,
    gelegentlich Walk auf kurzer Strecke); Eigenzeit-Offset je Instanz (kein Chor).
B2. Instanzen: 2-3 Esel, 2-3 Kühe, 2-3 Alpakas (+ bestehende Schaf/Ziegen-Herde
    prozedural, InstancedMesh bleibt). SkinnedMesh kann NICHT instanced werden —
    Draw-Call-Budget beachten: Donkey hat 8 Materialien → bei >200 Calls gesamt:
    Instanz-Zahl reduzieren ODER Modelle auf 1 Material reduzieren
    (`npx @gltf-transform/cli prune` + Material-Merge vorab erlauben — Assets
    neu komprimieren mit `--simplify` nicht nötig).
B3. Skalierung: Modelle in Meter einpassen (Esel Schulter ~1,1 m, Kuh ~1,3 m,
    Alpaka ~0,9 m) — `scene.traverse` BBox messen, Faktor ableiten, NICHT raten.
B4. low-Tier: 1 je Asset-Art, Animationen behalten (skeletal ist billig), Schafe 6.
B5. Positionen: in Herden-Nähe (bestehende Anker-Logik), A2-Sperrzone gilt.

## C — Um die Stiftshütte herumgehen
C1. Kollisions-AABBs (App.tsx COLLIDERS) PRÜFEN: aktuell nur Heiligtum-Wände +
    Altar + Becken — innen/außen herumlaufen muss möglich sein. Falls Marc-
    Blocker: fehlende Vorhofs-Wand-Collider ERGÄNZEN (Leinenwände sollen nicht
    durchlässig sein), MIT Tor-Durchlass am Osttor (z=0, Breite ~9 m) und
    Zelteingang (z=31,5). Ziel: Man kann (a) im Vorhof um das Heiligtum herum-
    gehen und (b) außen um den ganzen Vorhof herum, durch das Osttor rein/raus.
C2. WAHRSCHEINLICHE Ursache des Marc-Befunds: das fehlplatzierte Zelt (A) blockierte
    den Weg — nach A1 verifizieren, dass der äußere Ring frei ist.

## D — Pause-Button dezent
GameUI.tsx:329 „⏸ Pause (ESC)"-Block (oben Mitte, groß, dunkel+gold).
D1. Ersetzen durch kleines, halbtransparentes Icon oben RECHTS: „☰" mit
    Label „Menü", max. ~40 px Höhe, opacity 0.55, hover 0.9; kein permanenter
    dunkler Kasten. Klick = gleiches togglePause. ESC-Hinweis nur im Menü/
    Hover-Tooltip (title-Attribut), nicht permanent sichtbar.
D2. Im Pause-Menü selbst darf „Pause (ESC)" stehen — nur der DAUERHAFTE
    Button wird dezent. Joystick-Fläche nicht überlappen.

## E — Decken der Stiftshütte besser (Ex 26,7.14)
Vier Lagen, von innen nach außen: bunte Byssus-Teppiche (innen sichtbar —
schon umgesetzt, SPEC-vorhaenge-biblisch), Ziegenhaar-Zelt, rot gefärbte
Widderfelle, feines Leder (Dachhaut).
E1. Außenansicht: die 3 äußeren Lagen als SICHTBARE Stapel-Lagen mit je
    leichtem Versatz/Überstand (Ziegenhaar dunkelbraun-grau mit Webstruktur,
    Widderfell-Lage rotbraun-rötlich als mittleres Band, Leder oben dunkel-
    lederfarben). Nicht alles eine Fläche — Kanten/Abstufungen sichtbar.
E2. Material: dieselbe burlap/goatHair-Texturbasis mit Farb-Tints (keine neuen
    Texturen nötig), Material-Budget +2 (Widderfell, Leder) ok.
E3. Erste Lage (Ziegenhaar) übersteht die Byssus-Schicht rundum (bibl. Überhang
    Ex 26,12-13: hinten halber Teppich, seitlich je 1 Elle) — Maße unverändert.

## F — Wirkerei statt Streifen (Marc-Entscheidung 24.09.)
makeGate/makeVeil/makeScreen/makeUnderRoof (textures.ts): die vertikalen
Soft-Stripes durch GEWIRKTE FARBFLÄCHEN ersetzen: große, weich überblendete
Farb-Flecken/Bahnen (2-3 übergroße radiale bzw. diagonale Farbfelder je Farbe,
darüber feine Web-Struktur + Cherubim-Silhouetten wo biblisch). Ziel: wie ein
echter Figurenstoff — keine erkennbare Streifenrichtung, keine harten Kanten,
antik gedeckt. Vorlagen-Funktion darf fillSoftStripes zu fillWovenFields umbauen.

## Unveränderlich
- Biblische Maße/Positionen; Palette; Material-Singletons (B2/E2 erlauben die
  genannten Ausnahmen); Draw-Call-Budget < 250; keine /tmp-Nutzung; .reviews/
  nicht anfassen (neuer Report erlaubt).
- Am Ende: npm run build bis fehlerfrei. Kein Commit.
- Bericht: .reviews/marc_feedback2_fixreport.md je Abschnitt A-F erledigt/abgewandelt.
