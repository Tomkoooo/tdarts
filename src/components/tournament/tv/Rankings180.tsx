import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { IconTarget } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

interface Rankings180Props {
  tournament: any
}

export default function Rankings180({ tournament }: Rankings180Props) {
  const t = useTranslations("Tournament.tv_views.rankings_180")
  // Extract and sort players by 180 count
  const rankings = tournament.tournamentPlayers
    ?.map((tp: any) => ({
      name: tp.playerReference?.name || t('unknown'),
      count: tp.stats?.oneEightiesCount || 0,
    }))
    .filter((p: any) => p.count > 0)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10) || []

  return (
    <Card className="h-full bg-card/80 overflow-hidden shadow-none">
      <CardHeader className="pb-2 bg-muted/5">
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <IconTarget className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto h-[calc(100%-3.5rem)] p-2">
        {rankings.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-base">{t("no_data")}</p>
        ) : (
          <div className="space-y-1.5">
            {rankings.map((player: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/10"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${
                    index === 0 ? 'text-primary' :
                    index === 1 ? 'text-muted-foreground' :
                    index === 2 ? 'text-warning' :
                    'text-muted-foreground/60'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="text-base font-medium text-foreground truncate">{player.name}</span>
                </div>
                <span className="text-2xl font-bold text-primary">{player.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
