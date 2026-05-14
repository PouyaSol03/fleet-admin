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
  SecondaryButton,
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

function vehicleStatus(row) {
  if (!row.imei) {
    return {
      label: 'بدون IMEI',
      dot: 'bg-[#7D7D7D]',
      pin: 'bg-[#7D7D7D]',
      glow: 'shadow-[0_0_0_6px_rgba(125,125,125,0.18)]',
      badge: 'bg-[#EFEFEF] text-[#606060]',
      border: 'border-[#D9D9D9]',
    };
  }

  if (row.traccarOnline && row.traccarMotion) {
    return {
      label: 'در حرکت',
      dot: 'bg-[#00992E]',
      pin: 'bg-[#00992E]',
      glow: 'shadow-[0_0_0_6px_rgba(0,153,46,0.18)]',
      badge: 'bg-[#E8F7EF] text-[#16803C]',
      border: 'border-[#BFEBD0]',
    };
  }

  if (row.traccarOnline) {
    return {
      label: 'آنلاین',
      dot: 'bg-[#206AB4]',
      pin: 'bg-[#206AB4]',
      glow: 'shadow-[0_0_0_6px_rgba(32,106,180,0.18)]',
      badge: 'bg-[#EAF3FC] text-[#206AB4]',
      border: 'border-[#BBD8F3]',
    };
  }

  if (row.trackingStatus === 'not_available') {
    return {
      label: 'بدون داده',
      dot: 'bg-[#FFB031]',
      pin: 'bg-[#FFB031]',
      glow: 'shadow-[0_0_0_6px_rgba(255,176,49,0.20)]',
      badge: 'bg-[#FFF6E6] text-[#9D6100]',
      border: 'border-[#FFE2AE]',
    };
  }

  return {
    label: 'آفلاین',
    dot: 'bg-[#FA5454]',
    pin: 'bg-[#FA5454]',
    glow: 'shadow-[0_0_0_6px_rgba(250,84,84,0.18)]',
    badge: 'bg-[#FFE6E6] text-[#A30000]',
    border: 'border-[#FFD0D0]',
  };
}

function VehicleIcon() {
  return (
    <img
      src="/Car.png"
      alt=""
      draggable="false"
      className="h-12 w-auto select-none object-contain"
      aria-hidden="true"
    />
  );
}

function VehicleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[#F7F9FB] px-3 py-2">
      <div className="text-[11px] font-medium text-[#7D7D7D]">{label}</div>
      <div className="mt-1 truncate text-xs font-bold text-[#222222]">{value || '-'}</div>
    </div>
  );
}

function VehicleMarker({ row, left, top }) {
  const status = vehicleStatus(row);
  const speed = Number(row.traccarSpeedKmh || 0);

  return (
    <div
      className="group absolute z-10 -translate-x-1/2 -translate-y-full outline-none"
      style={{ left, top }}
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col items-center">
        <div className="relative transition duration-200 drop-shadow-[0_6px_8px_rgba(15,23,42,0.28)] group-hover:scale-110 group-focus:scale-110">
          <VehicleIcon />
          {/* <span className={`absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-white ${status.dot}`} /> */}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[66px] left-1/2 w-[300px] -translate-x-1/2 translate-y-2 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="overflow-hidden rounded-[18px] border border-white/80 bg-white/95 text-right shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-[#EFEFEF] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${status.badge}`}>
                  {status.label}
                </span>
              </div>
              <h3 className="mt-2 truncate text-base font-bold text-[#222222]">{row.model || 'خودرو'}</h3>
              <p className="mt-0.5 truncate text-xs text-[#7D7D7D]">{row.driverName || 'راننده تعیین نشده'}</p>
            </div>
            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF3FC]">
              <VehicleIcon />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <VehicleMetric label="پلاک" value={row.plateNumber || '-'} />
            <VehicleMetric label="سرعت" value={`${formatNumber(speed)} km/h`} />
            <VehicleMetric label="IMEI" value={row.imei || '-'} />
            <VehicleMetric label="آخرین گزارش" value={formatDate(row.lastReportedAt, true)} />
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#FAFBFC] px-4 py-3 text-xs text-[#606060]">
            <span className="truncate">
              {Number(row.location.lat).toFixed(5)}, {Number(row.location.lng).toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${row.location.lat},${row.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-[10px] bg-[#206AB4] px-3 py-1.5 font-bold text-white transition hover:bg-[#15558F]"
              onPointerDown={(event) => event.stopPropagation()}
            >
              مسیر
            </a>
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-linear-to-b from-blue-50 to-slate-100">
      <div
        ref={mapRef}
        className="relative h-full w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
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
            <VehicleMarker key={row.id} row={row} left={left} top={top} />
          );
        })}
      </div>

      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" onClick={() => setZoom((current) => Math.max(current - 1, 3))}>-</SecondaryButton>
        <Badge tone="blue">زوم {zoom}</Badge>
        <SecondaryButton type="button" onClick={() => setZoom((current) => Math.min(current + 1, 19))}>+</SecondaryButton>
      </div>

      <div className="absolute right-4 top-4 z-20 min-w-[220px] max-w-[min(520px,calc(100vw-2rem))]">
        <ErrorAlert message={error} />
      </div>
    </div>
  );
}
