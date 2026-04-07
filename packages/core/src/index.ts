// Connection
export { connectMongo } from './lib/mongoose';

// Utilities
export { GenerateRandomHash, roundRobin } from './lib/utils';
export {
  POINT_SYSTEM_IDS,
  POINT_SYSTEMS,
  normalizePointSystemId,
  isPointSystemId,
  getPointSystemDefinition,
} from './lib/leaguePointSystems';
export type { PointSystemId, PointSystemInput, PointSystemDefinition } from './lib/leaguePointSystems';

// Email utilities
export type { EmailLocale } from './lib/email-layout';
export {
  normalizeEmailLocale,
  textToEmailHtml,
  renderMinimalEmailLayout,
} from './lib/email-layout';
export type { EmailResendContext, EmailResendTokenPayload } from './lib/email-resend';
export { createEmailResendToken, verifyEmailResendToken } from './lib/email-resend';
export { sendEmail } from './lib/mailer';

// Events
export {
  eventEmitter,
  EVENTS,
  eventsBus,
  createSseDeltaPayload,
} from './lib/events';
export type {
  SseDeltaScope,
  SseDeltaAction,
  SseDeltaPayload,
} from './lib/events';

// Date/time utilities
export {
  getUserTimeZone,
  getLocalDateKey,
  getTodayDateKey,
  getLocalMidnightFromKey,
  addDaysToDateKey,
  formatDateKeyLabel,
  formatDateTimeLocalInput,
  parseDateTimeLocalInput,
  parseIsoDateInput,
  getDayBoundsInTimeZone,
  getZonedCalendarDayBoundsUtc,
  getTournamentStartDateRangeFromPreset,
  getTournamentStartDateRangeFromCustomKeys,
} from './lib/date-time';
export type { TournamentStartDatePresetId } from './lib/date-time';

// Club location completeness
export {
  clubHasCorrectAddress,
  clubHasGeoLocationSynced,
  clubNeedsLocationAttention,
} from './lib/club-location-completeness';

// Error classes
export { BadRequestError, ValidationError, AuthorizationError } from './errors/index';
export type { ErrorCategory, LogContext } from './errors/index';

// Interfaces — location
export type {
  GeocodeStatus,
  LocationSource,
  StructuredLocation,
} from './interfaces/location.interface';
export { hasValidCoordinates, shouldPromptLocationReview } from './interfaces/location.interface';

// Interfaces — board
export type { BoardDocument } from './interfaces/board.interface';

// Interfaces — club
export type { BillingInfo, Club, ClubDocument } from './interfaces/club.interface';

// Interfaces — match
export type { MatchPlayer, Throw, Leg, Match, MatchDocument } from './interfaces/match.interface';

// Interfaces — matches
export type { Matches } from './interfaces/matches.interface';

// Interfaces — player
export type {
  TournamentHistory,
  PlayerHonor,
  PlayerSeasonStats,
  PlayerStatistics,
  PlayerDocument,
  Player,
} from './interfaces/player.interface';

// Interfaces — league
export {
  DEFAULT_LEAGUE_POINTS_CONFIG,
} from './interfaces/league.interface';
export type {
  PointSystemType,
  LeaguePointsConfig,
  LeaguePlayer,
  League,
  LeagueDocument,
  CreateLeagueRequest,
  UpdateLeagueRequest,
  AddPlayerToLeagueRequest,
  ManualPointsAdjustmentRequest,
  LeagueLeaderboard,
  LeagueStatsResponse,
} from './interfaces/league.interface';

// Interfaces — tournament
export type {
  TournamentPlayer,
  TournamentGroup,
  KnockoutRound,
  TournamentBoard,
  TournamentSettings,
  WaitingListPlayer,
  NotificationSubscriber,
  Tournament,
  TournamentPlayerDocument,
  TournamentGroupDocument,
  TournamentBoardDocument,
  WaitingListPlayerDocument,
  NotificationSubscriberDocument,
  TournamentDocument,
  ManualGroupsBoard,
  ManualGroupsAvailablePlayer,
  ManualGroupsContextResponse,
  CreateManualGroupRequest,
  CreateManualGroupResponse,
  ManualGroupCreateItem,
  CreateManualGroupsRequest,
  CreatedGroupInfo,
  CreateManualGroupsResponse,
} from './interfaces/tournament.interface';

// Interfaces — user
export type { IUser, UserDocument } from './interfaces/user.interface';

// Interfaces — teaminvitation
export type { ITeamInvitation } from './interfaces/teaminvitation.interface';

// Models
export { AnnouncementModel } from './models/announcement.model';
export type { AnnouncementDocument } from './models/announcement.model';

export { ApiRequestErrorEventModel } from './models/api-request-error-event.model';
export type {
  IApiRequestErrorEvent,
  ApiErrorEventSource,
  TelemetrySource,
  TelemetryOperationClass,
} from './models/api-request-error-event.model';

export { ApiRequestErrorResetModel } from './models/api-request-error-reset.model';
export type { IApiRequestErrorReset } from './models/api-request-error-reset.model';

export { ApiRequestMetricModel } from './models/api-request-metric.model';
export type { IApiRequestMetric } from './models/api-request-metric.model';

export { ApiRouteAnomalyModel } from './models/api-route-anomaly.model';
export type {
  IApiRouteAnomaly,
  ApiRouteAnomalySignal,
} from './models/api-route-anomaly.model';

export { BoardModel, BoardSchema } from './models/board.model';

export { ClubModel } from './models/club.model';
export { ClubShareTokenModel } from './models/club-share-token.model';
export type { ClubShareTokenDocument, ClubShareTokenType } from './models/club-share-token.model';

export { EmailTemplateModel } from './models/emailtemplate.model';
export type { IEmailTemplate } from './models/emailtemplate.model';

export { FeedbackModel } from './models/feedback.model';
export type { FeedbackDocument } from './models/feedback.model';

export { GalleryModel } from './models/gallery.model';
export type { GalleryDocument } from './models/gallery.model';

export { LeagueModel } from './models/league.model';

export { LogModel } from './models/log.model';
export type { ILog } from './models/log.model';

export { MatchModel } from './models/match.model';

export { MediaModel } from './models/media.model';
export type { MediaDocument } from './models/media.model';

export { PendingTournamentModel } from './models/pendingTournament.model';

export { PlayerModel } from './models/player.model';

export { PostModel } from './models/post.model';
export type { PostDocument } from './models/post.model';

export { StressRunSampleModel } from './models/stress-run-sample.model';
export type { IStressRunSample } from './models/stress-run-sample.model';

export { StressRunModel } from './models/stress-run.model';
export type {
  IStressRun,
  StressRunStatus,
  StressTargetEnvironment,
  StressEndpointProfile,
} from './models/stress-run.model';

export { SubscriptionModel } from './models/subscription.model';
export type { SubscriptionDocument } from './models/subscription.model';

export { TeamInvitationModel } from './models/teaminvitation.model';

export { TodoModel } from './models/todo.model';
export type { TodoDocument } from './models/todo.model';

export { TournamentModel } from './models/tournament.model';

export { UserModel } from './models/user.model';
