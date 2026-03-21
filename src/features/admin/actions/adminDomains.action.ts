import {
  adminChartsClubsDailyAction,
  adminChartsFeedbackDailyAction,
  adminChartsTournamentsDailyAction,
  adminClubsListAction,
  adminEmailsListTemplatesAction,
  adminEmailsSendTestAction,
  adminEmailsSetActiveAction,
  adminEmailsUpdateTemplateAction,
  adminErrorsDailyAction,
  adminErrorsStatsAction,
  adminFeedbackDeleteAction,
  adminFeedbackGetByIdAction,
  adminFeedbackListAction,
  adminFeedbackMarkReadAction,
  adminFeedbackReplyAction,
  adminFeedbackUpdateAction,
  adminLeaguesAddPlayerAction,
  adminLeaguesCreateForClubAction,
  adminLeaguesDeleteAction,
  adminLeaguesListAction,
  adminLeaguesListForClubAction,
  adminLeaguesRemovePlayerAction,
  adminLeaguesUpdateAction,
  adminLeaguesUpdatePlayerPointsAction,
  adminPlayersUpdateProfileAction,
  adminSettingsGetSystemInfoAction,
  adminTelemetryErrorResetsAction,
  adminTelemetryExportAction,
  adminTelemetryImportSnapshotAction,
  adminTelemetryIncidentsAction,
  adminTelemetryOverviewAction,
  adminTelemetryRouteDetailsAction,
  adminTelemetryRoutesAction,
  adminTelemetryTrendsAction,
  adminTodosCreateAction,
  adminTodosDeleteAction,
  adminTodosListAction,
  adminTodosStatsAction,
  adminTodosUpdateAction,
  adminTournamentsListAction,
  adminTournamentSoftDeleteAction,
  adminTournamentRestoreAction,
  adminTournamentPurgeAction,
  adminUsersDeactivateAction,
  adminUsersListAction,
  adminUsersSendEmailAction,
  adminUsersSendResetAction,
  adminUsersSetPasswordAction,
  adminUsersToggleAdminAction,
  adminUsersUpdateVerificationAction,
  adminYearWrapRestoreAction,
  adminYearWrapWrapAction,
} from './adminDomainsServer.action';

const call = <Args extends any[]>(fn: (...args: Args) => Promise<unknown>) => {
  return async (...args: Args): Promise<any> => {
    return (await fn(...args)) as any;
  };
};

export const adminUsersActions = {
  list: call(adminUsersListAction),
  toggleAdmin: call(adminUsersToggleAdminAction),
  deactivate: call(adminUsersDeactivateAction),
  updateVerification: call(adminUsersUpdateVerificationAction),
  setPassword: call(adminUsersSetPasswordAction),
  sendReset: call(adminUsersSendResetAction),
  sendEmail: call(adminUsersSendEmailAction),
};

export const adminClubsActions = {
  list: call(adminClubsListAction),
};

export const adminTournamentsActions = {
  list: call(adminTournamentsListAction),
  softDelete: call(adminTournamentSoftDeleteAction),
  restore: call(adminTournamentRestoreAction),
  purge: call(adminTournamentPurgeAction),
};

export const adminLeaguesActions = {
  list: call(adminLeaguesListAction),
  listForClub: call(adminLeaguesListForClubAction),
  createForClub: call(adminLeaguesCreateForClubAction),
  update: call(adminLeaguesUpdateAction),
  delete: call(adminLeaguesDeleteAction),
  addPlayer: call(adminLeaguesAddPlayerAction),
  updatePlayerPoints: call(adminLeaguesUpdatePlayerPointsAction),
  removePlayer: call(adminLeaguesRemovePlayerAction),
};

export const adminPlayersActions = {
  updateProfile: call(adminPlayersUpdateProfileAction),
};

export const adminEmailsActions = {
  listTemplates: call(adminEmailsListTemplatesAction),
  updateTemplate: call(adminEmailsUpdateTemplateAction),
  sendTest: call(adminEmailsSendTestAction),
  setActive: call(adminEmailsSetActiveAction),
};

export const adminErrorsActions = {
  stats: call(adminErrorsStatsAction),
  daily: call(adminErrorsDailyAction),
};

export const adminFeedbackActions = {
  list: call(adminFeedbackListAction),
  getById: call(adminFeedbackGetByIdAction),
  update: call(adminFeedbackUpdateAction),
  delete: call(adminFeedbackDeleteAction),
  markRead: call(adminFeedbackMarkReadAction),
  reply: call(adminFeedbackReplyAction),
};

export const adminTodosActions = {
  list: call(adminTodosListAction),
  stats: call(adminTodosStatsAction),
  create: call(adminTodosCreateAction),
  update: call(adminTodosUpdateAction),
  delete: call(adminTodosDeleteAction),
};

export const adminSettingsActions = {
  getSystemInfo: call(adminSettingsGetSystemInfoAction),
};

export const adminChartsActions = {
  clubsDaily: call(adminChartsClubsDailyAction),
  tournamentsDaily: call(adminChartsTournamentsDailyAction),
  feedbackDaily: call(adminChartsFeedbackDailyAction),
};

export const adminTelemetryActions = {
  overview: call(adminTelemetryOverviewAction),
  trends: call(adminTelemetryTrendsAction),
  incidents: call(adminTelemetryIncidentsAction),
  routes: call(adminTelemetryRoutesAction),
  routeDetails: call(adminTelemetryRouteDetailsAction),
  errorResets: call(adminTelemetryErrorResetsAction),
  export: call(adminTelemetryExportAction),
  importSnapshot: call(adminTelemetryImportSnapshotAction),
};

export const adminYearWrapActions = {
  wrap: call(adminYearWrapWrapAction),
  restore: call(adminYearWrapRestoreAction),
};
