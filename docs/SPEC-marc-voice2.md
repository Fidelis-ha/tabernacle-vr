# SPEC: Marc-Sprachnachricht 25.09. (Ambient 0%, Hinweise gerätespezifisch, Planen bis Boden, Stangen nach 1 Kön 8,8)

## Marc-Befunde (Transkript audio_557c)
1. Ambient-Sound (Schafe) auf 0% Lautstärke (war 0.4).
2. Steuerungs-Erklärung gerätespezifisch: VR-Brille → KEINE Erklärung;
   Handy/Touch → Joystick-Hinweise; Rechner → WASD/Maus. Nicht alle drei
   gleichzeitig in einer Box.
3. Zeltplanen (letzte Änderung): überstehen noch seitlich wie eine PLATTE.
   Echter Stoff fällt an der Zeltkante NACH UNTEN — auf allen bekannten
   Abbildungen bis zum Boden (oder fast). Anpassen.
4. Tragestangen immer noch zu kurz. Mose beschreibt KEINE Länge (Ex 25,13
   nur Material) — ABER 1 Kön 8,8: „Die Stangen waren lang, sodass ihre
   Enden vom Heiligen aus sichtbar waren" (+ Talmud Joma 72a: Enden
   drückten den Parochet hervor). Und: gut TRAGBAR (Ausbalancierung).

## A — Ambient-Default 0 (GameUI.tsx)
A1. settings.ambient: 0.4 → 0 (Default). Slider im Menü bleibt (User kann
    hochregeln). ambientGainNode initialisiert mit settings.ambient — kein
    weiterer Code nötig, prüfen dass beide Stellen (Def + Gain) konsistent.

## B — Gerätespezifische Steuerungshinweise (GameUI.tsx ~385)
B1. isTouchDevice aus App.tsx als Prop an GameUI durchreichen (oder gleicher
    Hook lokal).
B2. Die Steuerungs-Box rendern:
    - Touch (pointer: coarse / maxTouchPoints): „ joystick - Bewegung" +
      „Ziehen - Drehen" (Texte an bestehende Joystick-UI anpassen, KEINE
      WASD-Zeilen).
    - Desktop: „WASD / Pfeile - Bewegung", „Maus + Linksklick - Drehen",
      KEINE VR-Zeile.
    - XR verfügbar (navigator.xr && await isSessionSupported('immersive-vr'),
      Hook mit useEffect/state): Box GAR NICHT rendern.
B3. ESC-/Menü-Hinweise bleiben geräteunabhängig im Menü (nicht doppelt).

## C — Zeltplanen bis zum Boden (HolyPlace.tsx RoofLayers/makeHangGeo)
C1. Dach-Lagen-Breiten reduzieren, kaum horizontaler Überstand mehr:
    4.4 / 5.35 / 5.8 / 6.25 → 4.42 / 4.52 / 4.62 / 4.72 (max 0.22 Überstand
    je Seite — liest sich als Kante, nicht als Platte). Back-Überstände und
    Stapelung (y: 4.515/4.59/4.7/4.83) UNVERÄNDERT.
C2. makeHangGeo: bottomY 0.25 → 0.06 (fast Boden). Fall-Linie: statt
    Auswärts-Schwung (0.09 nach z) ein fast vertikaler Fall mit leichtem
    Stoffbauch (0.03), Falten/Saum behalten.
C3. Je Außen-Lage (b/c/d) eine Herabhang-Bahn JE SEITE (aktuell vermutlich
    nur hinten/vorne?) — prüfen: Wenn seitliche Bahnen fehlen, ergänzen:
    makeHangGeo-Bahn an x = ±(Breite/2) rotiert, vom jeweiligen l.y bis
    0.06. Material = l.mat (Singleton), Draw-Calls: 3 Lagen × 2 Seiten = 6
    extra Meshes — Budget prüfen (<250), ggf. gemergt pro Material.
C4. Front-/Back-Bahnen (Ex 26,9.12-13: hinten halbe Decke) behalten, aber
    ebenfalls bis 0.06 verlängern.

## D — Tragestangen nach 1 Kön 8,8 (HolyOfHolies/HolyPlace/TabernacleCourtyard)
D1. LADE: arkStaveGeo Länge ARK_LENGTH + 0.8 → ARK_LENGTH + 3.6 (je Seite
    1,8 m Überstand). Begründung-Kommentar: 1 Kön 8,8 (Enden vom Heiligen
    aus sichtbar, Joma 72a) — die Lade-Stangen reichten fast bis an den
    Parochet. Ringe (Ex 25,12: untere Ecken) UNVERÄNDERT — Stange gleitet
    durch. Ausbalanciert (beidseitig gleich).
D2. SCHAU BROTTISCH (Ex 25,26-28) + RAEUCHERALTAR (Ex 30,4-5) + BRANDOPFER-
    ALTAR (Ex 27,6-7): ebenfalls deutlich länger, je Seite ~1,0 m Überstand
    (tragbar von 2 Personen, Ring-Höhe unverändert). Keine Bibel-Länge —
    ehrlicher Kommentar im Code: Länge nicht überliefert, traditionelle
    Tragbarkeit.
D3. Prüfen, dass die verlängerten Lade-Stangen nicht durch Wand/Parochet
    clippen: Lade z=42.75, Stangen verlaufen entlang der Ladewürfel-Länge —
    Enden ragen Richtung Ost/West FREI (Raum 4.5 m hoch/wide) — visuell
    checken (Screenshot), ggf. Überstand 1.4 m wenn's kollidiert (dann im
    Report abgewandelt notieren).

## Unveränderlich
- Biblische Maße/Positionen; Material-Singletons; Cherubim (Runde 3);
  Draw-Call-Budget < 250; keine /tmp-Nutzung; .reviews/ nicht anfassen
  (neuer Report-Dateiname erlaubt).
- Am Ende: npm run build bis fehlerfrei. Kein Commit.
- Bericht: .reviews/marc_voice2_fixreport.md je Abschnitt A-D
  erledigt/abgewandelt.
