"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconArrowLeft, IconDeviceDesktop } from "@tabler/icons-react";

interface BoardAuthScreenProps {
  tournamentId?: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
  tournamentPageLabel?: string;
  tournamentPageHref?: string;
}

export function BoardAuthScreen({
  tournamentId,
  password,
  onPasswordChange,
  onSubmit,
  loading,
  error,
  backHref,
  backLabel,
  title,
  description,
  passwordLabel,
  passwordPlaceholder,
  submitLabel,
  tournamentPageLabel,
  tournamentPageHref,
}: BoardAuthScreenProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20">
          <CardHeader>
            <div className="text-center space-y-4">
              {(tournamentId && tournamentPageLabel && tournamentPageHref) ? (
                <div className="flex gap-2 justify-center mb-4">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={backHref}>
                      <IconArrowLeft size={18} />
                      {backLabel}
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={tournamentPageHref}>{tournamentPageLabel}</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between mb-4">
                  <Link href={backHref} className="gap-2 flex items-center">
                    <IconArrowLeft size={18} />
                    {backLabel}
                  </Link>
                </div>
              )}
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
                <IconDeviceDesktop className="text-primary" size={32} />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  {title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="board-password" className="text-sm font-semibold">
                  {passwordLabel}
                </Label>
                <Input
                  id="board-password"
                  type="password"
                  placeholder={passwordPlaceholder}
                  className="h-14"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && onSubmit()}
                  autoFocus
                />
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={onSubmit}
                disabled={loading || !password.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                    {submitLabel}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
