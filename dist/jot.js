// Starts with whitespace, ends with whitespace, is empty, is true/false/null, or contains special characters
const UNSAFE_REGEX = /(^\s|\s$|^$|^true$|^false$|^null$|[:\,{}\[\];"\\])/
const UNSAFE_KEY_REGEX = /(^\s|\s$|^$|^true$|^false$|^null$|[.:\,{}\[\];"\\])/
const WS_RE = /\s/
const KEY_TERM_RE = /[:\,{}\[\];]|\s/
const needsQuotes = (s) => !Number.isNaN(Number(s)) || UNSAFE_REGEX.test(s)
const keyNeedsQuotes = (s) => !Number.isNaN(Number(s)) || UNSAFE_KEY_REGEX.test(s)
const quote = (s) => (needsQuotes(s) ? JSON.stringify(s) : s)
const quoteKey = (s) => (keyNeedsQuotes(s) ? JSON.stringify(s) : s)
function getFoldPath(value) {
  const path = []
  let current = value
  while (current !== null && typeof current === "object" && !Array.isArray(current)) {
    const keys = Object.keys(current)
    if (keys.length !== 1 || keys[0].includes(".")) {
      break
    }
    path.push(keys[0])
    current = current[keys[0]]
  }
  return path.length > 0 ? { path, leaf: current } : null
}
function groupBySchema(arr) {
  const groups = []
  for (const obj of arr) {
    const keys = Object.keys(obj)
    const last = groups.at(-1)
    if (last && last.keys.join(",") === keys.join(",")) {
      last.objects.push(obj)
    } else {
      groups.push({ keys, objects: [obj] })
    }
  }
  return groups
}
let opts = {}
let depth = 0
const ind = () => (opts.pretty ? (opts.indent ?? "  ").repeat(depth) : "")
function stringifyValue(value, atLineStart = false) {
  if (value === null) {
    return "null"
  }
  if (typeof value === "boolean") {
    return String(value)
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (typeof value === "string") {
    return quote(value)
  }
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (typeof value === "object") {
    return stringifyObject(value, atLineStart)
  }
  return String(value)
}
function stringifyArray(arr) {
  const isTable = arr.length >= 2 && arr.every((i) => i !== null && typeof i === "object" && !Array.isArray(i))
  if (isTable) {
    const groups = groupBySchema(arr)
    if (groups.some((g) => g.objects.length >= 2)) {
      return stringifyTable(groups)
    }
  }
  if (arr.length === 1) {
    return `[${stringifyValue(arr[0])}]`
  }
  const hasComplex = arr.some((i) => i !== null && typeof i === "object")
  if (opts.pretty && arr.length > 0 && hasComplex) {
    depth++
    const items = arr.map((i) => `${ind()}${stringifyValue(i, true)}`)
    depth--
    return `[\n${items.join(",\n")}\n${ind()}]`
  }
  const sep = opts.pretty ? ", " : ","
  const items = arr.map((v) => stringifyValue(v)).join(sep)
  return opts.pretty ? `[ ${items} ]` : `[${items}]`
}
function stringifyTable(groups) {
  const sep = opts.pretty ? ", " : ","
  if (opts.pretty) {
    depth++
    const schemaInd = ind()
    depth++
    const dataInd = ind()
    const rows = []
    for (const { keys, objects } of groups) {
      rows.push(`${schemaInd}:${keys.map((k) => quoteKey(k)).join(sep)}`)
      for (const obj of objects) rows.push(`${dataInd}${keys.map((k) => stringifyValue(obj[k])).join(sep)}`)
    }
    depth -= 2
    return `{{\n${rows.join("\n")}\n${ind()}}}`
  }
  const parts = []
  for (const { keys, objects } of groups) {
    parts.push(`:${keys.map((k) => quoteKey(k)).join(sep)}`)
    for (const obj of objects) {
      parts.push(keys.map((k) => stringifyValue(obj[k])).join(sep))
    }
  }
  return `{{${parts.join(";")}}}`
}
function stringifyObject(obj, atLineStart = false) {
  const keys = Object.keys(obj)
  const pair = (k, pretty) => {
    const val = obj[k]
    if (!keyNeedsQuotes(k) && val !== null && typeof val === "object" && !Array.isArray(val)) {
      const fold = getFoldPath(val)
      if (fold) {
        const foldedKey = `${k}.${fold.path.join(".")}`
        return pretty ? `${foldedKey}: ${stringifyValue(fold.leaf)}` : `${foldedKey}:${stringifyValue(fold.leaf)}`
      }
    }
    const qk = quoteKey(k)
    return pretty ? `${qk}: ${stringifyValue(val)}` : `${qk}:${stringifyValue(val)}`
  }
  if (opts.pretty && keys.length > 1) {
    depth++
    const rawPairs = keys.map((k) => pair(k, true))
    const lastMulti = rawPairs.at(-1)?.endsWith("}") || rawPairs.at(-1)?.endsWith("]")
    const compact = atLineStart && !lastMulti
    const pairs = rawPairs.map((p, i) => (i === 0 && compact ? p : `${ind()}${p}`))
    depth--
    return compact ? `{ ${pairs.join(",\n")} }` : `{\n${pairs.join(",\n")}\n${ind()}}`
  }
  if (opts.pretty && keys.length === 1) {
    return `{ ${pair(keys[0], true)} }`
  }
  return `{${keys.map((k) => pair(k, false)).join(",")}}`
}
export function stringify(data, options = {}) {
  opts = { pretty: false, indent: "  ", ...options }
  depth = 0
  return stringifyValue(data)
}
// Parser
class JotParser {
  input
  pos = 0
  constructor(input) {
    this.input = input
  }
  parse() {
    this.ws()
    const result = this.value("")
    this.ws()
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character at position ${this.pos}: '${this.input[this.pos]}'`)
    }
    return result
  }
  ws() {
    while (this.pos < this.input.length && WS_RE.test(this.input[this.pos])) this.pos++
  }
  peek = () => this.input[this.pos] || ""
  value(terminators = "") {
    this.ws()
    const ch = this.peek()
    if (ch === "{") {
      return this.input[this.pos + 1] === "{" ? this.table() : this.object()
    }
    if (ch === "[") {
      return this.array()
    }
    if (ch === '"') {
      return this.quoted()
    }
    return this.atom(terminators)
  }
  quoted() {
    this.pos++
    let result = ""
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]
      if (ch === '"') {
        this.pos++
        return result
      }
      if (ch === "\\") {
        this.pos++
        const esc = this.input[this.pos]
        const escMap = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        }
        if (esc in escMap) {
          result += escMap[esc]
        } else if (esc === "u") {
          result += String.fromCharCode(Number.parseInt(this.input.slice(this.pos + 1, this.pos + 5), 16))
          this.pos += 4
        } else {
          throw new Error(`Invalid escape sequence '\\${esc}'`)
        }
      } else {
        result += ch
      }
      this.pos++
    }
    throw new Error("Unterminated string")
  }
  parseToken(terminators) {
    const start = this.pos
    if (terminators === "") {
      const token = this.input.slice(start).trim()
      this.pos = this.input.length
      if (token === "") {
        throw new Error(`Unexpected end of input at position ${start}`)
      }
      return token
    }
    while (this.pos < this.input.length && !terminators.includes(this.input[this.pos])) {
      this.pos++
    }
    const token = this.input.slice(start, this.pos).trim()
    if (token === "") {
      throw new Error(`Unexpected character at position ${this.pos}: '${this.peek()}'`)
    }
    return token
  }
  tokenToValue(token) {
    if (token === "null") {
      return null
    }
    if (token === "true") {
      return true
    }
    if (token === "false") {
      return false
    }
    const num = Number(token)
    if (!Number.isNaN(num) && token !== "") {
      return num
    }
    return token
  }
  atom(terminators) {
    return this.tokenToValue(this.parseToken(terminators))
  }
  array() {
    this.pos++
    const result = []
    this.ws()
    while (this.peek() !== "]") {
      if (this.pos >= this.input.length) {
        throw new Error("Unterminated array")
      }
      result.push(this.value(",]"))
      this.ws()
      if (this.peek() === ",") {
        this.pos++
        this.ws()
      }
    }
    this.pos++
    return result
  }
  table() {
    this.pos += 2
    const result = []
    let schema = []
    this.ws()
    while (this.input.slice(this.pos, this.pos + 2) !== "}}") {
      if (this.pos >= this.input.length) {
        throw new Error("Unterminated table")
      }
      this.ws()
      if (this.peek() === ":") {
        this.pos++
        schema = this.schemaRow()
      } else {
        if (schema.length === 0) {
          throw new Error(`Data row without schema at position ${this.pos}`)
        }
        const values = this.dataRow(schema.length)
        const obj = {}
        for (let i = 0; i < schema.length; i++) {
          obj[schema[i]] = values[i]
        }
        result.push(obj)
      }
      this.ws()
      if (this.peek() === ";") {
        this.pos++
        this.ws()
      }
    }
    this.pos += 2
    return result
  }
  schemaRow() {
    const cols = []
    let col = ""
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]
      if ((ch === "}" && this.input[this.pos + 1] === "}") || ch === ";" || ch === "\n") {
        if (col.trim()) {
          cols.push(col.trim())
        }
        break
      }
      if (ch === ",") {
        if (col.trim()) {
          cols.push(col.trim())
        }
        col = ""
        this.pos++
        continue
      }
      col += ch
      this.pos++
    }
    return cols
  }
  dataRow(colCount) {
    const values = []
    for (let i = 0; i < colCount; i++) {
      this.ws()
      values.push(this.tableValue(i < colCount - 1 ? ",;}\n" : ";}\n"))
      this.ws()
      if (this.peek() === ",") {
        this.pos++
      }
    }
    return values
  }
  tableValue(terminators) {
    this.ws()
    const ch = this.peek()
    if (ch === '"') {
      return this.quoted()
    }
    if (ch === "{") {
      return this.input[this.pos + 1] === "{" ? this.table() : this.object()
    }
    if (ch === "[") {
      return this.array()
    }
    const start = this.pos
    while (this.pos < this.input.length) {
      const c = this.input[this.pos]
      if ((c === "}" && this.input[this.pos + 1] === "}") || terminators.includes(c)) {
        break
      }
      this.pos++
    }
    const token = this.input.slice(start, this.pos).trim()
    return token === "" ? null : this.tokenToValue(token)
  }
  object() {
    this.pos++
    const result = {}
    this.ws()
    while (this.peek() !== "}") {
      if (this.pos >= this.input.length) {
        throw new Error("Unterminated object")
      }
      const { key, quoted } = this.parseKey()
      this.ws()
      if (this.peek() !== ":") {
        throw new Error(`Expected ':' after key '${key}' at position ${this.pos}`)
      }
      this.pos++
      const value = this.value(",}")
      if (quoted) {
        result[key] = value
      } else {
        this.merge(result, this.unfold(key, value))
      }
      this.ws()
      if (this.peek() === ",") {
        this.pos++
        this.ws()
      }
    }
    this.pos++
    return result
  }
  parseKey() {
    this.ws()
    if (this.peek() === '"') {
      return { key: this.quoted(), quoted: true }
    }
    const start = this.pos
    while (this.pos < this.input.length && !KEY_TERM_RE.test(this.input[this.pos])) this.pos++
    const key = this.input.slice(start, this.pos)
    if (key === "") {
      throw new Error(`Expected key at position ${this.pos}`)
    }
    return { key, quoted: false }
  }
  unfold(keyPath, value) {
    const parts = keyPath.split(".")
    const result = {}
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      const nested = {}
      current[parts[i]] = nested
      current = nested
    }
    current[parts.at(-1)] = value
    return result
  }
  merge(target, src) {
    for (const key of Object.keys(src)) {
      const tv = target[key]
      const sv = src[key]
      if (
        key in target &&
        typeof tv === "object" &&
        tv !== null &&
        !Array.isArray(tv) &&
        typeof sv === "object" &&
        sv !== null &&
        !Array.isArray(sv)
      ) {
        this.merge(tv, sv)
      } else {
        target[key] = sv
      }
    }
  }
}
export function parse(input) {
  return new JotParser(input).parse()
}
