"use client"

import TournamentCard from "@/components/tournament/TournamentCard"
import { IconCalendar } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { addDaysToDateKey, formatDateKeyLabel, getLocalDateKey, getUserTimeZone } from "@/lib/date-time"
import { staggerContainer, staggerChild } from "@/lib/motion"

interface TournamentListProps {
    tournaments: any[];
}

export function TournamentList({ tournaments }: TournamentListProps) {
    const tResults = useTranslations('Search.tournament_results')
    const locale = useLocale()
    const timeZone = getUserTimeZone()
    
    if (!tournaments || tournaments.length === 0) {
        return (
            <div className="text-center py-16 bg-base-100 rounded-xl border border-base-200 shadow-sm">
                <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-6">
                    <IconCalendar className="w-10 h-10 text-base-content/50" />
                </div>
                <h3 className="text-xl font-bold mb-2">{tResults('no_tournaments')}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    {tResults('no_tournaments_filters_desc')}
                </p>
            </div>
        )
    }

    // Group tournaments by date
    const groupedTournaments = tournaments.reduce((groups: any, item: any) => {
        // Handle nested tournament object from search result or direct object
        const tournament = item.tournament || item;
        
        // Safety check: if tournament or settings are missing, skip
        if (!tournament || !tournament.tournamentSettings || !tournament.tournamentSettings.startDate) {
            return groups;
        }

        const date = new Date(tournament.tournamentSettings.startDate);
        const dateKey = getLocalDateKey(date, timeZone);
        if (!dateKey) return groups;
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(tournament);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedTournaments).sort((a, b) => a.localeCompare(b));

    const formatDateHeader = (dateKey: string) => {
        const todayKey = getLocalDateKey(new Date(), timeZone)
        if (!todayKey) return dateKey
        const tomorrowKey = addDaysToDateKey(todayKey, 1)

        if (dateKey === todayKey) {
          return tResults('today')
        } else if (tomorrowKey && dateKey === tomorrowKey) {
          return tResults('tomorrow')
        } else {
          return formatDateKeyLabel(dateKey, locale)
        }
    }

    return (
        <motion.div
            className="space-y-10"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
        >
            {sortedDates.map((dateKey) => {
                const dayTournaments = groupedTournaments[dateKey]
                
                return (
                    <motion.section
                        key={dateKey}
                        className="space-y-5"
                        variants={staggerChild}
                    >
                        <div className="flex items-center gap-4 sticky top-[60px] md:top-[70px] z-10 py-2 bg-base-100/95 backdrop-blur-sm border-b border-base-200">
                            <h3 className="text-lg md:text-xl font-bold text-primary-foreground capitalize flex items-center gap-2">
                                <IconCalendar className="w-5 h-5 opacity-70" />
                                {formatDateHeader(dateKey)}
                            </h3>
                            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-base-200 text-base-content/70">
                                {dayTournaments.length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {dayTournaments.map((tournament: any) => (
                                <motion.div key={tournament._id} variants={staggerChild}>
                                    <TournamentCard tournament={tournament} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )
            })}
        </motion.div>
    )
}
