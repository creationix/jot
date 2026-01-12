import { readdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const { countTokens } = require("@anthropic-ai/tokenizer")

const samplesDir = new URL(".", import.meta.url).pathname
const readmePath = join(samplesDir, "..", "README.md")
const fullReportPath = join(samplesDir, "..", "TOKEN_SAVINGS.md")

interface SampleStats {
  name: string
  jsonTokens: number
  jotTokens: number
  jsonBytes: number
  jotBytes: number
  tokenSavings: number
  byteSavings: number
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

  const jsonTokens = countTokens(jsonContent)
  const jotTokens = countTokens(jotContent)
  const jsonBytes = Buffer.byteLength(jsonContent, "utf-8")
  const jotBytes = Buffer.byteLength(jotContent, "utf-8")

  return {
    name,
    jsonTokens,
    jotTokens,
    jsonBytes,
    jotBytes,
    tokenSavings: Math.round((1 - jotTokens / jsonTokens) * 100),
    byteSavings: Math.round((1 - jotBytes / jsonBytes) * 100),
  }
}

function generateFullReport(stats: SampleStats[]): string {
  const lines: string[] = []

  const totalJsonTokens = stats.reduce((sum, s) => sum + s.jsonTokens, 0)
  const totalJotTokens = stats.reduce((sum, s) => sum + s.jotTokens, 0)
  const totalJsonBytes = stats.reduce((sum, s) => sum + s.jsonBytes, 0)
  const totalJotBytes = stats.reduce((sum, s) => sum + s.jotBytes, 0)
  const totalTokenSavings = Math.round((1 - totalJotTokens / totalJsonTokens) * 100)
  const totalByteSavings = Math.round((1 - totalJotBytes / totalJsonBytes) * 100)

  lines.push("# Token Savings Report")
  lines.push("")
  lines.push(`Measured across ${stats.length} sample files using Claude's tokenizer.`)
  lines.push("")
  lines.push(`**Total: ${totalTokenSavings}% token savings, ${totalByteSavings}% size reduction**`)
  lines.push("")
  lines.push("| Sample | JSON Tokens | Jot Tokens | Savings | JSON Bytes | Jot Bytes | Savings |")
  lines.push("|--------|-------------|------------|---------|------------|-----------|---------|")

  // Sort by token savings descending
  const sorted = [...stats].sort((a, b) => b.tokenSavings - a.tokenSavings)

  for (const s of sorted) {
    const link = `[${s.name}](samples/${s.name}.pretty.jot)`
    lines.push(
      `| ${link} | ${s.jsonTokens} | ${s.jotTokens} | ${s.tokenSavings}% | ${s.jsonBytes} | ${s.jotBytes} | ${s.byteSavings}% |`,
    )
  }

  lines.push(
    `| **Total** | **${totalJsonTokens}** | **${totalJotTokens}** | **${totalTokenSavings}%** | **${totalJsonBytes}** | **${totalJotBytes}** | **${totalByteSavings}%** |`,
  )

  return lines.join("\n")
}

function generateReadmeSummary(stats: SampleStats[]): string {
  const lines: string[] = []

  const totalJsonTokens = stats.reduce((sum, s) => sum + s.jsonTokens, 0)
  const totalJotTokens = stats.reduce((sum, s) => sum + s.jotTokens, 0)
  const totalTokenSavings = Math.round((1 - totalJotTokens / totalJsonTokens) * 100)

  // Sort by token savings descending and pick representative samples
  const sorted = [...stats].sort((a, b) => b.tokenSavings - a.tokenSavings)

  // Pick: best, good, medium, low, worst (0% or lowest)
  const highlights = [
    sorted[0], // best
    sorted[Math.floor(sorted.length * 0.25)], // good
    sorted[Math.floor(sorted.length * 0.5)], // medium
    sorted[Math.floor(sorted.length * 0.75)], // low
    sorted[sorted.length - 1], // worst
  ]

  lines.push(`Across ${stats.length} sample files, Jot averages **${totalTokenSavings}% token savings**.`)
  lines.push("")
  lines.push("| Sample | JSON | Jot | Savings |")
  lines.push("|--------|------|-----|---------|")

  for (const s of highlights) {
    const link = `[${s.name}](samples/${s.name}.pretty.jot)`
    lines.push(`| ${link} | ${s.jsonTokens} | ${s.jotTokens} | ${s.tokenSavings}% |`)
  }

  lines.push("")
  lines.push("[Full report →](TOKEN_SAVINGS.md)")

  return lines.join("\n")
}

async function updateReadme(summary: string): Promise<void> {
  const readme = await readFile(readmePath, "utf-8")
  const startMarker = "<!-- START TOKEN SAVINGS -->"
  const endMarker = "<!-- END TOKEN SAVINGS -->"

  const startIdx = readme.indexOf(startMarker)
  const endIdx = readme.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Could not find TOKEN SAVINGS markers in README.md")
  }

  const newReadme = `${readme.slice(0, startIdx + startMarker.length)}\n${summary}\n${readme.slice(endIdx)}`

  await writeFile(readmePath, newReadme, "utf-8")
}

async function main() {
  const names = await getSampleNames()
  console.log(`Found ${names.length} samples`)

  const stats: SampleStats[] = []
  for (const name of names) {
    const s = await measureSample(name)
    stats.push(s)
    console.log(`${name}: ${s.jsonTokens} → ${s.jotTokens} tokens (${s.tokenSavings}% savings)`)
  }

  // Generate and write full report
  const fullReport = generateFullReport(stats)
  await writeFile(fullReportPath, fullReport, "utf-8")
  console.log("\nWrote TOKEN_SAVINGS.md")

  // Generate and update README summary
  const summary = generateReadmeSummary(stats)
  await updateReadme(summary)
  console.log("Updated README.md with summary")
}

main().catch(console.error)
