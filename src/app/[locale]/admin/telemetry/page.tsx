import TelemetryDashboardV2 from "@/components/admin/telemetry/TelemetryDashboardV2";
import { TelemetryP95Panel } from "@/components/admin/telemetry/TelemetryP95Panel";

export default async function AdminTelemetryPage() {
  return (
    <div className="space-y-4">
      <TelemetryP95Panel />
      <TelemetryDashboardV2 />
    </div>
  );
}
