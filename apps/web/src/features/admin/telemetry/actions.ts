import {
  adminTelemetryErrorResetsAction,
  adminTelemetryExportAction,
  adminTelemetryImportSnapshotAction,
  adminTelemetryIncidentsAction,
  adminTelemetryOverviewAction,
  adminTelemetryRouteDetailsAction,
  adminTelemetryRoutesAction,
  adminTelemetryTrendsAction,
} from '@/features/admin/telemetry/admin-telemetry.server';

export const adminTelemetryActions = {
  overview: adminTelemetryOverviewAction,
  trends: adminTelemetryTrendsAction,
  incidents: adminTelemetryIncidentsAction,
  routes: adminTelemetryRoutesAction,
  routeDetails: adminTelemetryRouteDetailsAction,
  errorResets: adminTelemetryErrorResetsAction,
  export: adminTelemetryExportAction,
  importSnapshot: adminTelemetryImportSnapshotAction,
};
