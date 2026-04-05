/**
 * Subpath export for Next.js App Router routes — avoids pulling the full tRPC server graph.
 * Extensionless re-exports so the bundler resolves .ts sources.
 */
export {
  handleGoogleAuthPost,
  handleMediaGetRequest,
  handleMediaUploadPost,
} from './http/restHandlers';
export type { MediaUploadMode } from './http/restHandlers';

export { handleSocketAuthPost } from './http/socketHandlers';
export { handleUpdatesGet } from './http/updatesHandlers';
export { handlePaymentsVerifyPost } from './http/paymentsHandlers';
export { handlePlayerAvatarPost } from './http/playersHandlers';
export type { NativeRouteMode } from './http/restCommon';
