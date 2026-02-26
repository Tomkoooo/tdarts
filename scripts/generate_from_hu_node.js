#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const translate = require("@vitalets/google-translate-api");

const root = process.cwd();
const huPath = path.join(root, "messages", "hu.json");
const enPath = path.join(root, "messages", "en.json");
const dePath = path.join(root, "messages", "de.json");

const PLACEHOLDER_RE = /\{[^{}]+\}/g;
const ENTITY_RE = /&[a-zA-Z0-9#]+;/g;

function collectStrings(node, out) {
  if (typeof node === "string") {
    out.add(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const v of Object.values(node)) collectStrings(v, out);
  }
}

function mapObject(node, mapper) {
  if (typeof node === "string") return mapper(node);
  if (Array.isArray(node)) return node.map((v) => mapObject(v, mapper));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = mapObject(v, mapper);
    return out;
  }
  return node;
}

function protectTokens(text) {
  const tokens = {};
  let idx = 0;
  const replace = (re, prefix, input) =>
    input.replace(re, (m) => {
      const t = `__${prefix}_${idx++}__`;
      tokens[t] = m;
      return t;
    });

  let out = text;
  out = replace(PLACEHOLDER_RE, "PH", out);
  out = replace(ENTITY_RE, "ENT", out);
  return { text: out, tokens };
}

function restoreTokens(text, tokens) {
  let out = text;
  for (const [k, v] of Object.entries(tokens)) out = out.split(k).join(v);
  return out;
}

async function translateWithRetry(text, to, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await translate(text, { from: "hu", to });
      return res.text;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

async function buildMap(uniqueStrings, to) {
  const map = new Map();
  const arr = Array.from(uniqueStrings);

  for (let i = 0; i < arr.length; i++) {
    const src = arr[i];
    if (src === "") {
      map.set(src, src);
      continue;
    }

    const { text: protectedText, tokens } = protectTokens(src);
    let translated = protectedText;
    try {
      translated = await translateWithRetry(protectedText, to);
    } catch (_) {
      translated = protectedText;
    }
    map.set(src, restoreTokens(translated, tokens));

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`[${to}] ${i + 1}/${arr.length}\n`);
    }
  }
  return map;
}

function keySet(obj, prefix = "", out = new Set()) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) keySet(v, p, out);
      else out.add(p);
    }
  }
  return out;
}

async function main() {
  const hu = JSON.parse(fs.readFileSync(huPath, "utf8"));
  const uniq = new Set();
  collectStrings(hu, uniq);
  console.log(`Unique source strings: ${uniq.size}`);

  const enMap = await buildMap(uniq, "en");
  const deMap = await buildMap(uniq, "de");

  const en = mapObject(hu, (s) => enMap.get(s) ?? s);
  const de = mapObject(hu, (s) => deMap.get(s) ?? s);

  fs.writeFileSync(enPath, JSON.stringify(en, null, 4) + "\n", "utf8");
  fs.writeFileSync(dePath, JSON.stringify(de, null, 4) + "\n", "utf8");

  const huKeys = keySet(hu);
  const enKeys = keySet(en);
  const deKeys = keySet(de);
  console.log(`hu keys: ${huKeys.size}, en keys: ${enKeys.size}, de keys: ${deKeys.size}`);
  console.log(`Wrote: ${enPath}`);
  console.log(`Wrote: ${dePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
