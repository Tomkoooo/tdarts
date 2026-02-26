#!/usr/bin/env python3
import json
import re
import sys
import time
from pathlib import Path

try:
    from deep_translator import GoogleTranslator
except Exception:
    print("MISSING_DEPENDENCY: deep-translator", file=sys.stderr)
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1]
HU_PATH = ROOT / "messages" / "hu.json"
EN_PATH = ROOT / "messages" / "en.json"
DE_PATH = ROOT / "messages" / "de.json"

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


def replace_with_tokens(text):
    tokens = {}
    idx = 0

    def repl_placeholder(match):
        nonlocal idx
        token = f"__PH_{idx}__"
        tokens[token] = match.group(0)
        idx += 1
        return token

    def repl_entity(match):
        nonlocal idx
        token = f"__ENT_{idx}__"
        tokens[token] = match.group(0)
        idx += 1
        return token

    text = PLACEHOLDER_RE.sub(repl_placeholder, text)
    text = ENTITY_RE.sub(repl_entity, text)
    return text, tokens


def restore_tokens(text, tokens):
    for token, original in tokens.items():
        text = text.replace(token, original)
    return text


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def translate_unique_strings(strings, target_lang):
    translator = GoogleTranslator(source="hu", target=target_lang)
    cache = {}
    protected = []

    for s in strings:
        # Keep empty strings as-is
        if s == "":
            cache[s] = s
            continue
        p_text, tokens = replace_with_tokens(s)
        protected.append((s, p_text, tokens))

    # Dedupe protected payloads too
    payload_map = {}
    for original, payload, tokens in protected:
        payload_map.setdefault(payload, []).append((original, tokens))

    payloads = list(payload_map.keys())

    for batch_idx, batch in enumerate(chunked(payloads, 25), start=1):
        try:
            translated_batch = translator.translate_batch(batch)
            if not isinstance(translated_batch, list):
                translated_batch = [translated_batch]
            if len(translated_batch) != len(batch):
                raise RuntimeError("Batch size mismatch")
        except Exception:
            translated_batch = []
            for item in batch:
                translated = None
                for _ in range(3):
                    try:
                        translated = translator.translate(item)
                        break
                    except Exception:
                        time.sleep(0.5)
                if translated is None:
                    translated = item
                translated_batch.append(translated)

        for src_payload, dst_payload in zip(batch, translated_batch):
            # Apply translation back to all originals that shared this payload
            for original, tokens in payload_map[src_payload]:
                restored = restore_tokens(dst_payload, tokens)
                cache[original] = restored

        if batch_idx % 10 == 0:
            print(f"[{target_lang}] translated {min(batch_idx * 25, len(payloads))}/{len(payloads)}")

    return cache


def apply_translation(node, tr_map):
    if isinstance(node, dict):
        return {k: apply_translation(v, tr_map) for k, v in node.items()}
    if isinstance(node, list):
        return [apply_translation(v, tr_map) for v in node]
    if isinstance(node, str):
        return tr_map.get(node, node)
    return node


def main():
    if not HU_PATH.exists():
        raise FileNotFoundError(f"Missing source file: {HU_PATH}")

    hu_data = json.loads(HU_PATH.read_text(encoding="utf-8"))

    unique_strings = set()
    collect_strings(hu_data, unique_strings)
    print(f"Found {len(unique_strings)} unique HU strings")

    en_map = translate_unique_strings(sorted(unique_strings), "en")
    de_map = translate_unique_strings(sorted(unique_strings), "de")

    en_data = apply_translation(hu_data, en_map)
    de_data = apply_translation(hu_data, de_map)

    EN_PATH.write_text(json.dumps(en_data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    DE_PATH.write_text(json.dumps(de_data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")

    print(f"Wrote: {EN_PATH}")
    print(f"Wrote: {DE_PATH}")


if __name__ == "__main__":
    main()
