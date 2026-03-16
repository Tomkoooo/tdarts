'use server';

import { adminApiRequestAction } from './adminApiProxy.action';

export const adminUsersActions = {
  list: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/users', method: 'GET', params }),
};

export const adminClubsActions = {
  list: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/clubs', method: 'GET', params }),
};

export const adminTournamentsActions = {
  list: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/tournaments', method: 'GET', params }),
};

export const adminLeaguesActions = {
  list: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/leagues', method: 'GET', params }),
};

export const adminEmailsActions = {
  listTemplates: () => adminApiRequestAction({ path: '/api/admin/email-templates', method: 'GET' }),
};

export const adminErrorsActions = {
  stats: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/errors/stats', method: 'GET', params }),
};

export const adminFeedbackActions = {
  list: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/feedback', method: 'GET', params }),
};

export const adminTodosActions = {
  list: () => adminApiRequestAction({ path: '/api/admin/todos', method: 'GET' }),
  stats: () => adminApiRequestAction({ path: '/api/admin/todos/stats', method: 'GET' }),
};

export const adminTelemetryActions = {
  overview: (params: Record<string, string | number | boolean>) =>
    adminApiRequestAction({ path: '/api/admin/charts/api-traffic/v2/overview', method: 'GET', params }),
};

export const adminYearWrapActions = {
  wrap: (year: number, confirm: string) =>
    adminApiRequestAction({ path: '/api/admin/year-wrap', method: 'POST', body: { year, confirm } }),
  restore: (year: number) =>
    adminApiRequestAction({ path: '/api/admin/restore-stats', method: 'POST', body: { year } }),
};
