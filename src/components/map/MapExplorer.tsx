"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getMapSettingsTranslations } from '@/data/translations/map-settings';

export interface MapItem {
  id: string;
  kind: 'club' | 'tournament';
  name: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  mapReady?: boolean;
  href: string;
  previewImage?: string | null;
  startDate?: string | null;
}

interface MapExplorerProps {
  initialQuery?: string;
}

const hasValidCoordinates = (
  item: MapItem
): item is MapItem & { lat: number; lng: number } =>
  Boolean(item.mapReady) && item.lat != null && item.lng != null;

export default function MapExplorer({ initialQuery = '' }: MapExplorerProps) {
  const t = getMapSettingsTranslations(typeof navigator !== 'undefined' ? navigator.language : 'hu');
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<MapItem[]>([]);
  const [showClubs, setShowClubs] = useState(true);
  const [showTournaments, setShowTournaments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const tileLayerRef = useRef<any | null>(null);
  const markersLayerRef = useRef<any | null>(null);

  const loadData = async (q: string, clubsOnly = showClubs, tournamentsOnly = showTournaments) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, showClubs: clubsOnly, showTournaments: tournamentsOnly }),
      });
      if (!response.ok) throw new Error('Map data load failed');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      setError(t.mapLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(initialQuery, showClubs, showTournaments);
  }, [initialQuery, showClubs, showTournaments]);

  useEffect(() => {
    let disposed = false;

    const renderMap = async () => {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          center: [47.1625, 19.5033],
          zoom: 7,
        });
      }

      if (!tileLayerRef.current) {
        tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
      }
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

      const markerItems = items.filter(hasValidCoordinates);
      if (markerItems.length === 0) {
        mapRef.current.setView([47.1625, 19.5033], 7);
        mapRef.current.invalidateSize();
        return;
      }

      const bounds = L.latLngBounds([]);
      markerItems.forEach((item) => {
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: 8,
          color: item.kind === 'club' ? '#22c55e' : '#3b82f6',
          weight: 2,
          fillOpacity: 0.8,
        }).bindPopup(`<strong>${item.name}</strong><br/>${item.address || ''}`);
        marker.addTo(markersLayerRef.current);
        bounds.extend([item.lat, item.lng]);
      });

      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
      mapRef.current.invalidateSize();
    };

    renderMap();

    return () => {
      disposed = true;
    };
  }, [items]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  const orderedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'club' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [items]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.mapSearchPlaceholder} />
        <Button onClick={() => loadData(query)} disabled={loading}>
          {loading ? t.mapLoadingButton : t.mapSearchButton}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showClubs && showTournaments ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setShowClubs(true);
            setShowTournaments(true);
          }}
        >
          {t.mapFilterAll}
        </Button>
        <Button
          variant={showClubs && !showTournaments ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setShowClubs(true);
            setShowTournaments(false);
          }}
        >
          {t.mapFilterClubs}
        </Button>
        <Button
          variant={!showClubs && showTournaments ? 'default' : 'outline'}
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
        <div ref={mapContainerRef} className="min-h-[420px] rounded-xl border border-border/50 bg-muted/20" />
        <div className="max-h-[420px] space-y-2 overflow-auto rounded-xl border border-border/50 p-3">
          {orderedItems.map((item) => (
            <Link key={`${item.kind}-${item.id}`} href={item.href} className="block rounded-lg border border-border/40 p-3 hover:bg-muted/20">
              <div className="text-xs text-muted-foreground">{item.kind === 'club' ? t.mapKindClub : t.mapKindTournament}</div>
              <div className="font-medium">{item.name}</div>
              {item.address && <div className="text-sm text-muted-foreground">{item.address}</div>}
              {!item.mapReady && <div className="text-xs text-warning mt-1">{t.mapNotGeocodedHint}</div>}
            </Link>
          ))}
          {orderedItems.length === 0 && <div className="text-sm text-muted-foreground">{t.mapEmpty}</div>}
        </div>
      </div>
    </div>
  );
}
