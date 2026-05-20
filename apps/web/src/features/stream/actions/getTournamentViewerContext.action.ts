"use server";

import { z } from "zod";
import { authorizeUserResult } from "@/shared/lib/guards";
import { withTelemetry } from "@/shared/lib/withTelemetry";
import { resolveGuardAwareStatus } from "@/shared/lib/guards/result";
import { serializeForClient } from "@/shared/lib/serializeForClient";
import { getTournamentViewerContextForUser } from "@/lib/tournament-viewer-context";

const inputSchema = z.object({
  code: z.string().min(1),
});

export async function getTournamentViewerContextClientAction(
  input: z.infer<typeof inputSchema>
) {
  const run = withTelemetry(
    "stream.getTournamentViewerContext",
    async (payload: z.infer<typeof inputSchema>) => {
      const { code } = inputSchema.parse(payload);
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const viewer = await getTournamentViewerContextForUser(code, authResult.data.userId);
      return serializeForClient({ success: true, viewer });
    },
    {
      method: "ACTION",
      metadata: { feature: "stream", actionName: "getTournamentViewerContext" },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
