# SPEC: Marc-Feedback 24.09. Runde 3 (Lade-Cherubim, Stangen, Drehungen, Abstände, Decken)

## Marc-Befunde
1. Cherubim auf der Bundeslade sehen schlecht aus, Gesichter NICHT einander
   zugewandt (Ex 25,20: „Gesichter einander zugewandt, Blick auf die
   Deckplatte, Flügel ausgebreitet über deckend").
2. Alle Tragestangen wirken zu kurz (sollen sichtbar überstehen — Tragbarkeit).
3. Leuchter und Tisch um 90° drehen.
4. Abstand Waschbecken/Altar/Vorhang wirkt gedrängt (Marc-Entscheidung:
   Altar z 27→24, Becken mittig ~28; Ex 30,18 „zwischen" bleibt exakt erfüllt).
5. Stiftshütten-Decken (Screenshot: straffe glatte Plane) sollen wie DECKEN
   aussehen: hängen runter, vom Wind beeinflusst.

## A — Cherubim auf der Lade prozedural aufwerten (HolyOfHolies.tsx)
A1. FLÜGEL: BoxGeometry durch GEBogene Flügel ersetzen — ExtrudeGeometry
    (Bezier/Spline-Profil: Wurzel dick, Spitze dünn, sanfter Bogen nach oben)
    oder gestapelte, abgestufte Zylinderringe. Flügel weiterhin ausgebreitet,
    Spitzen zur Mitte über der Kapporet (Ex 25,20).
A2. KÖPFE: cherubHeadGeo beibehalten, aber ROTIEREN: Kopf blickt zum
    Gegenüber (facing 1 → Blick +x, facing -1 → Blick -x) UND leicht nach
    unten geneigt (Blick auf die Deckplatte). Gesicht andeuten: 2 kleine
    dunkle Vertiefungen (Augen, Sphere r 0.008, versetzt) + dezenter
    Schnauz-/Mundwulst — subtil, kein Cartoon.
A3. KÖRPER: leicht tailliert (LatheGeometry statt Zylinder), 2 kleine
    Fuß-Setzpunkte beibehalten.
A4. Material: bestehendes GOLD-Singleton; Draw-Calls durch Merge nicht
    verschlechtern (Cherubim in arkGold-merge einbeziehen, Augen ggf. separat).

## B — Tragestangen verlängern (sichtbar überstehend, Ex 25,27-28)
B1. Lade (HolyOfHolies arkStaveGeo): je Seite ~0,4 m ÜBERSTEHEND sichtbar
    (Stange bleibt durch die Ringe gesteckt, ragt beidseitig über).
B2. Brandopferaltar (TabernacleCourtyard): Stangen ebenfalls ~0,4 m je Seite
    überstehen lassen (Ex 27,6-7: Stangen bleiben eingesteckt).
B3. Schaubrottisch + Raeucheraltar (falls Stangen vorhanden): gleiche Regel.
B4. Ringe-Positionen NICHT ändern (Ex 25,12: Ringe an den unteren Ecken).

## C — Leuchter + Tisch um 90° drehen (HolyPlace.tsx)
C1. Menora-Komponente: rotation.y += PI/2 (Längsachse der Arme-Aufstellung
    dreht); Schaubrottisch ebenso (Brote-Reihe Richtung neu).
C2. Flammen-Ebenen/Flackerlicht der Menora mitdrehen (Positionen relativ).

## D — Abstände im Vorhof entzerren (TabernacleFloor.tsx + App.tsx)
D1. ALTAR_Z 27 → 24; BASIN_Z 29.5 → 28 (mittig zwischen Altar und
    Stiftshütten-Eingang z=31,5; Ex 30,18 „zwischen Offenbarungszelt und
    Altar" exakt erfüllt).
D2. App.tsx COLLIDERS synchron anpassen: Altar-AABB minZ/maxZ (22.875-25.125),
    Becken-AABB (27.1-28.9). Sonstige Collider unverändert.

## E — Stiftshütten-Decken wie Stoff (HolyPlace/HolyOfHolies/Decken-Lagen)
E1. SEITEN-LAGEN (die glatte gelbe Plane aus Marcs Screenshot + äußere Lagen):
    statische Deformation wie makeTentRoofGeo — Sackung (sin zwischen
    Stützpunkten), vertikale Falten (2-3 sanfte Wellen über die Höhe),
    untere Kante UNSCHNITTIG: leicht ungleichmäßiger Saum (±2-3 cm Welle).
E2. Herabhang: Seiten-Lagen enden ~0,2-0,3 m über Boden (statt fast bündig)
    und hängen mit leichtem Auswärts-Schwung (nicht straff gespannt bis
    Seile). Abspannseile der Stiftshütte entfernen ODER deutlich lockerer
    (die Stiftshütte war ein Zeltgestell — Seile sind nicht biblisch erwähnt;
    wenn entfernt: keine Halterungs-Artefakte hinterlassen).
E3. WIND-ANIMATION: onBeforeCompile auf die Decken-Materialien (gleiches
    Muster wie CampIsrael applyWind): pos.y += sin(worldPos.x*0.6+uTime*0.9)
    * 0.035 * uv.y — nur HIGH-Tier (low-Tier statisch). Amplituden DEZENT
    (Schwere Stoffe, nicht Zeltläppchen).
E4. Dach-Lagen (Ziegenhaar/Widderfell/Leder) behalten ihre Stapelung aus
    marc-feedback2, bekommen aber dieselbe sanfte Falten-Bake.

## Unveränderlich
- Biblische Maße der Geräte (Lade 2,5x1,5x1,5 Ellen etc.); Menora/Tisch
  Positionen (x=±1,1, z=36) — nur Rotation; Cherubim-Größe (~1 Elle hoch);
  Material-Singletons; Draw-Call-Budget < 250; keine /tmp-Nutzung;
  .reviews/ nicht anfassen (neuer Report-Dateiname erlaubt).
- Am Ende: npm run build bis fehlerfrei. Kein Commit.
- Bericht: .reviews/marc_feedback3_fixreport.md je Abschnitt A-E.
