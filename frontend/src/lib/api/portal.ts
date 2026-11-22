import { api, API_BASE_URL } from '@/lib/api/client';
import type {
  ApiResponse,
  AvailabilityStatus,
  DocumentType,
  FacadeType,
  FinishingType,
  LegalStatus,
  ModerationStatus,
  PaymentMethod,
  PortalProperty,
  PropertyDocument,
  PropertyImage,
  RentalPeriod,
  TransactionType,
  UpdateProfilePayload,
  User,
} from '@/types/api';
import type { CompanyProfile, CompanyProject } from '@/types/company';

export interface PortalPropertyPayload {
  submit?: boolean;
  project_id?: number | null;
  category_id: number;
  location_id: number;
  transaction_type: TransactionType;
  payment_method?: PaymentMethod | null;
  rental_period?: RentalPeriod | null;
  title_ar: string;
  description_ar: string;
  price_egp: number | string;
  installment_price_egp?: number | string | null;
  down_payment_egp?: number | string | null;
  installment_period_months?: number | null;
  insurance_deposit_egp?: number | string | null;
  area_sqm: number | string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor_level?: number | null;
  total_floors?: number | null;
  finishing_type?: FinishingType | null;
  building_year?: number | null;
  street_width_meters?: number | string | null;
  facade_type?: FacadeType | null;
  declared_legal_status?: LegalStatus | null;
  has_elevator?: boolean;
  has_electricity_meter?: boolean;
  has_water_meter?: boolean;
  has_natural_gas?: boolean;
  address_details_ar: string;
  contact_phone?: string;
  contact_whatsapp?: string;
}

export interface PortalPropertiesQuery {
  moderation_status?: ModerationStatus | '';
  availability_status?: AvailabilityStatus | '';
  page?: number;
  per_page?: number;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      sp.set(k, String(v).trim());
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function updatePortalProfile(
  payload: UpdateProfilePayload
): Promise<ApiResponse<User>> {
  return api.put<User>('/portal/profile', payload);
}

export async function getPortalProperties(
  query: PortalPropertiesQuery = {}
): Promise<ApiResponse<PortalProperty[]>> {
  const qs = buildQuery({
    moderation_status: query.moderation_status,
    availability_status: query.availability_status,
    page: query.page,
    per_page: query.per_page,
  });
  return api.get<PortalProperty[]>(`/portal/properties${qs}`);
}

export async function getPortalProperty(
  propertyId: number | string
): Promise<ApiResponse<PortalProperty>> {
  return api.get<PortalProperty>(`/portal/properties/${propertyId}`);
}

export async function createPortalProperty(
  payload: PortalPropertyPayload
): Promise<ApiResponse<PortalProperty>> {
  return api.post<PortalProperty>('/portal/properties', payload);
}

export async function updatePortalProperty(
  propertyId: number | string,
  payload: Partial<PortalPropertyPayload>
): Promise<ApiResponse<PortalProperty>> {
  return api.put<PortalProperty>(`/portal/properties/${propertyId}`, payload);
}

export async function submitPortalProperty(
  propertyId: number | string
): Promise<ApiResponse<PortalProperty>> {
  return api.post<PortalProperty>(`/portal/properties/${propertyId}/submit`);
}

export async function resubmitPortalProperty(
  propertyId: number | string
): Promise<ApiResponse<PortalProperty>> {
  return api.post<PortalProperty>(`/portal/properties/${propertyId}/resubmit`);
}

export async function updatePortalPropertyAvailability(
  propertyId: number | string,
  availability_status: AvailabilityStatus
): Promise<ApiResponse<PortalProperty>> {
  return api.patch<PortalProperty>(`/portal/properties/${propertyId}/availability`, {
    availability_status,
  });
}

export async function deletePortalProperty(
  propertyId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/portal/properties/${propertyId}`);
}

export async function uploadPortalPropertyImages(
  propertyId: number | string,
  files: File[]
): Promise<ApiResponse<PropertyImage[]>> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images[]', file);
  }
  return api.post<PropertyImage[]>(`/portal/properties/${propertyId}/images`, formData);
}

export async function setPortalPrimaryImage(
  propertyId: number | string,
  imageId: number | string
): Promise<ApiResponse<PropertyImage>> {
  return api.patch<PropertyImage>(
    `/portal/properties/${propertyId}/images/${imageId}/primary`
  );
}

export async function deletePortalPropertyImage(
  propertyId: number | string,
  imageId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/portal/properties/${propertyId}/images/${imageId}`);
}

export async function uploadPortalPropertyDocument(
  propertyId: number | string,
  documentType: DocumentType,
  file: File
): Promise<ApiResponse<PropertyDocument>> {
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('document', file);
  return api.post<PropertyDocument>(`/portal/properties/${propertyId}/documents`, formData);
}

export async function deletePortalPropertyDocument(
  propertyId: number | string,
  documentId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/portal/properties/${propertyId}/documents/${documentId}`);
}

export function getDocumentDownloadUrl(documentId: number | string): string {
  const base = API_BASE_URL.endsWith('/api/v1')
    ? API_BASE_URL
    : `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;
  return `${base}/documents/${documentId}/download`;
}

export async function getMyCompany(): Promise<ApiResponse<CompanyProfile | null>> {
  return api.get<CompanyProfile | null>('/my-company');
}

export async function upsertMyCompany(
  formData: FormData
): Promise<ApiResponse<CompanyProfile>> {
  return api.post<CompanyProfile>('/my-company', formData);
}

export async function createMyCompanyProject(
  formData: FormData
): Promise<ApiResponse<CompanyProject>> {
  return api.post<CompanyProject>('/my-company/projects', formData);
}

export async function deleteMyCompanyProject(
  projectId: number | string
): Promise<ApiResponse<null>> {
  return api.delete<null>(`/my-company/projects/${projectId}`);
}
