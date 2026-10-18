import axios from 'axios';
export interface InventoryItem {
  id: number; name: string; category: string; quantity: number;
  unit_price: number; location: string; reorder_level: number; created_at: string;
}
export type ItemInput = Omit<InventoryItem, 'id' | 'created_at'>;
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', timeout: 10000 });
export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return typeof error.response?.data?.error === 'string' ? error.response.data.error : 'Cannot reach the server. Check that the backend and Docker are running.';
  }
  return 'Something went wrong. Please try again.';
}
