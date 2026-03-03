import { apiFetch } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { Asset } from '$lib/types/asset.type';
import type { ApiResponse } from '$lib/types/api.type';

export async function getAssets(limit = 100): Promise<Asset[]> {
  const result = await apiFetch<ApiResponse<Asset[]>>(`${API_ENDPOINTS.ASSETS}?limit=${limit}`);
  return result.data;
}

export async function getAssetById(id: number): Promise<Asset> {
  const result = await apiFetch<ApiResponse<Asset>>(API_ENDPOINTS.ASSET_DETAIL(id));
  return result.data;
}

export async function createAsset(data: Record<string, unknown>): Promise<Asset> {
  const result = await apiFetch<ApiResponse<Asset>>(API_ENDPOINTS.ASSETS, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data;
}
