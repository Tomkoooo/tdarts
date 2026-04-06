/**
 * Public app / client update metadata (version gates, feature hints).
 * Values come from env so ops can bump without redeploying web-only assets.
 */
export class AppUpdatesService {
  static getPublicManifest(): {
    version: string;
    minClientVersion: string | null;
    socketUrl: string | null;
  } {
    const version =
      process.env.APP_PUBLIC_VERSION?.trim() ||
      process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
      '0.0.0';
    const minRaw = process.env.APP_MIN_CLIENT_VERSION?.trim() ?? '';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || process.env.SOCKET_PUBLIC_URL?.trim() || null;
    return {
      version,
      minClientVersion: minRaw.length > 0 ? minRaw : null,
      socketUrl,
    };
  }
}
