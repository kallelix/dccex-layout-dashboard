# Layout-Datei-Format

Eine Layout-Datei ist eine JSON-Datei, die deine physische Anlage beschreibt. Sie verbindet **CommandStation-IDs** (was die CS kennt) mit **SVG-Geometrie** und **menschenlesbaren Namen** (was die CS *nicht* weiß).

Bei Bedarf siehe [`src/layout/example.json`](../src/layout/example.json) als vollständiges Beispiel und [`src/layout/schema.ts`](../src/layout/schema.ts) für die TypeScript-Typen.

## Top-Level

```jsonc
{
  "name": "Meine Anlage",          // wird oben im Dashboard angezeigt
  "viewBox": "0 0 800 400",        // SVG viewBox — bestimmt das Koordinatensystem
  "segments":  [ ... ],
  "turnouts":  [ ... ],
  "sensors":   [ ... ],
  "lights":    [ ... ],
  "sections":  [ ... ],
  "sequences": [ ... ]
}
```

Alle sieben Arrays sind Pflicht; leere Arrays sind erlaubt.

## Koordinaten

`viewBox` ist `"min-x min-y width height"`. Alle `x`/`y`-Angaben im Layout beziehen sich auf dieses Koordinatensystem. Faustregel: `1000 × 500` ist eine angenehme Auflösung für Anlagen mittlerer Größe — du arbeitest dann in „Pixeln" und kannst Element für Element bequem positionieren.

## `segments` — Gleisstücke

```jsonc
{
  "id": "S1",                      // beliebige lokale ID, nur Layout-intern
  "path": "M 40 200 L 250 200",    // SVG-Path-Syntax (siehe unten)
  "sectionId": 1,                  // optional — Section-ID aus EX-RAIL
  "stroke": "#94a3b8",             // optional — Linienfarbe (Default: hellgrau)
  "strokeWidth": 6                 // optional — Strichstärke (Default: 6)
}
```

- **`id`** ist nur intern (für `sections.segments[]`). Sie taucht im DCC-EX-Protokoll **nicht** auf.
- **`sectionId`** verknüpft das Segment mit einer EX-RAIL Section-Reservierung. Sobald die CS `<jR sectionId locoId>` broadcastet, färbt sich das Segment gelb.
- **`path`** ist ein SVG-`d`-Attribut: `M x y` = moveto, `L x y` = lineto, `C x1 y1 x2 y2 x y` = kubischer Bézier, `Q x1 y1 x y` = quadratischer Bézier. [Path-Reference auf MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d).

## `turnouts` — Weichen

```jsonc
{
  "id": 12,            // CS-Weichen-ID — passt zu <H id ...> und <T id ...>
  "x": 250,
  "y": 200,
  "rotation": 0,       // optional, in Grad
  "label": "W1",       // optional
  "root":   "S_zu",    // optional — Segment an der Weichenspitze (Wurzel)
  "closed": "S_grad",  // optional — Segment im Zustand CLOSED (<T id 0>)
  "thrown": "S_ab"     // optional — Segment im Zustand THROWN (<T id 1>)
}
```

- **`id`** muss mit der ID in der CS übereinstimmen (z. B. aus `<JT>` oder aus deiner `myAutomation.h` mit `TURNOUT(12, …)`).
- Klick auf den Kreis sendet `<T id 0|1>` und schaltet zwischen `CLOSED` (grün) und `THROWN` (rot).
- **`root` / `closed` / `thrown`** referenzieren `segments[].id` und beschreiben die **Topologie**: welches Gleisbein an der Spitze liegt und welche zwei Beine die Weiche in CLOSED bzw. THROWN verbindet. Sind sie gesetzt, wird das gerade **nicht** gewählte Bein ausgegraut (gestrichelt) — die eingestellte Fahrstraße ist so sichtbar. `CLOSED`/`THROWN` ist eine **Decoder-Konvention**, nicht zwangsläufig das physisch gerade Bein — verdrahte die Felder so, wie es die Hardware tatsächlich tut.

## `sensors` — Sensoren / Belegtmeldung

```jsonc
{ "id": 101, "x": 120, "y": 200, "label": "S-Bhf" }
```

- **`id`** muss mit der CS-Sensor-ID (`<S id ...>`) übereinstimmen.
- Read-only: aktiv = blau gefüllt, inaktiv = dunkel.

## `lights` — Gebäude- und Szenenlichter

```jsonc
{
  "protocol": "output",    // optional — "output" (Default) oder "turnout"
  "outputId": 5001,        // bei protocol "output"
  "x": 360,
  "y": 165,
  "label": "Bahnhof EG",
  "alias": "L_BHF_EG",     // optional — Referenz auf myAlias.h
  "r": 7                   // optional — Radius in px (Default 7)
}
```

- **`protocol`** bestimmt, wie die CS das Licht ansteuert (Default `"output"`):
  - `"output"` — EX-RAIL Output / VPIN. Feld **`outputId`** nötig. Schalter sendet `<Z outputId 0|1>`, Status via `<Y outputId state>`.
  - `"turnout"` — als `TURNOUTL(...)` deklariertes DCC-Zubehör-Licht. Feld **`turnoutId`** nötig. Schalter sendet `<T turnoutId 0|1>`, Status via `<H turnoutId state>`. „An" = `THROWN` (`<T id 1>`).
- **`alias`** ist rein dokumentarisch — die CS sendet im Protokoll **keine** Alias-Namen, nur Zahlen.

> Hinweis: Auf dieser Anlage hängen alle Szenenlichter an echten DCC-Adress-Lichtdecodern und sind in der `myAutomation.h` als `TURNOUTL(...)` deklariert — also `protocol: "turnout"`. Siehe [`anlage-v2.json`](../anlage-v2.json).

## `sections` — Logische Streckenabschnitte

```jsonc
{
  "id": 1,                       // EX-RAIL Section-ID (RESERVE/FREE Operand)
  "label": "Einfahrt",
  "segments": ["S1", "S1a"]      // welche segments[].id zu dieser Section gehören
}
```

- **`id`** ist die Reservation-Slot-ID, die EX-RAIL `RESERVE(id)` / `FREE(id)` verwendet.
- Optional, aber **nötig** für die gelbe Belegt-Färbung. Ohne Section-Definition reagiert das Layout nicht auf `<jR>`-Broadcasts.

## `sequences` — EX-RAIL Routen / Sequenzen

```jsonc
{
  "routeId": 200,             // ID aus ROUTE(200, …) oder SEQUENCE(200, …)
  "label": "Pendelfahrt",
  "icon": "shuttle"           // optional, derzeit nicht gerendert
}
```

- Im Side-Panel erscheinen Start/Stop-Buttons. „Start" sendet `</ START routeId>`, „Stop" sendet `</ KILL routeId>`.
- Wenn die CS Route-State-Broadcasts schickt (`<jB id state>` mit `state>=2`), wird der Start-Button grün hervorgehoben.

## Tipps fürs Mappen

1. **IDs zuerst sammeln**: Schau in deiner `myAutomation.h` nach `TURNOUT(...)`, `SENSOR(...)`, `OUTPUT(...)`, `ROUTE(...)`, `SEQUENCE(...)`, `RESERVE(...)`-Stellen und schreibe die IDs raus.
2. **Strecke grob skizzieren**: Auf Papier oder in einem SVG-Editor (z. B. Inkscape) die Topologie zeichnen, Koordinaten ablesen.
3. **Iterativ verfeinern**: Laden, Browser-Konsole offen lassen — Fehler im JSON oder fehlende Felder werden dort als Stacktrace gemeldet. Datei anpassen, neu droppen, fertig.
4. **`localStorage` leeren**: Wenn du eine ganz neue Datei probieren willst und der Reset-Button nicht reicht, in der Browser-DevTools-Konsole `localStorage.removeItem('dccex-dashboard-layout')` ausführen.
