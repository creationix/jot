import { describe, test, expect } from "bun:test"
import { stringify, parse } from "./jot"

describe("stringify", () => {
  test("null", () => expect(stringify(null)).toBe("null"))
  test("true", () => expect(stringify(true)).toBe("true"))
  test("false", () => expect(stringify(false)).toBe("false"))
  test("number", () => expect(stringify(42)).toBe("42"))
  test("float", () => expect(stringify(3.14)).toBe("3.14"))

  describe("strings", () => {
    test("simple string", () => expect(stringify("hello")).toBe("hello"))
    test("string with space", () => expect(stringify("hello world")).toBe("hello world"))
    test("empty string", () => expect(stringify("")).toBe('""'))
    test("numeric string", () => expect(stringify("123")).toBe('"123"'))
    test("reserved word", () => expect(stringify("true")).toBe('"true"'))
    test("contains colon", () => expect(stringify("a:b")).toBe('"a:b"'))
    test("contains semicolon", () => expect(stringify("a;b")).toBe('"a;b"'))
  })

  describe("arrays", () => {
    test("empty array", () => expect(stringify([])).toBe("[]"))
    test("simple array", () => expect(stringify([1, 2, 3])).toBe("[1,2,3]"))
    test("string array", () => expect(stringify(["a", "b"])).toBe("[a,b]"))
  })

  describe("objects", () => {
    test("empty object", () => expect(stringify({})).toBe("{}"))
    test("simple object", () => expect(stringify({ name: "Alice", age: 30 })).toBe("{name:Alice,age:30}"))
  })

  describe("key folding", () => {
    test("fold 1 level", () => expect(stringify({ a: { b: 1 } })).toBe("{a.b:1}"))
    test("fold 2 levels", () => expect(stringify({ a: { b: { c: 1 } } })).toBe("{a.b.c:1}"))
    test("no fold multi-key", () => expect(stringify({ a: { b: 1, c: 2 } })).toBe("{a:{b:1,c:2}}"))
    test("key with dot", () => expect(stringify({ "a.b": 1 })).toBe('{"a.b":1}'))
    test("key with dot nested", () => expect(stringify({ "a.b": { c: 1 } })).toBe('{"a.b":{c:1}}'))
  })

  describe("tables", () => {
    test("uniform table", () => expect(stringify([{ a: 1, b: 2 }, { a: 3, b: 4 }])).toBe("{{:a,b;1,2;3,4}}"))
    test("3-row table", () => expect(stringify([{ x: 1 }, { x: 2 }, { x: 3 }])).toBe("{{:x;1;2;3}}"))
    test("mixed schema with reuse", () => expect(stringify([{ a: 1 }, { a: 2 }, { b: 3 }])).toBe("{{:a;1;2;:b;3}}"))
    test("no reuse", () => expect(stringify([{ a: 1 }, { b: 2 }])).toBe("[{a:1},{b:2}]"))
    test("single obj", () => expect(stringify([{ a: 1 }])).toBe("[{a:1}]"))
  })
})

describe("parse", () => {
  test("null", () => expect(parse("null")).toBe(null))
  test("true", () => expect(parse("true")).toBe(true))
  test("number", () => expect(parse("42")).toBe(42))
  test("string", () => expect(parse("hello")).toBe("hello"))
  test("quoted", () => expect(parse('"hello world"')).toBe("hello world"))

  test("array", () => expect(parse("[1,2,3]")).toEqual([1, 2, 3]))
  test("object", () => expect(parse("{name:Alice,age:30}")).toEqual({ name: "Alice", age: 30 }))

  describe("key unfolding", () => {
    test("fold", () => expect(parse("{a.b:1}")).toEqual({ a: { b: 1 } }))
    test("fold deep", () => expect(parse("{a.b.c:1}")).toEqual({ a: { b: { c: 1 } } }))
    test("quoted dot key", () => expect(parse('{"a.b":1}')).toEqual({ "a.b": 1 }))
  })

  describe("tables", () => {
    test("table", () => expect(parse("{{:a,b;1,2;3,4}}")).toEqual([{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    test("schema change", () => expect(parse("{{:a;1;:b;2}}")).toEqual([{ a: 1 }, { b: 2 }]))
  })
})

describe("round-trip", () => {
  const testCases: [string, unknown][] = [
    ["null", null],
    ["true", true],
    ["false", false],
    ["number", 42],
    ["string", "hello"],
    ["empty array", []],
    ["number array", [1, 2, 3]],
    ["empty object", {}],
    ["simple object", { a: 1, b: 2 }],
    ["nested 1 level", { a: { b: 1 } }],
    ["nested 2 levels", { a: { b: { c: 1 } } }],
    ["uniform table", [{ a: 1, b: 2 }, { a: 3, b: 4 }]],
    ["mixed schema", [{ a: 1 }, { b: 2 }]],
    ["nested table", { users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] }],
    ["key with dot", { "a.b": 1 }],
    ["key with semicolon", { "x;y": "test" }],
    ["string with semicolon", "a;b"],
  ]

  for (const [name, original] of testCases) {
    test(name, () => {
      const encoded = stringify(original)
      const decoded = parse(encoded)
      expect(decoded).toEqual(original)
    })
  }
})

describe("samples", () => {
  const { readdirSync, readFileSync } = require("fs")
  const { join } = require("path")

  const samplesDir = join(__dirname, "samples")
  const jsonFiles = readdirSync(samplesDir)
    .filter((f: string) => f.endsWith(".json") && !f.includes(".pretty."))

  for (const jsonFile of jsonFiles) {
    const baseName = jsonFile.replace(".json", "")
    const jotFile = `${baseName}.jot`

    describe(baseName, () => {
      const jsonPath = join(samplesDir, jsonFile)
      const jotPath = join(samplesDir, jotFile)

      const jsonContent = readFileSync(jsonPath, "utf-8").trim()
      const expectedJot = readFileSync(jotPath, "utf-8").trim()
      const originalData = JSON.parse(jsonContent)

      test("encoding matches jot", () => {
        const encoded = stringify(originalData)
        expect(encoded).toBe(expectedJot)
      })

      test("round-trip matches json semantically", () => {
        const encoded = stringify(originalData)
        const decoded = parse(encoded)
        expect(decoded).toEqual(originalData)
      })
    })
  }
})
