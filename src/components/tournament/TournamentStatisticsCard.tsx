"use client";

import React, { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  IconUsers,
  IconGamepad2,
  IconTrophy,
  IconProgress,
} from "@tabler/icons-react";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { AnimatedStat } from "@/components/ui/animated-stat";
import { cn } from "@/lib/utils";

interface TournamentStatisticsCardProps {
  tournament: any;
  playerCount?: number;
  activeMatches?: number;
  topPlayers?: any[];
}

export const TournamentStatisticsCard: React.FC<
  TournamentStatisticsCardProps
> = ({ tournament, playerCount = 0, activeMatches = 0, topPlayers = [] }) => {
  const t = useTranslations("Tournament");
  const format = useFormatter();

  const totalPlayers = playerCount || tournament?.players?.length || 0;
  const totalGroups = tournament?.groups?.length || 0;
  const groupCount =
    (tournament?.tournamentSettings?.numberOfGroups as number) || 0;

  const stats = [
    {
      number: totalPlayers,
      label: t("statistics.total_players"),
      sublabel: `${totalGroups} groups`,
      icon: <IconUsers size={24} />,
      color: "text-primary",
    },
    {
      number: activeMatches,
      label: t("statistics.active_matches"),
      sublabel: t("statistics.ongoing"),
      icon: <IconGamepad2 size={24} />,
      color: "text-success",
    },
    {
      number: topPlayers.length,
      label: t("statistics.top_players"),
      sublabel: t("statistics.leaderboard"),
      icon: <IconTrophy size={24} />,
      color: "text-accent",
    },
    {
      number: `${Math.round((tournament?.groups?.filter((g: any) => g.matches?.some((m: any) => m.status === 'finished')).length / Math.max(groupCount, 1)) * 100)}%`,
      label: t("statistics.progress"),
      sublabel: t("statistics.completion"),
      icon: <IconProgress size={24} />,
      color: "text-info",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          style={{ animationDelay: `${index * 100}ms` }}
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <AnimatedStat {...stat} />
        </div>
      ))}
    </div>
  );
};
