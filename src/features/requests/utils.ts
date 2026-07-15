import { formatPlateForDisplay } from '../../utils/iranPlate';

export function getVehicleLabel(vehicle: any) {
  return [vehicle?.model, vehicle?.plateNumber ? formatPlateForDisplay(vehicle.plateNumber) : ''].filter(Boolean).join(' - ') || `خودرو #${vehicle?.id}`;
}

export function getDriverLabel(driver: any) {
  return driver?.name || driver?.fullName || driver?.userName || `راننده #${driver?.id}`;
}

export function vehicleBelongsToDriver(vehicle: any, driverId: string | number) {
  if (!driverId) return false;
  const selected = String(driverId);
  if (String(vehicle?.driverId || '') === selected) return true;
  return Array.isArray(vehicle?.driverIds) && vehicle.driverIds.map(String).includes(selected);
}

export function getPrimaryVehicleForDriver(vehicles: any[], driverId: string | number) {
  if (!driverId) return null;
  return (
    vehicles.find((vehicle) => String(vehicle?.driverId || '') === String(driverId)) ||
    vehicles.find((vehicle) => vehicleBelongsToDriver(vehicle, driverId)) ||
    null
  );
}
