# Jot Format

Jot is a compact, human-readable JSON variant that uses fewer tokens for LLM applications.

**JSON:**

```json
{"context":{"task":"Our favorite hikes together","location":"Boulder"},"friends":["ana","luis","sam"],"hikes":[{"id":1,"name":"Blue Lake Trail","km":7.5},{"id":2,"name":"Ridge Overlook","km":9.2}]}
```

**Jot:**

```jot
{context:{task:Our favorite hikes together,location:Boulder},friends:[ana,luis,sam],hikes:{{:id,name,km;1,Blue Lake Trail,7.5;2,Ridge Overlook,9.2}}}
```

Same data, 26% fewer tokens, still readable.

## Why Jot?

- **Save on LLM costs** — Fewer tokens = lower API bills
- **Fit more in context** — Get more data into your prompts
- **Human readable** — Unlike binary formats, you can read and write it directly
- **JSON compatible** — Parses to the same JavaScript objects

## Token Savings

<!-- START TOKEN SAVINGS -->
Across 18 sample files, Jot averages **13% token savings**.

| Sample | JSON | Jot | Savings |
|--------|------|-----|---------|
| [users-50](samples/users-50.pretty.jot) | 1327 | 837 | 37% |
| [products](samples/products.pretty.jot) | 772 | 613 | 21% |
| [large](samples/large.pretty.jot) | 240 | 221 | 8% |
| [small](samples/small.pretty.jot) | 37 | 36 | 3% |
| [irregular](samples/irregular.pretty.jot) | 49 | 49 | 0% |

[Full report →](TOKEN_SAVINGS.md)
<!-- END TOKEN SAVINGS -->

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

Jot is JSON with three optimizations:

1. **Unquoted strings** — Strings are only quoted if necessary
2. **Key folding** — Single-key nested objects collapse: `{a:{b:1}}` → `{a.b:1}`
3. **Tables** — Arrays of objects with the same schema use `{{:cols;row;row}}` syntax

Here's a complete example showing all three:

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

Quote a string only when:

- It's a reserved value (`true`, `false`, `null`) or a number (`42`, `3.14`, `-0.5`, `1e10`)
- It contains special characters: `: ; , { } [ ] "` or control characters
- It's empty or has leading/trailing whitespace
- It's a key containing `.` (to distinguish from folded keys)

```json
{"name":"Alice","city":"New York","count":"42"}
```

```jot
{name:Alice,city:New York,count:"42"}
```

### Key Folding

When a nested object has exactly one key, fold it:

```json
{"server":{"host":"localhost"}}
```

```jot
{server.host:localhost}
```

If a key itself contains dots, quote it to avoid confusion:

```json
{"data.point":{"x":10,"y":20}}
```

```jot
{"data.point":{x:10,y:20}}
```

### Tables

Arrays of objects with repeating schemas become tables. Start with `:` followed by column names:

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

Don't use tables when there's no schema reuse — regular arrays are more compact.
