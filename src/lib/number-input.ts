export type NumericEditableValue = number | "";
export type NumericParseMode = "int" | "float";
export type NumericBlurMode = "none" | "zero" | "min";

interface NormalizeNumericDraftOptions {
  parseMode?: NumericParseMode;
  blurMode?: NumericBlurMode;
  min?: number;
}

export function parseNumericInput(rawValue: string, parseMode: NumericParseMode = "int"): NumericEditableValue {
  if (rawValue === "") return "";

  const parsed =
    parseMode === "float" ? Number.parseFloat(rawValue) : Number.parseInt(rawValue, 10);

  return Number.isFinite(parsed) ? parsed : "";
}

export function coerceNumericValue(value: NumericEditableValue, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeNumericDraft(
  rawValue: string,
  options: NormalizeNumericDraftOptions = {}
): { draftValue: string; parsedValue: NumericEditableValue } {
  const parseMode = options.parseMode ?? "int";
  const blurMode = options.blurMode ?? "none";
  const minValue = options.min;

  const parsed = parseNumericInput(rawValue, parseMode);

  if (blurMode === "none") {
    return { draftValue: rawValue, parsedValue: parsed };
  }

  if (parsed === "") {
    if (blurMode === "zero") {
      const fallback = typeof minValue === "number" && minValue > 0 ? minValue : 0;
      return { draftValue: String(fallback), parsedValue: fallback };
    }
    if (blurMode === "min" && typeof minValue === "number") {
      return { draftValue: String(minValue), parsedValue: minValue };
    }
    return { draftValue: "", parsedValue: "" };
  }

  if (typeof minValue === "number" && parsed < minValue) {
    return { draftValue: String(minValue), parsedValue: minValue };
  }

  return { draftValue: String(parsed), parsedValue: parsed };
}
