"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmailLocale } from "@/lib/email-layout";

export default function EmailResendPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [locale, setLocale] = useState<EmailLocale>("en");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const hasToken = useMemo(() => token.length > 0, [token]);

  const handleResend = async () => {
    if (!hasToken) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await axios.post("/api/email/resend", { token, locale });
      setMessage(response.data?.message || "Email sent.");
    } catch (error: any) {
      setMessage(error?.response?.data?.error || "Failed to resend email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasToken ? (
            <p className="text-sm text-destructive">Invalid email resend link.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Choose a language and request this email again.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={locale === "hu" ? "default" : "outline"}
                  onClick={() => setLocale("hu")}
                  className="flex-1"
                >
                  Magyar
                </Button>
                <Button
                  type="button"
                  variant={locale === "en" ? "default" : "outline"}
                  onClick={() => setLocale("en")}
                  className="flex-1"
                >
                  English
                </Button>
                <Button
                  type="button"
                  variant={locale === "de" ? "default" : "outline"}
                  onClick={() => setLocale("de")}
                  className="flex-1"
                >
                  Deutsch
                </Button>
              </div>
              <Button onClick={handleResend} className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Resend email"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
