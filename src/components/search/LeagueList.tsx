import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconShieldCheck, IconTrophy } from "@tabler/icons-react"
import Link from "next/link"

interface LeagueListProps {
    leagues: any[];
}

export function LeagueList({ leagues }: LeagueListProps) {
    if (!leagues || leagues.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">Nincsenek ligák</div>
    }

    return (
        <div className="grid gap-4">
            {leagues.map((league) => (
                <Card key={league._id} className="group hover:shadow-md transition-all border-base-200">
                    <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg">{league.name}</h3>
                                    {league.verified && (
                                        <IconShieldCheck className="w-5 h-5 text-blue-500" />
                                    )}
                                </div>
                                
                                {league.club && (
                                    <div className="text-sm text-muted-foreground">
                                        Szervező: <span className="font-medium text-base-content">{league.club.name}</span>
                                    </div>
                                )}
                                
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Badge variant={league.isActive ? "default" : "secondary"}>
                                        {league.isActive ? "Aktív szezon" : "Lezárt"}
                                    </Badge>
                                    <Badge variant="outline">
                                        {league.pointSystemType}
                                    </Badge>
                                </div>
                            </div>

                            <Button asChild variant="outline" size="sm">
                                <Link href={league.club ? `/clubs/${league.club._id}?page=leagues&league=${league._id}` : '#'}>
                                    Részletek
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
