#!/usr/bin/env python3
import json
import re
import time
from pathlib import Path
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
HU_PATH = ROOT / "messages" / "hu.json"
EN_PATH = ROOT / "messages" / "en.json"

PLACEHOLDER_RE = re.compile(r"\{[^{}]+\}")
ENTITY_RE = re.compile(r"&[a-zA-Z0-9#]+;")


def collect_strings(node, out):
    if isinstance(node, dict):
        for v in node.values():
            collect_strings(v, out)
    elif isinstance(node, list):
        for v in node:
            collect_strings(v, out)
    elif isinstance(node, str):
        out.add(node)


def protect(text):
    tokens = {}
    idx = 0

    def rep_ph(m):
        nonlocal idx
        t = f"__PH_{idx}__"
        tokens[t] = m.group(0)
        idx += 1
        return t

    def rep_ent(m):
        nonlocal idx
        t = f"__ENT_{idx}__"
        tokens[t] = m.group(0)
        idx += 1
        return t

    text = PLACEHOLDER_RE.sub(rep_ph, text)
    text = ENTITY_RE.sub(rep_ent, text)
    return text, tokens


def unprotect(text, tokens):
    for t, v in tokens.items():
        text = text.replace(t, v)
    return text


def translate_map(strings):
    translator = GoogleTranslator(source="hu", target="en")
    out = {}
    items = sorted(strings)
    total = len(items)

    for i, s in enumerate(items, 1):
        if s == "":
            out[s] = s
            continue
        p, tokens = protect(s)
        translated = None
        for _ in range(3):
            try:
                translated = translator.translate(p)
                break
            except Exception:
                time.sleep(0.4)
        if translated is None:
            translated = p
        out[s] = unprotect(translated, tokens)
        if i % 150 == 0:
            print(f"[en] {i}/{total}", flush=True)
    return out


def map_obj(node, tr):
    if isinstance(node, dict):
        return {k: map_obj(v, tr) for k, v in node.items()}
    if isinstance(node, list):
        return [map_obj(v, tr) for v in node]
    if isinstance(node, str):
        return tr.get(node, node)
    return node


def main():
    hu = json.loads(HU_PATH.read_text(encoding="utf-8"))
    uniq = set()
    collect_strings(hu, uniq)
    print(f"Found {len(uniq)} unique HU strings", flush=True)
    tr = translate_map(uniq)
    en = map_obj(hu, tr)
    EN_PATH.write_text(json.dumps(en, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    print(f"Wrote {EN_PATH}", flush=True)


if __name__ == "__main__":
    main()
