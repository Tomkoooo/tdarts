"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getMapSettingsTranslations } from "@/data/translations/map-settings";
import { useLocale } from "next-intl";

export interface MapItem {
  id: string;
  kind: "club" | "tournament";
  name: string;
  address?: string | null;
  country?: string | null;
  lat: number | null;
  lng: number | null;
  mapReady?: boolean;
  href: string;
  previewImage?: string | null;
  clubName?: string | null;
  clubLogo?: string | null;
  clubHref?: string | null;
  startDate?: string | null;
}

interface MapExplorerProps {
  initialQuery?: string;
}

const hasValidCoordinates = (
  item: MapItem
): item is MapItem & { lat: number; lng: number } =>
  Boolean(item.mapReady) && item.lat != null && item.lng != null;

const escapeHtml = (value?: string | null) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  hungary: [47.1625, 19.5033],
  magyarorszag: [47.1625, 19.5033],
  magyarország: [47.1625, 19.5033],
  germany: [51.1657, 10.4515],
  deutschland: [51.1657, 10.4515],
  austria: [47.5162, 14.5501],
  osterreich: [47.5162, 14.5501],
  österreich: [47.5162, 14.5501],
  slovakia: [48.669, 19.699],
  slovensko: [48.669, 19.699],
  romania: [45.9432, 24.9668],
  romania_ro: [45.9432, 24.9668],
  croatia: [45.1, 15.2],
  hrvatska: [45.1, 15.2],
  serbia: [44.0165, 21.0059],
  slovenia: [46.1512, 14.9955],
  poland: [51.9194, 19.1451],
  czechia: [49.8175, 15.473],
};

const normalizeCountry = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const countryFromAddress = (address?: string | null) => {
  const normalized = normalizeCountry(address);
  if (!normalized) return "";
  if (normalized.includes("magyar")) return "hungary";
  if (normalized.includes("germany") || normalized.includes("deutsch")) return "germany";
  if (normalized.includes("austria") || normalized.includes("österreich") || normalized.includes("osterreich")) {
    return "austria";
  }
  if (normalized.includes("slovakia") || normalized.includes("slovensko")) return "slovakia";
  if (normalized.includes("romania")) return "romania";
  if (normalized.includes("croatia") || normalized.includes("hrvatska")) return "croatia";
  if (normalized.includes("serbia")) return "serbia";
  if (normalized.includes("slovenia")) return "slovenia";
  if (normalized.includes("poland")) return "poland";
  if (normalized.includes("czech")) return "czechia";
  return "";
};

export default function MapExplorer({ initialQuery = "" }: MapExplorerProps) {
  const locale = useLocale();
  const t = getMapSettingsTranslations(locale);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<MapItem[]>([]);
  const [showClubs, setShowClubs] = useState(true);
  const [showTournaments, setShowTournaments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(7);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const tileLayerRef = useRef<any | null>(null);
  const markersLayerRef = useRef<any | null>(null);
  const markerByIdRef = useRef<Map<string, any>>(new Map());
  const lastItemsSignatureRef = useRef<string>("");

  const loadData = async (q: string, clubsOnly = showClubs, tournamentsOnly = showTournaments) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, showClubs: clubsOnly, showTournaments: tournamentsOnly }),
      });
      if (!response.ok) throw new Error("Map data load failed");
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      setError(t.mapLoadError);
    } finally {
      setLoading(false);
    }
  };

  const focusItemOnMap = (itemId: string) => {
    const marker = markerByIdRef.current.get(itemId);
    if (!marker || !mapRef.current) return;
    const latLng = marker.getLatLng?.();
    if (!latLng) return;
    mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom() || 12, 12), { animate: true });
    marker.openPopup?.();
  };

  useEffect(() => {
    loadData(initialQuery, showClubs, showTournaments);
  }, [initialQuery, showClubs, showTournaments]);

  useEffect(() => {
    let disposed = false;

    const renderMap = async () => {
      if (!mapContainerRef.current) return;
      const L = await import("leaflet");
      if (disposed || !mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          center: [47.1625, 19.5033],
          zoom: 7,
        });
        setZoomLevel(mapRef.current.getZoom());
        mapRef.current.on("zoomend", () => {
          setZoomLevel(mapRef.current?.getZoom?.() ?? 7);
        });
      }

      if (!tileLayerRef.current) {
        tileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
      }
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      markerByIdRef.current.clear();
      const itemsSignature = items
        .map((item) => `${item.id}:${item.lat ?? "n"}:${item.lng ?? "n"}:${item.country ?? ""}`)
        .join("|");
      const shouldFitBounds = lastItemsSignatureRef.current !== itemsSignature;
      lastItemsSignatureRef.current = itemsSignature;

      const bounds = L.latLngBounds([]);

      // Zoomed-out country grouping: include map-ready and country-only records.
      if (zoomLevel <= 5) {
        const countryBuckets = new Map<
          string,
          { center: [number, number]; clubs: MapItem[]; tournaments: MapItem[] }
        >();

        items.forEach((item) => {
          const keyFromCountry = normalizeCountry(item.country);
          const keyFromAddress = countryFromAddress(item.address);
          const countryKey = keyFromCountry || keyFromAddress;
          const centroid = COUNTRY_CENTROIDS[countryKey];
          if (!centroid) return;

          if (!countryBuckets.has(countryKey)) {
            countryBuckets.set(countryKey, { center: centroid, clubs: [], tournaments: [] });
          }
          const bucket = countryBuckets.get(countryKey)!;
          if (item.kind === "club") bucket.clubs.push(item);
          else bucket.tournaments.push(item);
        });

        if (countryBuckets.size === 0) {
          mapRef.current.setView([47.1625, 19.5033], 7);
          mapRef.current.invalidateSize();
          return;
        }

        countryBuckets.forEach((bucket, countryKey) => {
          const total = bucket.clubs.length + bucket.tournaments.length;
          const label =
            countryKey.charAt(0).toUpperCase() + countryKey.slice(1).replace(/_/g, " ");
          const clubNames = bucket.clubs.slice(0, 6).map((x) => `<li>${escapeHtml(x.name)}</li>`).join("");
          const tournamentNames = bucket.tournaments
            .slice(0, 6)
            .map((x) => `<li>${escapeHtml(x.name)}</li>`)
            .join("");
          const clubLinks = bucket.clubs
            .slice(0, 3)
            .map(
              (club) =>
                `<a href="${escapeHtml(club.href)}" style="display:inline-block;margin:2px 6px 2px 0;padding:4px 8px;border-radius:999px;border:1px solid #d1d5db;text-decoration:none;color:#111827;font-size:11px;">${escapeHtml(club.name)}</a>`
            )
            .join("");
          const tournamentLinks = bucket.tournaments
            .slice(0, 3)
            .map(
              (tournament) =>
                `<a href="${escapeHtml(tournament.href)}" style="display:inline-block;margin:2px 6px 2px 0;padding:4px 8px;border-radius:999px;border:1px solid #d1d5db;text-decoration:none;color:#111827;font-size:11px;">${escapeHtml(tournament.name)}</a>`
            )
            .join("");
          const popupHtml = `
            <div style="max-width:280px;">
              <div style="font-weight:700;font-size:14px;">${escapeHtml(label)}</div>
              <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;">${bucket.clubs.length} clubs</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#ecfdf5;color:#065f46;">${bucket.tournaments.length} tournaments</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#374151;">${total} total</span>
              </div>
              <div style="margin-top:8px;font-size:12px;"><strong>Klubok (${bucket.clubs.length})</strong></div>
              <ul style="margin:4px 0 0 16px;font-size:12px;color:#374151;">${clubNames || "<li>—</li>"}</ul>
              ${clubLinks ? `<div style="margin-top:6px;">${clubLinks}</div>` : ""}
              <div style="margin-top:8px;font-size:12px;"><strong>Tornák (${bucket.tournaments.length})</strong></div>
              <ul style="margin:4px 0 0 16px;font-size:12px;color:#374151;">${tournamentNames || "<li>—</li>"}</ul>
              ${tournamentLinks ? `<div style="margin-top:6px;">${tournamentLinks}</div>` : ""}
            </div>
          `;

          const marker = L.circleMarker(bucket.center, {
            radius: Math.min(20, 10 + Math.floor(total / 3)),
            color: "#6366f1",
            weight: 2,
            fillOpacity: 0.75,
          }).bindPopup(popupHtml);
          marker.addTo(markersLayerRef.current);
          bounds.extend(bucket.center);
        });

        if (shouldFitBounds && bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [30, 30] });
        }
        mapRef.current.invalidateSize();
        return;
      }

      const markerItems = items.filter(hasValidCoordinates);
      if (markerItems.length === 0) {
        mapRef.current.setView([47.1625, 19.5033], 7);
        mapRef.current.invalidateSize();
        return;
      }

      markerItems.forEach((item) => {
        const openLabel = item.kind === "club" ? t.mapOpenClub : t.mapOpenTournament;
        const imageSection = item.previewImage
          ? `<img src="${escapeHtml(item.previewImage)}" alt="" style="display:block;width:100%;height:88px;object-fit:cover;border-radius:8px;margin:8px 0;" />`
          : "";
        const clubSection =
          item.kind === "tournament" && (item.clubName || item.clubLogo || item.clubHref)
            ? `
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${escapeHtml(t.mapClubInfo)}</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${item.clubLogo ? `<img src="${escapeHtml(item.clubLogo)}" alt="" style="width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid #e5e7eb;" />` : ""}
                  <div style="font-size:12px;font-weight:600;">${escapeHtml(item.clubName)}</div>
                </div>
                ${item.clubHref ? `<a href="${escapeHtml(item.clubHref)}" style="display:inline-block;margin-top:8px;padding:5px 10px;border-radius:8px;border:1px solid #e5e7eb;text-decoration:none;color:#111827;font-size:12px;">${escapeHtml(t.mapOpenClub)}</a>` : ""}
              </div>
            `
            : "";
        const popupHtml = `
          <div style="max-width:220px;">
            <div style="font-weight:700;font-size:13px;">${escapeHtml(item.name)}</div>
            ${imageSection}
            ${item.address ? `<div style="font-size:12px;color:#4b5563;">${escapeHtml(item.address)}</div>` : ""}
            <a href="${escapeHtml(item.href)}" style="display:inline-block;margin-top:8px;padding:6px 10px;border-radius:8px;background:#111827;color:#fff;text-decoration:none;font-size:12px;">${escapeHtml(openLabel)}</a>
            ${clubSection}
          </div>
        `;

        const marker = L.circleMarker([item.lat, item.lng], {
          radius: 8,
          color: item.kind === "club" ? "#22c55e" : "#3b82f6",
          weight: 2,
          fillOpacity: 0.8,
        }).bindPopup(popupHtml);
        marker.addTo(markersLayerRef.current);
        markerByIdRef.current.set(item.id, marker);
        bounds.extend([item.lat, item.lng]);
      });

      if (shouldFitBounds && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
      mapRef.current.invalidateSize();
    };

    renderMap();

    return () => {
      disposed = true;
    };
  }, [items, zoomLevel, t.mapClubInfo, t.mapOpenClub, t.mapOpenTournament]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  const orderedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "club" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [items]
  );

  return (
    <div className="space-y-4 map-explorer">
      <div className="flex gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.mapSearchPlaceholder} />
        <Button onClick={() => loadData(query)} disabled={loading}>
          {loading ? t.mapLoadingButton : t.mapSearchButton}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showClubs && showTournaments ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowClubs(true);
            setShowTournaments(true);
          }}
        >
          {t.mapFilterAll}
        </Button>
        <Button
          variant={showClubs && !showTournaments ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowClubs(true);
            setShowTournaments(false);
          }}
        >
          {t.mapFilterClubs}
        </Button>
        <Button
          variant={!showClubs && showTournaments ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowClubs(false);
            setShowTournaments(true);
          }}
        >
          {t.mapFilterTournaments}
        </Button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div ref={mapContainerRef} className="relative z-0 min-h-[420px] rounded-xl border border-border/50 bg-muted/20" />
        <div className="max-h-[420px] space-y-2 overflow-auto rounded-xl border border-border/50 p-3">
          {orderedItems.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="rounded-lg border border-border/40 p-3 hover:bg-muted/20">
              <div className="text-xs text-muted-foreground">{item.kind === "club" ? t.mapKindClub : t.mapKindTournament}</div>
              <div className="font-medium">{item.name}</div>
              {item.address && <div className="text-sm text-muted-foreground">{item.address}</div>}
              {item.kind === "tournament" && item.clubName && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.mapClubInfo}: {item.clubName}
                </div>
              )}
              {!item.mapReady && <div className="mt-1 text-xs text-warning">{t.mapNotGeocodedHint}</div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => focusItemOnMap(item.id)} disabled={!item.mapReady}>
                  {t.mapShowOnMap}
                </Button>
                {item.kind === "club" ? (
                  <Button asChild size="sm">
                    <Link href={item.href}>{t.mapOpenClub}</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href={item.href}>{t.mapOpenTournament}</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {orderedItems.length === 0 && <div className="text-sm text-muted-foreground">{t.mapEmpty}</div>}
        </div>
      </div>
      <style jsx global>{`
        .map-explorer .leaflet-container,
        .map-explorer .leaflet-pane,
        .map-explorer .leaflet-control {
          z-index: 1 !important;
        }
      `}</style>
    </div>
  );
}
