# Jot Format

Jot is a compact, LLM-friendly JSON variant designed to use fewer tokens while remaining easy to read and write.

## Installation

### npm / pnpm / yarn

```sh
npm i --save @creationix/jot
```

### CommonJS

```js
const { parse, stringify } = require("@creationix/jot");
```

### ES Modules

```js
import { parse, stringify } from "@creationix/jot";
```

### Browser

Copy [dist/jot.js](dist/jot.js) to your project and import as a native ES module:

```html
<script type="module">
  import { parse, stringify } from "./jot.js";
</script>
```

### TypeScript

TypeScript definitions are included. You can also import [src/jot.ts](src/jot.ts) directly into your project.

## Usage

```js
import { parse, stringify } from "@creationix/jot";

// Parse Jot to JavaScript
const data = parse("{name:Alice,scores:[98,87,92]}");
// { name: "Alice", scores: [98, 87, 92] }

// Stringify JavaScript to Jot
const jot = stringify({ name: "Bob", active: true });
// {name:Bob,active:true}

// Pretty print with options
const pretty = stringify(data, { pretty: true, indent: "  " });
```

## Syntax

It is JSON with three optimizations:

1. **Unquoted strings** — Strings are only quoted if necessary.
2. **Key folding** — Single-key nested objects collapse: `{a:{b:1}}` → `{a.b:1}`
   if normal keys contain dots, keep quotes: `{"a.b":1}`
3. **Tables** — Object arrays with repeating schemas use `{{:cols;row;row}}` syntax

```jot
{
  context: {
    task: Our favorite hikes together,
    location: Boulder,
    season: spring_2025
  },
  friends: [ ana, luis, sam ],
  hikes: {{
    :id, name, distanceKm, elevationGain, companion, wasSunny
      1, Blue Lake Trail, 7.5, 320, ana, true
      2, Ridge Overlook, 9.2, 540, luis, false
      3, Wildflower Loop, 5.1, 180, sam, true
  }}
}
```

### Unquoted Strings

The only times that you need to quote a string are:

- It is a valid JSON value (`true`, `false`, `null`, or a number like `42`, `3.14`, `-0.5`, or `1e10`)
- It contains special characters: `: ; , { } [ ] "` or control characters (newline, tab, etc)
- It is empty or has leading or trailing whitespace
- It is being used as a key in an object and contains `.` (to distinguish from folded keys)

```json
{"name":"Alice","city":"New York","count":"42"}
```

```jot
{name:Alice,city:New York,count:"42"}
```

## Key Folding

When a nested object has exactly ONE key, fold it:

```json
{"server":{"host":"localhost"}}
```

```jot
{server.host:localhost}
```

If normal keys contain dots, keep quotes to avoid confusion:

```json
{"data.point":{"x":10,"y":20}}
```

```jot
{"data.point":{x:10,y:20}}
```

### Tables

One common shape in data is a table — an array of multiple objects with the same schema.

Object arrays use `{{:schema;row;row;...}}` when schemas repeat. Start with `:` followed by column names:

Don't use tables when there's no schema reuse (each object unique) — regular arrays are more compact.

```json
[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]
```

```jot
{{:id,name;1,Alice;2,Bob}}
```

To change schema mid-table, add another `:schema;` row:

```json
[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},{"x":10,"y":20},{"x":30,"y":40}]
```

```jot
{{:id,name;1,Alice;2,Bob;:x,y;10,20;30,40}}
```
