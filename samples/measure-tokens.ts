import { readdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const { countTokens } = require("@anthropic-ai/tokenizer")

const samplesDir = new URL(".", import.meta.url).pathname
const readmePath = join(samplesDir, "..", "README.md")

interface SampleStats {
  name: string
  jsonTokens: number
  jotTokens: number
  jsonBytes: number
  jotBytes: number
}

async function getSampleNames(): Promise<string[]> {
  const files = await readdir(samplesDir)
  const names = new Set<string>()
  for (const file of files) {
    if (file.endsWith(".json") && !file.includes(".pretty.")) {
      names.add(file.replace(".json", ""))
    }
  }
  return [...names].sort()
}

async function measureSample(name: string): Promise<SampleStats> {
  const jsonPath = join(samplesDir, `${name}.json`)
  const jotPath = join(samplesDir, `${name}.jot`)

  const jsonContent = await readFile(jsonPath, "utf-8")
  const jotContent = await readFile(jotPath, "utf-8")

  return {
    name,
    jsonTokens: countTokens(jsonContent),
    jotTokens: countTokens(jotContent),
    jsonBytes: Buffer.byteLength(jsonContent, "utf-8"),
    jotBytes: Buffer.byteLength(jotContent, "utf-8"),
  }
}

function generateTable(stats: SampleStats[]): string {
  const lines: string[] = []

  lines.push("| Sample | JSON Tokens | Jot Tokens | Savings | JSON Bytes | Jot Bytes | Savings |")
  lines.push("|--------|-------------|------------|---------|------------|-----------|---------|")

  let totalJsonTokens = 0
  let totalJotTokens = 0
  let totalJsonBytes = 0
  let totalJotBytes = 0

  for (const s of stats) {
    const tokenSavings = ((1 - s.jotTokens / s.jsonTokens) * 100).toFixed(0)
    const byteSavings = ((1 - s.jotBytes / s.jsonBytes) * 100).toFixed(0)
    const link = `[${s.name}](samples/${s.name}.pretty.jot)`
    lines.push(
      `| ${link} | ${s.jsonTokens} | ${s.jotTokens} | ${tokenSavings}% | ${s.jsonBytes} | ${s.jotBytes} | ${byteSavings}% |`,
    )
    totalJsonTokens += s.jsonTokens
    totalJotTokens += s.jotTokens
    totalJsonBytes += s.jsonBytes
    totalJotBytes += s.jotBytes
  }

  const totalTokenSavings = ((1 - totalJotTokens / totalJsonTokens) * 100).toFixed(0)
  const totalByteSavings = ((1 - totalJotBytes / totalJsonBytes) * 100).toFixed(0)
  lines.push(
    `| **Total** | **${totalJsonTokens}** | **${totalJotTokens}** | **${totalTokenSavings}%** | **${totalJsonBytes}** | **${totalJotBytes}** | **${totalByteSavings}%** |`,
  )

  return lines.join("\n")
}

async function updateReadme(table: string): Promise<void> {
  const readme = await readFile(readmePath, "utf-8")
  const startMarker = "<!-- START TOKEN SAVINGS -->"
  const endMarker = "<!-- END TOKEN SAVINGS -->"

  const startIdx = readme.indexOf(startMarker)
  const endIdx = readme.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Could not find TOKEN SAVINGS markers in README.md")
  }

  const newReadme = readme.slice(0, startIdx + startMarker.length) + "\n" + table + "\n" + readme.slice(endIdx)

  await writeFile(readmePath, newReadme, "utf-8")
}

async function main() {
  const names = await getSampleNames()
  console.log(`Found ${names.length} samples`)

  const stats: SampleStats[] = []
  for (const name of names) {
    const s = await measureSample(name)
    stats.push(s)
    const savings = ((1 - s.jotTokens / s.jsonTokens) * 100).toFixed(0)
    console.log(`${name}: ${s.jsonTokens} → ${s.jotTokens} tokens (${savings}% savings)`)
  }

  const table = generateTable(stats)
  await updateReadme(table)
  console.log("\nUpdated README.md with token savings table")
}

main().catch(console.error)
