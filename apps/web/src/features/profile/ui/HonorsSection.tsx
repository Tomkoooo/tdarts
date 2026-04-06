"use client";

import { IconCrown, IconMedal, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import type { PlayerHonor } from "@/interface/player.interface";
import { sortAndGroupHonors, type HonorCategory } from "@/features/profile/lib/honorSorting";
import { cn } from "@/lib/utils";

type HonorsSectionText = {
  honorsSectionTitle: string;
  honorsCategorySpecial: string;
  honorsCategoryRank: string;
  honorsCategoryTournament: string;
  honorsEmptyTitle: string;
  honorsEmptySubtitle: string;
};

type HonorsSectionProps = {
  honors: PlayerHonor[];
  text: HonorsSectionText;
  className?: string;
};

const categoryMeta: Record<
  HonorCategory,
  { icon: typeof IconCrown; cardClass: string; badgeClass: string }
> = {
  special: {
    icon: IconSparkles,
    cardClass: "border-fuchsia-500/25 bg-fuchsia-500/5",
    badgeClass: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300",
  },
  rank: {
    icon: IconCrown,
    cardClass: "border-amber-500/25 bg-amber-500/5",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  },
  tournament: {
    icon: IconMedal,
    cardClass: "border-indigo-500/25 bg-indigo-500/5",
    badgeClass: "border-indigo-500/25 bg-indigo-500/10 text-indigo-300",
  },
};

function getCategoryTitle(category: HonorCategory, t: HonorsSectionText): string {
  if (category === "special") return t.honorsCategorySpecial;
  if (category === "rank") return t.honorsCategoryRank;
  return t.honorsCategoryTournament;
}

export default function HonorsSection({
  honors,
  text,
  className,
}: HonorsSectionProps) {
  const groups = sortAndGroupHonors(honors).filter((group) => group.honors.length > 0);

  if (!honors?.length) {
    return (
      <Card className={cn("border border-border/60 bg-card/40", className)}>
        <CardContent className="py-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{text.honorsSectionTitle}</h3>
          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">{text.honorsEmptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{text.honorsEmptySubtitle}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border border-border/60 bg-card/40", className)}>
      <CardContent className="py-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{text.honorsSectionTitle}</h3>

        <div className="space-y-3">
          {groups.map(({ category, honors: categoryHonors }) => {
            const meta = categoryMeta[category];
            const Icon = meta.icon;

            return (
              <section key={category} className={cn("rounded-xl border p-3", meta.cardClass)}>
                <header className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {getCategoryTitle(category, text)}
                    </h4>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-black", meta.badgeClass)}>
                    {categoryHonors.length}
                  </Badge>
                </header>

                <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  {categoryHonors.map((honor, idx) => (
                    <article
                      key={`${honor.title}-${honor.year}-${idx}`}
                      className="rounded-lg border border-border/50 bg-background/30 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{honor.title}</p>
                          {honor.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{honor.description}</p>
                          ) : null}
                        </div>
                        <Badge variant="secondary" className="shrink-0 h-5 px-2 text-[10px] font-black">
                          {honor.year}
                        </Badge>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
