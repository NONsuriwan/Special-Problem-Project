import { apiFetch } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { MasterData, Room } from '$lib/types/asset.type';
import type { ApiResponse } from '$lib/types/api.type';

export async function getDepartments(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.DEPARTMENTS);
  return result.data || [];
}

export async function getActivities(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.ACTIVITIES);
  return result.data || [];
}

export async function getFunds(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.FUNDS);
  return result.data || [];
}

export async function getAssetTypes(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.ASSET_TYPES);
  return result.data || [];
}

export async function getAcquisitionSources(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES);
  return result.data || [];
}

export async function getAcquisitionMethods(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.ACQUISITION_METHODS);
  return result.data || [];
}

export async function getBuildings(): Promise<MasterData[]> {
  const result = await apiFetch<ApiResponse<MasterData[]>>(API_ENDPOINTS.MASTERS.BUILDINGS);
  return result.data || [];
}

export async function getRooms(): Promise<Room[]> {
  const result = await apiFetch<ApiResponse<Room[]>>(API_ENDPOINTS.MASTERS.ROOMS);
  return result.data || [];
}
