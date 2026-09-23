# SPEC: Originalgetreue Rekonstruktion der Stiftshütte

Ziel: Die 3D-Darstellung soll bibeltreu nach Exodus 25–30 + 38 + 40 nachgebaut werden.
Alle Abweichungen gegenüber dem aktuellen Code sind unten gelistet. Maßstab bleibt 1 Elle = 0,45 m.

## Koordinatensystem (ZIEL-Layout)

- Osten (Eingang, Tor) = z = 0; Westen = z = +45 m
- **Vorhof: 100 Ellen lang (45 m) × 50 Ellen breit (22,5 m)** — Ex 27,18
  - Umzäunung z = 0 … 45 m, x = −11,25 … +11,25 m
  - Höhe der Vorhangwände: 5 Ellen (2,25 m) — Ex 27,18
- **Stiftshütte INNERHALB des Vorhofs am Westende:** z = 31,5 … 45 m
  - Gesamtlänge 30 Ellen (13,5 m): Heiliges 20 Ellen (9 m) + Allerheiligstes 10 Ellen (4,5 m)
  - **Breite 10 Ellen (4,5 m), Höhe 10 Ellen (4,5 m)** — Ex 26,15-30 (20 Balken à 1,5 Ellen Breite)
  - Weltkoordinaten: Heiliges z = 31,5 … 40,5; Allerheiligstes z = 40,5 … 45
- Einrichtungen (Ex 40,Verweis-Kette):
  - Brandopferaltar: vor dem Eingang der Stiftshütte, z ≈ 27 m, Mittellinie
  - Waschbecken: zwischen Altar und Stiftshütte, z ≈ 29,5 m, Mittellinie (Ex 40,7)
  - Leuchter (Menora): SÜDSEITE des Heiligen (Ex 40,24), x ≈ −1,1, z ≈ 36
  - Schaubrottisch: NORDSEITE (Ex 40,22), x ≈ +1,1, z ≈ 36
  - Räucheraltar: direkt vor dem Vorhang des Allerheiligsten, z ≈ 39,7 (Ex 40,5)
  - Lade: im Allerheiligsten, z ≈ 42,75 (Mitte des Würfels)

## Korrekturen im Detail

### Vorhof (Ex 27,9-19)
1. Länge 100 Ellen (45 m), nicht 50. Säulenanzahl gesamt 60: 20 Süd, 20 Nord, 10 West, 10 Ost (davon Tor-Abstand).
2. Säulen: Bronzesockel (Ex 27,10: „Sockel von Kupfer"), Säulenschäfte mit Silber überzogen, Silberkappen/Haken (Ex 27,10-11), Silberfüße.
3. **Seitenvorhänge: weißes gezwirntes Byssus (Leinen)** — Ex 27,9: „aus gezwirntem Byssus". NICHT blau/rot.
4. **Tor des Vorhofs (Ostseite, 20 Ellen): bunt gewirkte Decke aus blau, violett, scharlach und gezwirntem Byssus** — Ex 27,16. Nur hier farbig!

### Brandopferaltar (Ex 27,1-8; 38,1-7)
- 5 × 5 Ellen Grundfläche, 3 Ellen hoch ✓ (stimmt schon)
- Hörner an den 4 Ecken FEHLEN im Code → ergänzen
- Akazienholz mit Bronze überzogen, Hohlraum ✓, Rost/Gitter Netzwerk mittig, Ringe an den Ecken unten (nicht mittig), Tragstangen ergänzen

### Stiftshütte (Ex 26,15-30)
5. **Wände = gold überzogene Akazienbalken** (nicht Stoffvorhänge):
   - Süd + Nord: je 20 Balken, West: 8 Balken + 2 Eck-Winkelstücke
   - Balken: 10 Ellen hoch, 1,5 Ellen breit, je 2 Zapfen, **Silbersockel** (je 1 Talent Silber)
   - Querstangen (5 pro Seite) durch Goldringe, Stangen gold überzogen
6. **4 Deckenschichten** (Ex 26,1-14) von innen nach außen:
   a. 10 Vorhänge Byssus, blau/violett/scharlach, mit Cherubim-Wirkerei
   b. 11 Vorhänge Ziegenhaar
   c. Decke rot gefärbte Widderfelle
   d. Decke Dachhaute (Tachasch-Felle, dunkel)
   - Überhang: Decke hängt 1 Elle an der Front über, an der Rückseite hängt die halbe Decke (Ex 26,9.12-13) → sichtbar von außen als Dach + Vorhangstüberhang

### Heiliges
7. Breite auf 4,5 m korrigieren (Boden: 9 m × 4,5 m; alle Wandpaneele anpassen). Wände aus goldenen Balken (siehe oben).
8. Menora (Ex 25,31-40): realistische Höhe ≈ 1 Elle ≈ 0,9–1,1 m (aktuell 3,4 m — viel zu groß!).
   7 Arme (3 Paar + Mittelschaft), Mandelblüten-Knäufe, gold, EIN Talent. Öllämpchen mit Flammen.
9. Schaubrottisch (Ex 25,23-30): **Höhe 1,5 Ellen (0,675 m)** — nicht 2,5!
   2 × 1 × 1,5 Ellen, Akazien gold überzogen, goldener Doppelkranz, 4 Ringe + Tragstangen,
   Schaubrote: 2 Stapel à 6 (nicht 2×6 nebeneinander in Reihe), plus Gefäße (Schalen/Kannen) ergänzen.
10. Räucheraltar (Ex 30,1-10): 1 × 1 × 2 Ellen ✓ — Position direkt VOR den Vorhang (z ≈ 39,7), nicht mitten im Raum.

### Allerheiligstes (Ex 25,10-22; 26,31-34)
11. Würfel 4,5 × 4,5 × 4,5 m ✓. Wände wie Stiftshütte (goldene Balken).
12. **Vorhang (Parochet)**: 4-farbig (blau, violett, scharlach, Byssus) mit Cherubim-Wirkerei, hängt an 4 goldenen Säulen auf 4 Silbersockeln (Ex 26,32) an der Grenze z = 40,5.
13. Lade: 2,5 × 1,5 × 1,5 Ellen ✓
    - **4 Ringe an den 4 unteren Ecken** (Ex 25,12), nicht 2
    - **Tragstangen** (Akazien, gold überzogen, bleiben eingesteckt) ergänzen
    - Kapporet (Gnadenstuhl) massiv gold ✓
    - **Cherubim vergrößern**: Flügel ausbreitend nach oben, je 2,5 Ellen Spannweite (berühren einander in der Mitte, enden an den Wänden), ~1 Elle hoch, aus einem Stück mit der Kapporet gedrieben — KEINE Augen/Menschengesichter-Detailarbeit nötig, aber würdevoll und deutlich größer als aktuell
14. Shekinah-Licht über der Lade beibehalten (schön).

### Beleuchtung & Atmosphäre
15. `TabernacleLighting.tsx` und `TabernacleAtmosphere.tsx` einbinden und anpassen:
    - Draußen: Wüstensonnenlicht (warm, harte Schatten), Himmel gedecktes Wüstenblau (nicht Toybox-Hellblau)
    - Drinnen: nur Menora-Leuchter (warm, flackernd) + Shekinah-Glanz im Allerheiligsten; Räucheraltar-Glut
    - Weihrauch-Partikel im Heiligen dezent
16. `zustand` entweder nutzen (GameUI-State sauber in einen Store ziehen) oder aus package.json entfernen — kein toter Import.

### Sonstiges
- Loading-Flow, Audio, Steuerung (WASD + VR-Teleport + Snap-Turn) beibehalten — funktioniert.
- Spieler-Startposition: außerhalb des Tores, z = −8, Blick nach Westen (auf Tor und Altar).
- Kollisionsgrenzen an neues Layout anpassen (x: −10,5…+10,5; z: −5…+43; inkl. Innenräume).
- Altdeutsche Beschriftung/Info-Texte NICHT einbauen (falls vorgeschlagen) — nur 3D.
- `improve_loop.py`-Pfad-Referenz `/opt/data/tabernacle-vr` ignorieren (historisch).

## Akzeptanzkriterien
- `npm run build` läuft fehlerfrei durch
- Alle Maße oben abgebildet (Grundriss 45×22,5 m Vorhof, Stiftshütte 13,5×4,5×4,5 m innerlich)
- Menora ~1 m, Tisch 0,675 m hoch, Lade mit Stangen + 4 Ringen, Cherubim groß
- Balkenwände sichtbar (goldene Streifen-Silhouette), 4 Dachschichten von außen unterscheidbar
- Keine toten Imports; alte Fehlfarben (blaue/rote Vorhänge an Seitenwänden) entfernt
