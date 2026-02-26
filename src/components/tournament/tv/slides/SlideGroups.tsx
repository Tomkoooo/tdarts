import { GroupDisplay } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideGroupsProps {
  groups: GroupDisplay[];
  title: string;
  emptyLabel: string;
}

export default function SlideGroups({ groups, title, emptyLabel }: SlideGroupsProps) {
  return (
    <SlideFrame title={title} accentClassName="from-info/20 to-background">
      {groups.length === 0 ? (
        <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-3 gap-4 overflow-y-auto pr-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-muted/20 bg-background/40 p-4">
              <div className="mb-3 flex items-end justify-between border-b border-muted/20 pb-2">
                <h3 className="text-3xl font-black text-primary">{group.label}</h3>
                <span className="text-lg text-muted-foreground">Board {group.boardNumber}</span>
              </div>
              <div className="space-y-2">
                {group.rows.map((row) => (
                  <div key={row.playerId} className="flex items-center justify-between rounded-lg bg-muted/15 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-2xl font-black text-primary">{row.standing}.</span>
                      <span className="truncate text-xl font-semibold">{row.name}</span>
                    </div>
                    <span className="text-xl font-bold text-muted-foreground">
                      {row.points}p {row.legs > 0 ? `(${row.legs})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}
