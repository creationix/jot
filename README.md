# Jot Format

Jot is a compact, LLM friendly JSON variant designed to use fewer tokens while remaining easy to read and write.

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

It is JSON with three optimizations:

1. **Unquoted strings** — Strings are only quoted if necessary.
2. **Key folding** — Single-key nested objects collapse: `{a:{b:1}}` → `{a.b:1}`
   if normal keys contain dots, keep quotes: `{"a.b":1}`
3. **Tables** — Object arrays with repeating schemas use `{{:cols;row;row}}` syntax

## Unquoted Strings

The only times that you need to quote a string are:

- It is a valid JSON value (`true`, `false`, `null`, or a number like `42`, `3.14`, `-0.5`, or `1e10`)
- It contains special characters: `: ; , { } [ ] "` or control characters (newline, tab, etc)
- It is empty or has leading or trailing whitespace
- It being used as a key in an object and contains `.` (to distinguish from folded keys)

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

## Tables

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
