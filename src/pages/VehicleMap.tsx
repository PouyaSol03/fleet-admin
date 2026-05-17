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
const DEBOUNCE_DELAY_MS = 300;

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

function computeDynamicView(rows, viewportWidth, viewportHeight) {
  const points = rows.filter((row) => row.location?.lat != null && row.location?.lng != null);

  if (!points.length) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  if (points.length === 1) {
    return {
      center: { lat: Number(points[0].location.lat), lng: Number(points[0].location.lng) },
      zoom: 15
    };
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  points.forEach((p) => {
    const lat = Number(p.location.lat);
    const lng = Number(p.location.lng);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const padding = 100;
  const mapWidth = Math.max(viewportWidth - padding, 100);
  const mapHeight = Math.max(viewportHeight - padding, 100);

  let perfectZoom = 19;
  for (let z = 19; z >= 3; z--) {
    const minX = lonToTileX(minLng, z) * TILE_SIZE;
    const maxX = lonToTileX(maxLng, z) * TILE_SIZE;
    const minY = latToTileY(maxLat, z) * TILE_SIZE;
    const maxY = latToTileY(minLat, z) * TILE_SIZE;

    if (Math.abs(maxX - minX) <= mapWidth && Math.abs(maxY - minY) <= mapHeight) {
      perfectZoom = z;
      break;
    }
  }

  if (perfectZoom > 16) perfectZoom = 16;
  return { center: { lat: centerLat, lng: centerLng }, zoom: perfectZoom };
}

function vehicleStatus(row) {
  if (!row.imei) {
    return {
      label: 'بدون IMEI',
      dot: 'bg-slate-400',
      badge: 'bg-slate-50 text-slate-600 border border-slate-200',
    };
  }
  if (row.status === 'active' && row.traccarMotion) {
    return {
      label: 'در حرکت',
      dot: 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }
  if (row.status === 'active') {
    return {
      label: 'آنلاین',
      dot: 'bg-blue-500 ring-4 ring-blue-500/20',
      badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
  }
  if (row.status === 'maintenance') {
    return {
      label: 'تعمیر و نگهداری',
      dot: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  return {
    label: 'آفلاین',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
  };
}

function VehicleIcon() {
  return (
    <img
      src="/Car.png"
      alt=""
      draggable="false"
      className="h-12 w-auto select-none object-contain relative z-10"
      aria-hidden="true"
    />
  );
}

function VehicleListItem({ row, isSelected, onSelect }) {
  const status = vehicleStatus(row);
  const speed = Number(row.traccarSpeedKmh || 0);

  return (
    <div
      onClick={() => onSelect(row)}
      className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-xs transition-all duration-300 cursor-pointer text-right ${isSelected
          ? 'border-blue-500 bg-blue-50/70 shadow-lg ring-2 ring-blue-500/10'
          : 'border-slate-100/60 bg-white/90 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
          <h4 className="truncate font-bold text-sm text-slate-800">{row.model || 'خودرو بدون نام'}</h4>
        </div>
        <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${status.badge}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="font-semibold text-xs px-2.5 py-1 bg-slate-100 rounded-xl text-slate-700 tracking-wide" dir="ltr">
          {row.plateNumber || 'بدون پلاک'}
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="font-bold text-sm text-slate-800" dir="ltr">{formatNumber(speed)}</span>
          <span className="text-[10px] text-slate-400 font-medium">km/h</span>
        </div>
      </div>
    </div>
  );
}

function VehicleMarker({ row, left, top, isSelected, rotation }) {
  const status = vehicleStatus(row);
  const speed = Number(row.traccarSpeedKmh || 0);

  return (
    <div
      className="group absolute z-10 outline-none hover:z-50 focus-within:z-50 will-change-transform"
      style={{
        left,
        top,
        transform: `translate3d(-50%, -100%, 0px) rotate(${-rotation}deg)`
      }}
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col items-center relative">
        {isSelected && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none z-0 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500/30 opacity-75 animate-ping" />
            <span className="absolute inline-flex h-12 w-12 rounded-full bg-blue-500/20 opacity-100 animate-pulse border border-blue-500/40" />
          </div>
        )}
        <div className="relative transition duration-300 drop-shadow-[0_10px_15px_rgba(15,23,42,0.25)] group-hover:scale-110 group-focus:scale-110 z-10">
          <VehicleIcon />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[66px] left-1/2 w-[300px] -translate-x-1/2 translate-y-2 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 z-30">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 text-right shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                <span className={`rounded-xl px-2 py-0.5 text-[11px] font-bold ${status.badge}`}>
                  {status.label}
                </span>
              </div>
              <h3 className="mt-2 truncate text-base font-bold text-slate-800">{row.model || 'خودرو'}</h3>
              <p className="mt-0.5 truncate text-xs text-slate-400">{row.driverName || 'راننده تعیین نشده'}</p>
            </div>
            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <VehicleIcon />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-medium text-slate-400">پلاک</div>
              <div className="mt-1 truncate text-xs font-bold text-slate-800" dir="ltr">{row.plateNumber || '-'}</div>
            </div>
            <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-medium text-slate-400">سرعت</div>
              <div className="mt-1 truncate text-xs font-bold text-slate-800">{`${formatNumber(speed)} km/h`}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <span className="truncate font-mono" dir="ltr">
              {Number(row.location?.lat).toFixed(5)}, {Number(row.location?.lng).toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${row.location?.lat},${row.location?.lng}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-1.5 font-bold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md"
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
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const animationRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rotation, setRotation] = useState(0);

  const activePointers = useRef(new Map());

  const canView = hasPermission(user, 'map.view');

  const animateRotation = (targetRotation) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const duration = 500; 
    const startTime = performance.now();

    let startRotation = rotation;
    if (startRotation > 180) startRotation -= 360;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + (targetRotation - startRotation) * easeOutCubic;

      const normalizedRot = currentRot < 0 ? currentRot + 360 : currentRot;

      setRotation(normalizedRot);

      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate3d(0px, 0px, 0px) rotate(${normalizedRot}deg)`;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return undefined;

    const updateViewport = () => {
      setViewport({
        width: element.getBoundingClientRect().width || DEFAULT_VIEWPORT.width,
        height: element.getBoundingClientRect().height || DEFAULT_VIEWPORT.height,
      });
    };

    updateViewport();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateViewport);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await vehiclesAPI.listLive();
        if (mounted) {
          const liveRows = normalizeCollection(response.data);
          const validImeiRows = liveRows.filter(row => row.imei !== null && row.imei !== undefined && row.imei !== '');

          setRows(validImeiRows);

          const currentWidth = mapRef.current ? mapRef.current.getBoundingClientRect().width : DEFAULT_VIEWPORT.width;
          const currentHeight = mapRef.current ? mapRef.current.getBoundingClientRect().height : DEFAULT_VIEWPORT.height;

          const view = computeDynamicView(validImeiRows, currentWidth, currentHeight);
          setCenter(view.center);
          setZoom(view.zoom);
          setError('');
        }
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری نقشه خودروها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [canView]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate3d(0px, 0px, 0px) rotate(${rotation}deg)`;
    }
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [center, zoom, rotation]);

  if (!canView) return <AccessDenied />;
  if (loading) return <LoadingState />;

  const filteredRows = rows.filter(row => statusFilter === 'all' || row.status === statusFilter);
  const markerRows = filteredRows.filter((row) => row.location?.lat != null && row.location?.lng != null);
  const centerTileX = lonToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const centerPixelX = centerTileX * TILE_SIZE;
  const centerPixelY = centerTileY * TILE_SIZE;
  const halfWidth = viewport.width / 2;
  const halfHeight = viewport.height / 2;

  // بافر به ۴ تایل افزایش پیدا کرد تا در هنگام جابجایی در زوایای مختلف، پس‌زمینه سفید ظاهر نشود
  const bufferTiles = 4;
  const startTileX = Math.floor((centerPixelX - halfWidth) / TILE_SIZE) - bufferTiles;
  const endTileX = Math.floor((centerPixelX + halfWidth) / TILE_SIZE) + bufferTiles;
  const startTileY = Math.floor((centerPixelY - halfHeight) / TILE_SIZE) - bufferTiles;
  const endTileY = Math.floor((centerPixelY + halfHeight) / TILE_SIZE) + bufferTiles;
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

  // رویداد فشردن دکمه موس یا لمس صفحه
  const handlePointerDown = (event) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    // دکمه ۲ یعنی راست‌کلیک، یا در صورت حضور بیش از ۱ کلیک همزمان، به مد چرخش می‌رویم
    const isRotateMode = event.buttons === 3 || event.button === 2 || activePointers.current.size > 1;

    dragRef.current = {
      isRotateMode,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
      currentDeltaX: 0,
      currentDeltaY: 0,
    };
  };

  // رویداد تکان دادن موس یا انگشت روی نقشه
  const handlePointerMove = (event) => {
    if (!dragRef.current || !activePointers.current.has(event.pointerId)) return;

    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    // سناریو ۱: فعال بودن همزمان دو دکمه موس (چپ و راست) -> مود چرخش نقشه
    if (dragRef.current.isRotateMode || event.buttons === 3) {
      // تغییر چرخش بر اساس حرکت افقی موس (کشش به راست یا چپ)
      const rotationSpeedFactor = 0.4;
      const newRotation = (dragRef.current.startRotation + deltaX * rotationSpeedFactor) % 360;
      setRotation(newRotation < 0 ? newRotation + 360 : newRotation);

      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate3d(0px, 0px, 0px) rotate(${newRotation}deg)`;
      }
    }
    // سناریو ۲: فقط یک کلیک (چپ‌کلیک استاندارد) -> حرکت روی نقشه (Pan)
    else {
      dragRef.current.currentDeltaX = deltaX;
      dragRef.current.currentDeltaY = deltaY;

      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0px) rotate(${rotation}deg)`;
      }
    }
  };

  // رویداد رها کردن دکمه موس
  const handlePointerUp = (event) => {
    activePointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!dragRef.current) return;
    const { currentDeltaX, currentDeltaY, isRotateMode } = dragRef.current;
    dragRef.current = null;

    // اعمال فیزیک حرکت نقشه، در صورتی که در حالت چرخش نبوده‌ایم
    if (!isRotateMode && (Math.abs(currentDeltaX) > 1 || Math.abs(currentDeltaY) > 1)) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      debounceTimeoutRef.current = setTimeout(() => {
        const rad = (rotation * Math.PI) / 180;
        const rotatedDeltaX = currentDeltaX * Math.cos(rad) + currentDeltaY * Math.sin(rad);
        const rotatedDeltaY = -currentDeltaX * Math.sin(rad) + currentDeltaY * Math.cos(rad);

        const nextCenterTileX = centerTileX - (rotatedDeltaX / TILE_SIZE);
        const nextCenterTileY = centerTileY - (rotatedDeltaY / TILE_SIZE);

        setCenter({
          lat: tileYToLat(nextCenterTileY, zoom),
          lng: tileXToLon(nextCenterTileX, zoom),
        });
      }, DEBOUNCE_DELAY_MS);
    }
  };

  const panTo = (targetLat, targetLng) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const duration = 800;
    const startTime = performance.now();
    let currentLat = center.lat;
    let currentLng = center.lng;

    setCenter((prev) => {
      currentLat = prev.lat;
      currentLng = prev.lng;
      return prev;
    });

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const nextLat = currentLat + (targetLat - currentLat) * easeOutCubic;
      const nextLng = currentLng + (targetLng - currentLng) * easeOutCubic;

      setCenter({ lat: nextLat, lng: nextLng });
      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    if (vehicle.location?.lat && vehicle.location?.lng) {
      panTo(Number(vehicle.location.lat), Number(vehicle.location.lng));
      setZoom(16);
      setIsBottomSheetOpen(false);
    }
  };

  const handleOpenMobileBottomSheet = () => {
    const currentWidth = mapRef.current ? mapRef.current.getBoundingClientRect().width : DEFAULT_VIEWPORT.width;
    const currentHeight = mapRef.current ? mapRef.current.getBoundingClientRect().height : DEFAULT_VIEWPORT.height;

    const view = computeDynamicView(filteredRows, currentWidth, currentHeight);
    setCenter(view.center);
    setZoom(view.zoom);
    setIsBottomSheetOpen(true);
  };

  const filterTabs = [
    { id: 'all', label: 'همه', active: 'bg-slate-900 text-white shadow-xs' },
    { id: 'active', label: 'آنلاین', active: 'bg-blue-50 text-white ring-1 bg-blue-500 shadow-sm shadow-blue-500/10' },
    { id: 'inactive', label: 'آفلاین', active: 'bg-rose-50 text-white ring-1 bg-rose-500 shadow-sm shadow-rose-500/10' },
    { id: 'maintenance', label: 'تعمیرات', active: 'bg-amber-50 text-white ring-1 bg-amber-500 shadow-sm shadow-amber-500/10' }
  ];

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-slate-900" dir="rtl">

      <div
        ref={mapRef}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing z-10"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()} // جلوگیری از باز شدن منوی کلیک راست پیش‌فرض بر روی نقشه
      >
        <div
          ref={canvasRef}
          className="absolute inset-0 origin-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {mapTiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              draggable="false"
              className="absolute h-64 w-64 max-w-none select-none transition-opacity duration-300"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}

          {markerRows.map((row) => {
            const pointPixelX = lonToTileX(Number(row.location.lng), zoom) * TILE_SIZE;
            const pointPixelY = latToTileY(Number(row.location.lat), zoom) * TILE_SIZE;
            const left = pointPixelX - centerPixelX + halfWidth;
            const top = pointPixelY - centerPixelY + halfHeight;

            return (
              <VehicleMarker
                key={row.id}
                row={row}
                left={left}
                top={top}
                isSelected={selectedVehicleId === row.id}
                rotation={rotation}
              />
            );
          })}
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-85 max-h-[calc(100%-4rem)] absolute right-6 top-6 bottom-6 bg-white/85 border border-white/40 shadow-2xl rounded-[28px] z-20 backdrop-blur-md overflow-hidden pointer-events-auto">
        <div className="p-5 pb-4 border-b border-slate-100/60 bg-slate-50/40">
          <h3 className="font-bold text-lg text-slate-800">ناوگان زنده</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">مجموعاً {filteredRows.length} خودرو فعال روی نقشه</p>

          <div className="flex flex-wrap justify-between gap-1.5 mt-4">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-95 cursor-pointer select-none ${statusFilter === tab.id
                    ? tab.active
                    : 'bg-slate-100/70 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 content-start">
          {filteredRows.length === 0 ? (
            <p className="text-center text-sm text-slate-400 mt-8">خودرویی در این وضعیت یافت نشد.</p>
          ) : (
            filteredRows.map((row) => (
              <VehicleListItem
                key={row.id}
                row={row}
                isSelected={selectedVehicleId === row.id}
                onSelect={handleSelectVehicle}
              />
            ))
          )}
        </div>
      </div>

      {/* Zoom / Reset Controls */}
      <div className="absolute left-6 top-6 z-20 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(current + 1, 19))}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-white/95 text-xl font-semibold text-slate-800 shadow-lg border border-slate-100/70 hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all outline-none"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(current - 1, 3))}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-white/95 text-xl font-semibold text-slate-800 shadow-lg border border-slate-100/70 hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all outline-none"
        >
          −
        </button>

        {rotation !== 0 && (
          <button
            type="button"
            onClick={() => animateRotation(0)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-blue-600 text-xs font-bold text-white shadow-lg border border-blue-700 hover:bg-blue-700 active:scale-95 transition-all outline-none animate-fadeIn"
            title="ریست زاویه نقشه (رو به شمال)"
          >
            N
          </button>
        )}
      </div>

      <div className="absolute left-6 top-32 z-20 min-w-[220px] max-w-[calc(100vw-2rem)] md:left-auto md:right-96 md:top-6">
        <ErrorAlert message={error} />
      </div>

      {/* Bottom Sheet Trigger - Mobile */}
      <button
        type="button"
        onClick={handleOpenMobileBottomSheet}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 md:hidden flex items-center justify-center bg-blue-600 text-white font-bold px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/30 active:scale-95 transition-all duration-200 max-w-[90vw]"
      >
        <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
          مشاهده لیست خودروها ({filteredRows.length})
        </span>
      </button>

      {/* Bottom Sheet - Mobile */}
      {isBottomSheetOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsBottomSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-[32px] max-h-[75vh] flex flex-col shadow-2xl animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center py-3.5 cursor-pointer" onClick={() => setIsBottomSheetOpen(false)}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors" />
            </div>

            <div className="px-5 pb-4 border-b border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800">لیست خودروها</h3>
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-xl">{filteredRows.length} مورد</span>
              </div>

              <div className="flex flex-wrap justify-between gap-1.5 mt-2">
                {filterTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${statusFilter === tab.id
                        ? tab.active
                        : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {filteredRows.length === 0 ? (
                <p className="text-center text-sm text-slate-400 mt-4">خودرویی یافت نشد.</p>
              ) : (
                filteredRows.map((row) => (
                  <VehicleListItem
                    key={row.id}
                    row={row}
                    isSelected={selectedVehicleId === row.id}
                    onSelect={handleSelectVehicle}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  );
}