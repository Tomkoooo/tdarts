import { StructuredLocation } from '@/interface/location.interface';

interface GeocodeResult {
  ok: boolean;
  location: StructuredLocation;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id?: string | number;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
  };
}

export class GeocodingService {
  private static geocodeQueue: Promise<void> = Promise.resolve();
  private static lastCallAt = 0;

  private static sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static async runRateLimited<T>(task: () => Promise<T>): Promise<T> {
    const minDelayMs = Number(process.env.NOMINATIM_MIN_DELAY_MS || 1200);
    let output!: T;
    this.geocodeQueue = this.geocodeQueue.catch(() => undefined).then(async () => {
      const waitMs = Math.max(0, this.lastCallAt + minDelayMs - Date.now());
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }
      try {
        output = await task();
      } finally {
        this.lastCallAt = Date.now();
      }
    });
    await this.geocodeQueue;
    return output;
  }

  private static parseRetryAfterSeconds(retryAfter: string | null): number | null {
    if (!retryAfter) return null;
    const seconds = Number(retryAfter);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  static async geocodeAddress(rawInput: string, source: StructuredLocation['source'] = 'user'): Promise<GeocodeResult> {
    const trimmedInput = (rawInput || '').trim();
    if (!trimmedInput) {
      return {
        ok: false,
        location: {
          rawInput: null,
          geocodeStatus: 'failed',
          geocodeUpdatedAt: new Date(),
          source,
        },
      };
    }

    try {
      const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
      const url = new URL('/search', baseUrl);
      url.searchParams.set('q', trimmedInput);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', '1');
      url.searchParams.set('accept-language', 'hu');

      const contactEmail = process.env.NOMINATIM_EMAIL || process.env.CONTACT_EMAIL || '';
      const userAgent =
        process.env.NOMINATIM_USER_AGENT ||
        `tdarts_tournament/1.0${contactEmail ? ` (${contactEmail})` : ''}`;

      const maxRetries = Number(process.env.NOMINATIM_MAX_RETRIES || 3);
      let response: Response | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        response = await this.runRateLimited(() =>
          fetch(url.toString(), {
            headers: {
              'User-Agent': userAgent,
              ...(contactEmail ? { Referer: `mailto:${contactEmail}` } : {}),
            },
          })
        );

        if (response.ok) break;

        const shouldRetry = response.status === 429 || response.status >= 500;
        if (!shouldRetry || attempt === maxRetries) {
          throw new Error(`Nominatim geocode failed with ${response.status}`);
        }

        const retryAfterSec = this.parseRetryAfterSeconds(response.headers.get('retry-after'));
        const backoffMs = retryAfterSec ? retryAfterSec * 1000 : Math.min(10000, 1000 * (attempt + 1));
        await this.sleep(backoffMs);
      }

      if (!response || !response.ok) {
        throw new Error('Nominatim geocode failed after retries');
      }

      const data = (await response.json()) as NominatimResult[];
      const topResult = data?.[0];
      if (!topResult) {
        return {
          ok: false,
          location: {
            rawInput: trimmedInput,
            formattedAddress: trimmedInput,
            geocodeStatus: 'needs_review',
            geocodeUpdatedAt: new Date(),
            source,
          },
        };
      }

      const city = topResult.address?.city || topResult.address?.town || topResult.address?.village || null;
      const lat = Number(topResult.lat);
      const lng = Number(topResult.lon);

      return {
        ok: true,
        location: {
          rawInput: trimmedInput,
          formattedAddress: topResult.display_name || trimmedInput,
          addressLine1: `${topResult.address?.road || ''} ${topResult.address?.house_number || ''}`.trim() || null,
          city,
          postalCode: topResult.address?.postcode || null,
          country: topResult.address?.country || null,
          placeId: topResult.place_id ? String(topResult.place_id) : null,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          geocodeStatus: 'ok',
          geocodeUpdatedAt: new Date(),
          source,
        },
      };
    } catch (error) {
      console.error('GeocodingService.geocodeAddress error:', error);
      return {
        ok: false,
        location: {
          rawInput: trimmedInput,
          formattedAddress: trimmedInput,
          // Transport/provider errors are retriable; do not force user correction immediately.
          geocodeStatus: 'pending',
          geocodeUpdatedAt: new Date(),
          source,
        },
      };
    }
  }
}
