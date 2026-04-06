"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { IconEdit, IconShare2, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { LiveBadge } from "@/components/ui/live-badge";
import { cn } from "@/lib/utils";

interface TournamentHeaderProps {
  tournament: any;
  userRole?: string;
  isLive?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  onRefresh?: () => void;
}

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  userRole,
  isLive = false,
  onEdit,
  onShare,
  onRefresh,
}) => {
  const t = useTranslations("Tournament");

  const status = tournament?.tournamentSettings?.status || "pending";
  const statusClasses: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    "group-stage": "bg-info/10 text-info border-info/20",
    knockout: "bg-primary/10 text-primary border-primary/20",
    finished: "bg-success/10 text-success border-success/20",
  };

  const statusLabel: Record<string, string> = {
    pending: t("status.pending.label"),
    "group-stage": t("status.group-stage.label"),
    knockout: t("status.knockout.label"),
    finished: t("status.finished.label"),
  };

  const canEdit = userRole === "admin" || userRole === "moderator";

  return (
    <GlassmorphismCard className="p-6 mb-6">
      <div className="space-y-4">
        {/* Title and Status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {tournament?.tournamentSettings?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={cn("border", statusClasses[status])}>
                {statusLabel[status]}
              </Badge>
              {isLive && <LiveBadge />}
              {tournament?.tournamentSettings?.organizer && (
                <span className="text-sm text-muted-foreground">
                  {t("organized_by")} {tournament.tournamentSettings.organizer}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="gap-2"
              >
                <IconRefresh size={16} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="gap-2"
              >
                <IconShare2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            {canEdit && onEdit && (
              <Button size="sm" onClick={onEdit} className="gap-2">
                <IconEdit size={16} />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tournament Info Grid */}
        {tournament?.tournamentSettings?.description && (
          <div className="pt-4 border-t border-border/30">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tournament.tournamentSettings.description}
            </p>
          </div>
        )}
      </div>
    </GlassmorphismCard>
  );
};
