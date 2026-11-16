import { api } from '@/lib/api/client';
import type {
  AccountType,
  AdminDashboardStats,
  AdminProperty,
  ApiResponse,
  AvailabilityStatus,
  Category,
  CategoryPayload,
  Location,
  LocationPayload,
  ModerationDecisionPayload,
  ModerationStatus,
  TransactionType,
  UpdateUserStatusPayload,
  User,
  UserRole,
  UserStatus,
} from '@/types/api';
import type { PortalPropertyPayload } from './portal';

export interface AdminPropertiesQuery {
  trashed?: 'with' | 'only' | '';
  moderation_status?: ModerationStatus | '';
  availability_status?: AvailabilityStatus | '';
  transaction_type?: TransactionType | '';
  category_id?: number | string;
  location_id?: number | string;
  user_id?: number | string;
  is_featured?: boolean | '';
  q?: string;
  page?: number;
  per_page?: number;
}

export interface AdminUpdatePropertyPayload extends Partial<PortalPropertyPayload> {
  availability_status?: AvailabilityStatus;
  is_featured?: boolean;
}

export interface AdminUsersQuery {
  role?: UserRole | '';
  account_type?: AccountType | '';
  status?: UserStatus | '';
  q?: string;
  page?: number;
  per_page?: number;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      sp.set(k, String(v).trim());
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getAdminDashboard(): Promise<ApiResponse<AdminDashboardStats>> {
  return api.get<AdminDashboardStats>('/admin/dashboard');
}

export async function getAdminProperties(
  query: AdminPropertiesQuery = {}
): Promise<ApiResponse<AdminProperty[]>> {
  const qs = buildQuery({
    trashed: query.trashed,
    moderation_status: query.moderation_status,
    availability_status: query.availability_status,
    transaction_type: query.transaction_type,
    category_id: query.category_id,
    location_id: query.location_id,
    user_id: query.user_id,
    is_featured: query.is_featured,
    q: query.q,
    page: query.page,
    per_page: query.per_page,
  });
  return api.get<AdminProperty[]>(`/admin/properties${qs}`);
}

export async function adminDirectPublishProperty(
  payload: Omit<PortalPropertyPayload, 'submit'>
): Promise<ApiResponse<AdminProperty>> {
  return api.post<AdminProperty>('/admin/properties', payload);
}

export async function getAdminProperty(
  propertyId: number | string
): Promise<ApiResponse<AdminProperty>> {
  return api.get<AdminProperty>(`/admin/properties/${propertyId}`);
}

export async function adminUpdateProperty(
  propertyId: number | string,
  payload: AdminUpdatePropertyPayload
): Promise<ApiResponse<AdminProperty>> {
  return api.patch<AdminProperty>(`/admin/properties/${propertyId}`, payload);
}

export async function approveAdminProperty(
  propertyId: number | string,
  payload: ModerationDecisionPayload = {}
): Promise<ApiResponse<AdminProperty>> {
  return api.post<AdminProperty>(`/admin/properties/${propertyId}/approve`, payload);
}

export async function requestChangesAdminProperty(
  propertyId: number | string,
  reason: string
): Promise<ApiResponse<AdminProperty>> {
  return api.post<AdminProperty>(`/admin/properties/${propertyId}/request-changes`, {
    reason,
  });
}

export async function rejectAdminProperty(
  propertyId: number | string,
  reason: string
): Promise<ApiResponse<AdminProperty>> {
  return api.post<AdminProperty>(`/admin/properties/${propertyId}/reject`, {
    reason,
  });
}

export async function deleteAdminProperty(
  propertyId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/admin/properties/${propertyId}`);
}

export async function getAdminUsers(
  query: AdminUsersQuery = {}
): Promise<ApiResponse<User[]>> {
  const qs = buildQuery({
    role: query.role,
    account_type: query.account_type,
    status: query.status,
    q: query.q,
    page: query.page,
    per_page: query.per_page,
  });
  return api.get<User[]>(`/admin/users${qs}`);
}

export async function updateAdminUserStatus(
  userId: number | string,
  payload: UpdateUserStatusPayload
): Promise<ApiResponse<User>> {
  return api.patch<User>(`/admin/users/${userId}/status`, payload);
}

export async function getAdminCategories(): Promise<ApiResponse<Category[]>> {
  return api.get<Category[]>('/admin/categories');
}

export async function createAdminCategory(
  payload: CategoryPayload
): Promise<ApiResponse<Category>> {
  return api.post<Category>('/admin/categories', payload);
}

export async function updateAdminCategory(
  categoryId: number | string,
  payload: Partial<CategoryPayload>
): Promise<ApiResponse<Category>> {
  return api.put<Category>(`/admin/categories/${categoryId}`, payload);
}

export async function deleteAdminCategory(
  categoryId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/admin/categories/${categoryId}`);
}

export async function getAdminLocations(): Promise<ApiResponse<Location[]>> {
  return api.get<Location[]>('/admin/locations');
}

export async function createAdminLocation(
  payload: LocationPayload
): Promise<ApiResponse<Location>> {
  return api.post<Location>('/admin/locations', payload);
}

export async function updateAdminLocation(
  locationId: number | string,
  payload: Partial<LocationPayload>
): Promise<ApiResponse<Location>> {
  return api.put<Location>(`/admin/locations/${locationId}`, payload);
}

export async function deleteAdminLocation(
  locationId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/admin/locations/${locationId}`);
}
