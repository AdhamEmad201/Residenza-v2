import { api, API_BASE_URL, ApiError, resolveRuntimeUrl } from '@/lib/api/client';
import type {
  AccountType,
  ApiResponse,
  BuyerRequestItem,
  Category,
  FacadeType,
  FinishingType,
  LegalStatus,
  Location,
  LocationType,
  PaymentMethod,
  PropertyReportItem,
  PropertyType,
  PublicProperty,
  RentalPeriod,
  SiteConfigData,
  TransactionType,
} from '@/types/api';
import type { CompanyProfile, CompanyStorefrontResponse } from '@/types/company';

export interface PropertySearchFilters {
  transaction_type?: TransactionType | '';
  property_type?: PropertyType | '';
  category_id?: number | string;
  location_id?: number | string;
  payment_method?: PaymentMethod | '';
  min_price?: number | string;
  max_price?: number | string;
  min_area?: number | string;
  max_area?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  finishing_type?: FinishingType | '';
  q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | '';
  page?: number | string;
  per_page?: number | string;
}

export interface PaginatedPublicProperties {
  items: PublicProperty[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value).trim());
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function fetchPublicEndpoint<T>(path: string): Promise<ApiResponse<T>> {
  const url = resolveRuntimeUrl(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ApiError('تعذر الاتصال بخادم المنصة العقارية', 0, 'NETWORK_ERROR');
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('استجابة غير صالحة من الخادم', response.status, 'INVALID_RESPONSE');
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || 'تعذر جلب البيانات المطلوبة',
      response.status,
      payload.error_code || 'HTTP_ERROR',
      payload.errors
    );
  }

  return payload;
}

export async function getPublicCategories(options?: {
  property_type?: PropertyType;
  flat?: boolean;
}): Promise<Category[]> {
  try {
    const qs = buildQueryString({
      property_type: options?.property_type,
      flat: options?.flat ? '1' : undefined,
    });
    const res = await fetchPublicEndpoint<Category[]>(`/categories${qs}`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getPublicLocations(options?: {
  type?: LocationType;
  parent_id?: number;
  flat?: boolean;
}): Promise<Location[]> {
  try {
    const qs = buildQueryString({
      type: options?.type,
      parent_id: options?.parent_id,
      flat: options?.flat ? '1' : undefined,
    });
    const res = await fetchPublicEndpoint<Location[]>(`/locations${qs}`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getPublicProperties(
  filters: PropertySearchFilters = {}
): Promise<PaginatedPublicProperties> {
  try {
    const qs = buildQueryString({
      transaction_type: filters.transaction_type,
      property_type: filters.property_type,
      category_id: filters.category_id,
      location_id: filters.location_id,
      payment_method: filters.payment_method,
      min_price: filters.min_price,
      max_price: filters.max_price,
      min_area: filters.min_area,
      max_area: filters.max_area,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      finishing_type: filters.finishing_type,
      q: filters.q,
      sort: filters.sort,
      page: filters.page,
      per_page: filters.per_page,
    });

    const res = await fetchPublicEndpoint<PublicProperty[]>(`/properties${qs}`);
    return {
      items: res.data ?? [],
      meta: res.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: Number(filters.per_page) || 12,
        total: (res.data ?? []).length,
      },
    };
  } catch {
    return {
      items: [],
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: Number(filters.per_page) || 12,
        total: 0,
      },
    };
  }
}

export async function getPublicPropertyBySlug(slug: string): Promise<PublicProperty | null> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    const res = await fetchPublicEndpoint<PublicProperty>(`/properties/${encodedSlug}`);
    return res.data ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    return null;
  }
}

export async function getPublicCompanies(options?: {
  verified?: boolean;
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<CompanyProfile[]> {
  try {
    const qs = buildQueryString({
      verified: options?.verified ? '1' : undefined,
      q: options?.q,
      page: options?.page,
      per_page: options?.per_page,
    });
    const res = await fetchPublicEndpoint<CompanyProfile[]>(`/companies${qs}`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getPublicCompanyStorefront(
  slug: string,
  filters?: {
    transaction_type?: TransactionType | '';
    project_id?: number | string;
    q?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | '';
    page?: number | string;
    per_page?: number | string;
  }
): Promise<CompanyStorefrontResponse | null> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    const qs = buildQueryString({
      transaction_type: filters?.transaction_type,
      project_id: filters?.project_id,
      q: filters?.q,
      sort: filters?.sort,
      page: filters?.page,
      per_page: filters?.per_page ?? 50,
    });
    const res = await fetchPublicEndpoint<CompanyStorefrontResponse>(`/companies/${encodedSlug}${qs}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export function trackPublicClick(payload: {
  type: 'whatsapp' | 'phone' | 'view';
  target_type: 'property' | 'company';
  id: number;
}): void {
  if (typeof window === 'undefined' || !payload.id) return;
  void api.post('/track/click', payload).catch(() => {
    // Non-blocking background tracking
  });
}

export async function submitPropertyReport(
  propertyId: number,
  payload: {
    reporter_phone?: string;
    reason: string;
    notes?: string;
  }
): Promise<ApiResponse<PropertyReportItem>> {
  return api.post<PropertyReportItem>(`/properties/${propertyId}/report`, payload);
}

export async function submitBuyerRequest(payload: {
  name: string;
  phone: string;
  property_type: string;
  area: string;
  budget_max?: number | string | null;
  notes?: string;
}): Promise<ApiResponse<BuyerRequestItem>> {
  return api.post<BuyerRequestItem>('/buyer-requests', payload);
}

export async function getPublicSiteConfig(): Promise<SiteConfigData | null> {
  try {
    const res = await fetchPublicEndpoint<SiteConfigData>('/site-config');
    return res.data ?? null;
  } catch {
    return null;
  }
}

// Arabic domain labels centralized for consistent UI rendering
export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  sale: 'للبيع',
  rent: 'للإيجار',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  administrative: 'إداري',
  land: 'أراضي',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'كاش فقط',
  installment: 'تقسيط',
  cash_or_installment: 'كاش أو تقسيط',
};

export const RENTAL_PERIOD_LABELS: Record<RentalPeriod, string> = {
  monthly: 'شهرياً',
  quarterly: 'ربع سنوي',
  yearly: 'سنوياً',
  daily: 'يومياً',
};

export const FINISHING_TYPE_LABELS: Record<FinishingType, string> = {
  core_and_shell: 'طوب أحمر / بدون تشطيب',
  semi_finished: 'نصف تشطيب (محارة وحلوق)',
  fully_finished: 'تشطيب كامل',
  lux: 'تشطيب لوكس',
  super_lux: 'تشطيب سوبر لوكس',
};

export const FACADE_TYPE_LABELS: Record<FacadeType, string> = {
  northern: 'بحرية',
  southern: 'قبلية',
  eastern: 'شرقية',
  western: 'غربية',
  corner: 'ناصية (ممر / شارعين)',
  two_streets: 'على شارعين',
  main_street: 'شارع رئيسي',
  nile_view: 'إطلالة مباشرة على النيل',
};

export const LEGAL_STATUS_LABELS: Record<LegalStatus, string> = {
  registered_shahr_aqari: 'مسجل شهر عقاري',
  seha_tawqee: 'حكم صحة توقيع',
  allocation_decision: 'قرار تخصيص (جهاز المدينة)',
  initial_contract: 'عقد ابتدائي بتسلسل ملكية',
  inheritance_deed: 'إعلام وراثة شرعي',
  other: 'مستند ملكية آخر',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: 'مالك العقار (فرد)',
  broker: 'وسيط عقاري معتمد',
  company: 'شركة تطوير / تسويق عقاري',
  admin: 'إدارة منصة ريزيدنزا',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  governorate: 'محافظة',
  city: 'مدينة',
  markaz: 'مركز إداري',
  district: 'حي / منطقة',
  village: 'قرية تابعة',
};
