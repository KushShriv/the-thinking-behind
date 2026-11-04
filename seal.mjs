#!/usr/bin/env node
// Adds entries to the sealed lists. It prints counts only, never an entry.
// Usage: node seal.mjs <entries.json> [--out <sealed.js>]
//
// entries.json is an array of:
//   Classic: { "mode": "classic", "thing": "...", "story": "...", "question": "...",
//              "sources": [{ "title": "...", "url": "https://..." }] }
//   Arcade:  { "mode": "arcade", "thing": "...", "question": "...", "answer": "...",
//              "sources": [{ "title": "...", "url": "https://..." }] }
//
// New entries go at the end. Existing entries must keep their position, because
// the page records opened files by position.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Must match KEY in app.js.
const KEY = Buffer.from('the-thinking-behind')
const HEADER = '// The sealed lists. Do not read or edit this by hand. Add entries with seal.mjs.\n'
const NEEDS = { classic: ['thing', 'story', 'question'], arcade: ['thing', 'question', 'answer'] }

const xor = (bytes) => Buffer.from(bytes.map((b, i) => b ^ KEY[i % KEY.length]))
const seal = (entry) => xor(Buffer.from(JSON.stringify(entry))).toString('base64')
const unseal = (text) => JSON.parse(xor(Buffer.from(text, 'base64')).toString())
const normal = (text) => text.toLowerCase().replace(/\W+/g, ' ').trim()

function fail(message) {
  console.error(message)
  process.exit(1)
}

function problem(entry) {
  const needs = NEEDS[entry?.mode]
  if (!needs) return 'its mode must be classic or arcade'
  for (const field of needs) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) return `it has no ${field}`
  }
  if (!Array.isArray(entry.sources) || entry.sources.length === 0) return 'it has no sources'
  for (const source of entry.sources) {
    if (typeof source?.title !== 'string' || !source.title.trim()) return 'a source has no title'
    if (!/^https?:\/\/\S+$/.test(source?.url ?? '')) return 'a source has no valid URL'
  }
  return null
}

const args = process.argv.slice(2)
const outFlag = args.indexOf('--out')
const out = outFlag >= 0 ? args[outFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), 'sealed.js')
const input = args.find((arg, i) => outFlag < 0 || (i !== outFlag && i !== outFlag + 1))
if (!input || !out) fail('Usage: node seal.mjs <entries.json> [--out <sealed.js>]')

let entries
try {
  entries = JSON.parse(readFileSync(input, 'utf8'))
} catch (error) {
  fail(`Cannot read ${input}: ${error.message}`)
}
if (!Array.isArray(entries)) fail('The input must be a JSON array.')

const match = readFileSync(out, 'utf8').match(/window\.TTB_SEALED = (\{[\s\S]*\});/)
if (!match) fail(`${out} is not a sealed list.`)
const lists = JSON.parse(match[1])
const seen = new Set([...lists.classic, ...lists.arcade].map((text) => normal(unseal(text).question)))

// Every entry is checked first, so a bad file changes nothing.
for (const [i, entry] of entries.entries()) {
  const reason = problem(entry)
  if (reason) fail(`Entry ${i + 1} was not sealed: ${reason}. Nothing was changed.`)
}

let skipped = 0
for (const { mode, ...entry } of entries) {
  const key = normal(entry.question)
  if (seen.has(key)) {
    skipped += 1
    continue
  }
  seen.add(key)
  lists[mode].push(seal(entry))
}

writeFileSync(out, `${HEADER}window.TTB_SEALED = ${JSON.stringify(lists, null, 2)};\n`)
console.log(`Sealed ${entries.length - skipped} new, skipped ${skipped} duplicates. Classic ${lists.classic.length}, Arcade ${lists.arcade.length}.`)
