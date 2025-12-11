import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/card"
import { IconMapPin, IconShieldCheck, IconUsers } from "@tabler/icons-react"
import Link from "next/link"

interface ClubListProps {
    clubs: any[];
}

export function ClubList({ clubs }: ClubListProps) {
    if (!clubs || clubs.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">Nincsenek klubok</div>
    }

    return (
        <div className="grid gap-4">
            {clubs.map((club) => (
                <Card key={club._id} className="group hover:shadow-md transition-all border-base-200">
                    <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg">{club.name}</h3>
                                    {club.verified && (
                                        <IconShieldCheck className="w-5 h-5 text-blue-500" />
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <IconMapPin className="w-4 h-4" />
                                        {club.location}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <IconUsers className="w-4 h-4" />
                                        {club.memberCount} tag
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4">
                                <div className="text-center px-4">
                                    <div className="text-2xl font-black text-primary leading-none">
                                        {club.tournamentCount}
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Verseny
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/clubs/${club._id}`}>
                                        Adatlap
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
