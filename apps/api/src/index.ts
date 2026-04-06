// Public API surface for consumers of @tdarts/api

export { appRouter, createTRPCContext } from './trpc/root';
export type { AppRouter } from './trpc/root';
export { createHandler } from './trpc/adapters/createFetchHandler';
export type { TRPCContext, Caller, CallerKind } from './trpc/init';

export {
  handleGoogleAuthPost,
  handleMediaGetRequest,
  handleMediaUploadPost,
} from './http/restHandlers';
export type { MediaUploadMode } from './http/restHandlers';

export { handleSocketAuthPost } from './http/socketHandlers';
export { handleUpdatesGet } from './http/updatesHandlers';
export { handlePaymentsVerifyPost } from './http/paymentsHandlers';
export { handlePlayerAvatarGet, handlePlayerAvatarPost } from './http/playersHandlers';
export type { NativeRouteMode } from './http/restCommon';
