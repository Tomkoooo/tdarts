import type { PlayerHonor } from "@/interface/player.interface";

export type HonorCategory = "special" | "rank" | "tournament";

export type HonorGroup = {
  category: HonorCategory;
  honors: PlayerHonor[];
};

const CATEGORY_ORDER: HonorCategory[] = ["special", "rank", "tournament"];

function normalizeCategory(type: PlayerHonor["type"] | string | undefined): HonorCategory {
  if (type === "special" || type === "rank" || type === "tournament") return type;
  return "tournament";
}

export function sortAndGroupHonors(input: PlayerHonor[] | undefined | null): HonorGroup[] {
  const honors = Array.isArray(input) ? input : [];
  const grouped = new Map<HonorCategory, PlayerHonor[]>();

  CATEGORY_ORDER.forEach((category) => grouped.set(category, []));

  for (const honor of honors) {
    grouped.get(normalizeCategory(honor?.type))?.push(honor);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => {
      const yearDiff = Number(b?.year || 0) - Number(a?.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return String(a?.title || "").localeCompare(String(b?.title || ""));
    });
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    honors: grouped.get(category) || [],
  }));
}

export function sortHonorsByPriority(input: PlayerHonor[] | undefined | null): PlayerHonor[] {
  return sortAndGroupHonors(input).flatMap((group) => group.honors);
}
