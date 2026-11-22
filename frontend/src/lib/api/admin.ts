import { api, API_BASE_URL } from '@/lib/api/client';
import type {
  AccountType,
  AdminAreaItem,
  AdminAuditLogItem,
  AdminCompanyItem,
  AdminDashboardStats,
  AdminOverviewStats,
  AdminProperty,
  ApiResponse,
  AvailabilityStatus,
  BuyerRequestItem,
  Category,
  CategoryPayload,
  Location,
  LocationPayload,
  ModerationDecisionPayload,
  ModerationStatus,
  PropertyReportItem,
  TransactionType,
  UpdateUserStatusPayload,
  User,
  UserRole,
  UserStatus,
} from '@/types/api';
import type { PortalPropertyPayload } from './portal';

export interface AdminPropertiesQuery {
  trashed?: 'with' | 'only' | '';
  status?: 'pending' | 'approved' | 'rejected' | 'stale' | '';
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

export async function getAdminOverview(): Promise<ApiResponse<AdminOverviewStats>> {
  return api.get<AdminOverviewStats>('/admin/overview');
}

export async function getAdminProperties(
  query: AdminPropertiesQuery = {}
): Promise<ApiResponse<AdminProperty[]>> {
  const qs = buildQuery({
    trashed: query.trashed,
    status: query.status,
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

export async function moderateAdminProperty(
  propertyId: number | string,
  payload: {
    action?: 'approve' | 'reject' | 'feature' | 'unfeature';
    status?: 'approved' | 'rejected';
    rejection_reason?: string;
    is_featured?: boolean;
  }
): Promise<ApiResponse<AdminProperty>> {
  return api.patch<AdminProperty>(`/admin/properties/${propertyId}/moderate`, payload);
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

export async function updateAdminUserRole(
  userId: number | string,
  role: UserRole
): Promise<ApiResponse<User>> {
  return api.patch<User>(`/admin/users/${userId}/role`, { role });
}

export async function getAdminCompanies(query?: {
  q?: string;
  is_verified?: boolean | '';
  plan_tier?: 'free' | 'partner' | 'enterprise' | '';
  page?: number;
  per_page?: number;
}): Promise<ApiResponse<AdminCompanyItem[]>> {
  const qs = buildQuery({
    q: query?.q,
    is_verified: query?.is_verified,
    plan_tier: query?.plan_tier,
    page: query?.page,
    per_page: query?.per_page ?? 30,
  });
  return api.get<AdminCompanyItem[]>(`/admin/companies${qs}`);
}

export async function updateAdminCompany(
  companyId: number | string,
  payload: {
    is_verified?: boolean;
    plan_tier?: 'free' | 'partner' | 'enterprise';
    max_properties?: number;
    plan_expires_at?: string | null;
  }
): Promise<ApiResponse<AdminCompanyItem>> {
  return api.patch<AdminCompanyItem>(`/admin/companies/${companyId}`, payload);
}

export async function getAdminAreas(): Promise<ApiResponse<AdminAreaItem[]>> {
  return api.get<AdminAreaItem[]>('/admin/areas');
}

export async function createAdminArea(payload: {
  name: string;
  city?: string;
  is_active?: boolean;
}): Promise<ApiResponse<AdminAreaItem>> {
  return api.post<AdminAreaItem>('/admin/areas', payload);
}

export async function updateAdminArea(
  areaId: number | string,
  payload: {
    name?: string;
    city?: string;
    is_active?: boolean;
  }
): Promise<ApiResponse<AdminAreaItem>> {
  return api.patch<AdminAreaItem>(`/admin/areas/${areaId}`, payload);
}

export async function deleteAdminArea(areaId: number | string): Promise<ApiResponse<null>> {
  return api.delete<null>(`/admin/areas/${areaId}`);
}

export async function getAdminReports(
  status?: 'open' | 'resolved' | ''
): Promise<ApiResponse<PropertyReportItem[]>> {
  const qs = buildQuery({ status, per_page: 50 });
  return api.get<PropertyReportItem[]>(`/admin/reports${qs}`);
}

export async function updateAdminReport(
  reportId: number | string,
  payload: {
    status: 'open' | 'resolved';
    reject_property?: boolean;
    rejection_reason?: string;
  }
): Promise<ApiResponse<PropertyReportItem>> {
  return api.patch<PropertyReportItem>(`/admin/reports/${reportId}`, payload);
}

export async function getAdminBuyerRequests(
  status?: 'new' | 'assigned' | 'closed' | ''
): Promise<ApiResponse<BuyerRequestItem[]>> {
  const qs = buildQuery({ status, per_page: 50 });
  return api.get<BuyerRequestItem[]>(`/admin/buyer-requests${qs}`);
}

export async function updateAdminBuyerRequest(
  requestId: number | string,
  payload: {
    status?: 'new' | 'assigned' | 'closed';
    assigned_company_id?: number | null;
  }
): Promise<ApiResponse<BuyerRequestItem>> {
  return api.patch<BuyerRequestItem>(`/admin/buyer-requests/${requestId}`, payload);
}

export async function updateAdminSiteSettings(
  formData: FormData
): Promise<ApiResponse<Record<string, string>>> {
  return api.post<Record<string, string>>('/admin/site-settings', formData);
}

export async function getAdminAuditLogs(
  page: number = 1
): Promise<ApiResponse<AdminAuditLogItem[]>> {
  return api.get<AdminAuditLogItem[]>(`/admin/audit-logs?page=${page}&per_page=30`);
}

export function getAdminExportCsvUrl(
  type: 'users' | 'companies' | 'properties' | 'buyer-requests'
): string {
  const base = API_BASE_URL.endsWith('/api/v1')
    ? API_BASE_URL
    : `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;
  return `${base}/admin/export/${type}`;
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
