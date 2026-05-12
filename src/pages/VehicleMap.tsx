// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, formatNumber, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  ErrorAlert,
  LoadingState,
  PageHeader,
  SecondaryButton,
  SectionCard,
} from '../components/shared/UI';

const TILE_URL = 'https://map.exirfirm.com/tile/{z}/{x}/{y}.png';
const TILE_SIZE = 256;
const DEFAULT_CENTER = { lat: 35.6892, lng: 51.389 };
const DEFAULT_ZOOM = 15;
const DEFAULT_VIEWPORT = { width: 1200, height: 640 };

function lonToTileX(lng, zoom) {
  return ((lng + 180) / 360) * (2 ** zoom);
}

function latToTileY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * (2 ** zoom);
}

function tileXToLon(tileX, zoom) {
  return (tileX / (2 ** zoom)) * 360 - 180;
}

function tileYToLat(tileY, zoom) {
  const n = Math.PI - (2 * Math.PI * tileY) / (2 ** zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function formatTileUrl(z, x, y) {
  return TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
}

function computeMapCenter(rows) {
  const points = rows.filter((row) => row.location?.lat != null && row.location?.lng != null);
  if (!points.length) return DEFAULT_CENTER;

  const lat = points.reduce((sum, row) => sum + Number(row.location.lat), 0) / points.length;
  const lng = points.reduce((sum, row) => sum + Number(row.location.lng), 0) / points.length;
  return { lat, lng };
}

function trackingBadge(row) {
  if (!row.imei) return <Badge tone="slate">بدون IMEI</Badge>;
  if (row.traccarOnline && row.traccarMotion) return <Badge tone="emerald">در حرکت</Badge>;
  if (row.traccarOnline) return <Badge tone="blue">آنلاین</Badge>;
  if (row.trackingStatus === 'not_available') return <Badge tone="amber">بدون داده</Badge>;
  return <Badge tone="red">آفلاین</Badge>;
}

export default function VehicleMap() {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);

  const canView = hasPermission(user, 'map.view');

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await vehiclesAPI.listLive();
        if (mounted) {
          const liveRows = normalizeCollection(response.data);
          setRows(liveRows);
          setCenter(computeMapCenter(liveRows));
          setError('');
        }
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری نقشه خودروها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return undefined;

    const updateViewport = () => {
      setViewport({
        width: element.clientWidth || DEFAULT_VIEWPORT.width,
        height: element.clientHeight || DEFAULT_VIEWPORT.height,
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (!canView) return <AccessDenied />;
  if (loading) return <LoadingState />;

  const markerRows = rows.filter((row) => row.location?.lat != null && row.location?.lng != null);
  const centerTileX = lonToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const centerPixelX = centerTileX * TILE_SIZE;
  const centerPixelY = centerTileY * TILE_SIZE;
  const halfWidth = viewport.width / 2;
  const halfHeight = viewport.height / 2;
  const startTileX = Math.floor((centerPixelX - halfWidth) / TILE_SIZE) - 1;
  const endTileX = Math.floor((centerPixelX + halfWidth) / TILE_SIZE) + 1;
  const startTileY = Math.floor((centerPixelY - halfHeight) / TILE_SIZE) - 1;
  const endTileY = Math.floor((centerPixelY + halfHeight) / TILE_SIZE) + 1;
  const maxTile = (2 ** zoom) - 1;
  const mapTiles = [];

  for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
    for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
      if (tileY < 0 || tileY > maxTile) continue;
      const normalizedTileX = ((tileX % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
      mapTiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        left: tileX * TILE_SIZE - centerPixelX + halfWidth,
        top: tileY * TILE_SIZE - centerPixelY + halfHeight,
        src: formatTileUrl(zoom, normalizedTileX, tileY),
      });
    }
  }

  const handlePointerDown = (event) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      centerTileX,
      centerTileY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const nextCenterTileX = dragRef.current.centerTileX - (deltaX / TILE_SIZE);
    const nextCenterTileY = dragRef.current.centerTileY - (deltaY / TILE_SIZE);

    setCenter({
      lat: tileYToLat(nextCenterTileY, zoom),
      lng: tileXToLon(nextCenterTileX, zoom),
    });
  };

  const handlePointerUp = (event) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="نقشه خودروها"
        description="نمای موقعیت لحظه‌ای خودروها با داده‌های Traccar و سرویس نقشه داخلی"
        action={(
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={() => setZoom((current) => Math.max(current - 1, 3))}>-</SecondaryButton>
            <Badge tone="blue">زوم {zoom}</Badge>
            <SecondaryButton type="button" onClick={() => setZoom((current) => Math.min(current + 1, 19))}>+</SecondaryButton>
          </div>
        )}
      />

      <ErrorAlert message={error} />

      <SectionCard
        title="نقشه زنده"
        subtitle={`تعداد خودروهای قابل نمایش: ${formatNumber(markerRows.length)}`}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-b from-blue-50 to-slate-100">
          <div
            ref={mapRef}
            className="relative h-[640px] w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {mapTiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                draggable="false"
                className="absolute h-64 w-64 max-w-none select-none"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}

            {markerRows.map((row) => {
              const pointPixelX = lonToTileX(Number(row.location.lng), zoom) * TILE_SIZE;
              const pointPixelY = latToTileY(Number(row.location.lat), zoom) * TILE_SIZE;
              const left = pointPixelX - centerPixelX + halfWidth;
              const top = pointPixelY - centerPixelY + halfHeight;

              return (
                <div
                  key={row.id}
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left, top }}
                >
                  <div className="min-w-[190px] rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-xs text-slate-900" style={{ boxShadow: '0 10px 26px -16px rgba(15,23,42,0.5)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{row.model}</strong>
                      {trackingBadge(row)}
                    </div>
                    <div className="mt-1 space-y-1 text-slate-600">
                      <div>پلاک: {row.plateNumber || '-'}</div>
                      <div>راننده: {row.driverName || '-'}</div>
                      <div>سرعت: {formatNumber(row.traccarSpeedKmh)} km/h</div>
                      <div>آخرین گزارش: {formatDate(row.lastReportedAt, true)}</div>
                    </div>
                  </div>
                  <div className="mx-auto h-4 w-4 rotate-45 rounded-[2px] border border-white bg-rose-600" />
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
