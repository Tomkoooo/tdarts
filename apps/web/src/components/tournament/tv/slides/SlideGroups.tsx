import { GroupDisplay } from "@/lib/tv/slideshow";
import SlideFrame from "./SlideFrame";

interface SlideGroupsProps {
  groups: GroupDisplay[];
  title: string;
  emptyLabel: string;
}

export default function SlideGroups({ groups, title, emptyLabel }: SlideGroupsProps) {
  return (
    <SlideFrame title={title} accentClassName="from-cyan-400/30 via-transparent to-transparent">
      {groups.length === 0 ? (
        <div className="flex h-full items-center justify-center px-3 text-center text-lg text-slate-300 sm:text-2xl md:text-3xl">{emptyLabel}</div>
      ) : (
        <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-cyan-300/30 bg-slate-900/70 p-3 sm:p-4">
              <div className="mb-3 flex items-end justify-between border-b border-slate-700/50 pb-2">
                <h3 className="text-2xl font-black text-cyan-200 sm:text-3xl">{group.label}</h3>
                <span className="text-xs text-slate-300 sm:text-sm md:text-base">Board {group.boardNumber}</span>
              </div>
              <div className="space-y-2">
                {group.rows.map((row, index) => (
                  <div
                    key={row.playerId}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${index === 0 ? "border border-cyan-200/40 bg-cyan-400/15" : "bg-slate-800/70"}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-10 text-3xl font-black text-cyan-200 sm:text-4xl">{row.standing}</span>
                      <span className="truncate text-base font-semibold text-slate-100 sm:text-lg md:text-xl">{row.name}</span>
                    </div>
                    <span className="whitespace-nowrap text-lg font-black text-cyan-100 sm:text-xl md:text-2xl">
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
