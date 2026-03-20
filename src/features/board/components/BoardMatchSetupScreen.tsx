"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Board, Match } from "../types";

interface BoardMatchSetupScreenProps {
  match: Match;
  board: Board | null;
  legsToWin: number;
  startingPlayer: 1 | 2;
  onLegsToWinChange: (value: number) => void;
  onStartingPlayerChange: (player: 1 | 2) => void;
  onStart: () => void;
  onBack: () => void;
  loading: boolean;
  showConfirmDialog: boolean;
  onConfirmDialogChange: (open: boolean) => void;
  getBoardLabel: (boardNumber: number, name?: string) => string;
  backLabel: string;
  scorerLabel: string;
  previousRoundLoserLabel: string;
  legsLabel: string;
  legsToWinLabel: string;
  selectNumberLabel: string;
  whoStartsLabel: string;
  bullLabel: string;
  cancelLabel: string;
  startMatchLabel: string;
  confirmTitle: string;
  confirmDescription: string;
  startingPlayerLabel: string;
  legsWonLabel: string;
  boardLabel: string;
  playersLabel: string;
  saveLabel: string;
}

export function BoardMatchSetupScreen({
  match,
  board,
  legsToWin,
  startingPlayer,
  onLegsToWinChange,
  onStartingPlayerChange,
  onStart,
  onBack,
  loading,
  showConfirmDialog,
  onConfirmDialogChange,
  getBoardLabel,
  backLabel,
  scorerLabel,
  previousRoundLoserLabel,
  legsLabel,
  legsToWinLabel,
  selectNumberLabel,
  whoStartsLabel,
  bullLabel,
  cancelLabel,
  startMatchLabel,
  confirmTitle,
  confirmDescription,
  startingPlayerLabel,
  legsWonLabel,
  boardLabel,
  playersLabel,
  saveLabel,
}: BoardMatchSetupScreenProps) {
  const startingPlayerName =
    startingPlayer === 1
      ? match.player1.playerId.name
      : match.player2.playerId.name;

  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                  <IconArrowLeft size={18} />
                  {backLabel}
                </Button>
                <h2 className="text-lg font-bold">
                  {board ? getBoardLabel(board.boardNumber, board.name) : ""}
                </h2>
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-xl">
                  {match.player1.playerId.name} vs {match.player2.playerId.name}
                </CardTitle>
                <CardDescription>
                  {scorerLabel}
                  {match.scorer ? match.scorer.name : previousRoundLoserLabel}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{legsToWinLabel}</Label>
                <select
                  value={legsToWin}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? 0 : parseInt(e.target.value);
                    onLegsToWinChange(value);
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      onLegsToWinChange(0);
                    }
                  }}
                  className="w-full h-14 rounded-xl bg-muted/20 border border-border/40 shadow-sm text-foreground font-medium focus:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3"
                >
                  <option value="" disabled>
                    {selectNumberLabel}
                  </option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} {legsLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">{whoStartsLabel}</Label>
                <p className="text-xs text-muted-foreground">{bullLabel}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant={startingPlayer === 1 ? "default" : "outline"}
                    onClick={() => onStartingPlayerChange(1)}
                    className="h-14"
                  >
                    {match.player1.playerId.name}
                  </Button>
                  <Button
                    size="lg"
                    variant={startingPlayer === 2 ? "default" : "outline"}
                    onClick={() => onStartingPlayerChange(2)}
                    className="h-14"
                  >
                    {match.player2.playerId.name}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="destructive" className="flex-1" onClick={onBack}>
                  {cancelLabel}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onConfirmDialogChange(true)}
                  disabled={loading}
                >
                  {startMatchLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={onConfirmDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {startingPlayerLabel}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {startingPlayerName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {legsWonLabel}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {legsToWin} {legsLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {boardLabel}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {board ? getBoardLabel(board.boardNumber, board.name) : ""}
                </span>
              </div>
              <div className="flex items-start justify-between pt-2 border-t border-border/40">
                <span className="text-sm font-medium text-muted-foreground">
                  {playersLabel}
                </span>
                <span className="text-sm font-semibold text-foreground text-right">
                  {match.player1.playerId.name}
                  <br />
                  vs
                  <br />
                  {match.player2.playerId.name}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onConfirmDialogChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onConfirmDialogChange(false);
                onStart();
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                  {saveLabel}
                </>
              ) : (
                startMatchLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
