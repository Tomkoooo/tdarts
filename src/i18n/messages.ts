import path from "node:path";
import { readFile } from "node:fs/promises";

export function pickMessageNamespaces(
  messages: Record<string, unknown>,
  namespaces?: string[]
) {
  if (!Array.isArray(namespaces) || namespaces.length === 0) {
    return messages;
  }

  return namespaces.reduce<Record<string, unknown>>((acc, key) => {
    if (key in messages) {
      acc[key] = messages[key];
    }
    return acc;
  }, {});
}

export async function loadLocaleMessages(
  locale: string,
  options?: {
    namespaces?: string[];
    locales?: string[];
    defaultLocale?: string;
  }
) {
  const fallbackLocale = options?.defaultLocale || "en";
  const locales = options?.locales || [];
  const resolvedLocale = locales.includes(locale as any)
    ? locale
    : fallbackLocale;
  const namespaces = options?.namespaces;
  const cacheKey = `${resolvedLocale}:${(namespaces || []).join(",")}`;

  if ((globalThis as any).__tdartsLocaleMessages?.[cacheKey]) {
    return (globalThis as any).__tdartsLocaleMessages[cacheKey] as Record<
      string,
      unknown
    >;
  }

  const filePath = path.join(process.cwd(), "messages", `${resolvedLocale}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const scopedMessages = pickMessageNamespaces(parsed, namespaces);

  if (!(globalThis as any).__tdartsLocaleMessages) {
    (globalThis as any).__tdartsLocaleMessages = {};
  }
  (globalThis as any).__tdartsLocaleMessages[cacheKey] = scopedMessages;
  return scopedMessages;
}
