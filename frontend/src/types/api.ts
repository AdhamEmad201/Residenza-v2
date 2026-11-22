import type { CompanySummary } from '@/types/company';

export type UserRole = 'user' | 'admin';
export type AccountType = 'individual' | 'broker' | 'company' | 'admin';
export type UserStatus = 'active' | 'suspended';

export type TransactionType = 'sale' | 'rent';
export type ModerationStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected';
export type AvailabilityStatus = 'available' | 'sold' | 'rented' | 'hidden';
export type FinishingType = 'core_and_shell' | 'semi_finished' | 'fully_finished' | 'lux' | 'super_lux';
export type DocumentType = 'ownership_proof' | 'broker_authorization' | 'national_id' | 'other';

// FND-04 Enums
export type PropertyType = 'residential' | 'commercial' | 'administrative' | 'land';
export type PaymentMethod = 'cash' | 'installment' | 'cash_or_installment';
export type RentalPeriod = 'monthly' | 'quarterly' | 'yearly' | 'daily';
export type LocationType = 'governorate' | 'markaz' | 'city' | 'district' | 'village';
export type FacadeType =
  | 'northern'
  | 'southern'
  | 'eastern'
  | 'western'
  | 'corner'
  | 'two_streets'
  | 'main_street'
  | 'nile_view';
export type LegalStatus =
  | 'registered_shahr_aqari'
  | 'seha_tawqee'
  | 'allocation_decision'
  | 'initial_contract'
  | 'inheritance_deed'
  | 'other';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  error_code?: string;
  errors?: Record<string, string[]>;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp_number?: string | null;
  role: UserRole;
  account_type: AccountType;
  company_name?: string | null;
  status: UserStatus;
  is_active?: boolean;
  last_seen_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  parent_id?: number | null;
  name_ar: string;
  name_en?: string | null;
  slug: string;
  property_type: PropertyType;
  icon?: string | null;
  is_active: boolean;
  sort_order: number;
  parent?: Category | null;
  children?: Category[];
}

export interface Location {
  id: number;
  parent_id?: number | null;
  type: LocationType;
  name_ar: string;
  name_en?: string | null;
  slug: string;
  is_active: boolean;
  sort_order: number;
  parent?: Location | null;
  children?: Location[];
}

export interface PropertyImage {
  id: number;
  property_id: number;
  disk: string;
  file_path: string;
  url?: string;
  mime_type: string;
  file_size_bytes: number;
  is_primary: boolean;
  sort_order: number;
}

export interface PropertyDocument {
  id: number;
  property_id: number;
  uploaded_by: number;
  document_type: DocumentType;
  disk: string;
  file_path: string;
  original_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at?: string;
}

export interface ModerationLog {
  id: number;
  property_id: number;
  actor_id: number;
  from_status?: ModerationStatus | null;
  to_status: ModerationStatus;
  action: string;
  notes?: string | null;
  created_at: string;
  actor?: User;
}

export interface Property {
  id: number;
  reference_code: string;
  slug: string;
  user_id: number;
  category_id: number;
  location_id: number;
  transaction_type: TransactionType;
  payment_method?: PaymentMethod | null;
  rental_period?: RentalPeriod | null;
  title_ar: string;
  description_ar: string;
  price_egp: number | string;
  installment_price_egp: string | null;
  down_payment_egp?: number | string | null;
  installment_period_months?: number | null;
  insurance_deposit_egp?: number | string | null;
  area_sqm: number | string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor_level?: number | null;
  total_floors?: number | null;
  building_year?: number | null;
  street_width_meters?: number | string | null;
  facade_type?: FacadeType | null;
  declared_legal_status?: LegalStatus | null;
  finishing_type?: FinishingType | null;
  has_elevator: boolean;
  has_electricity_meter: boolean;
  has_water_meter: boolean;
  has_natural_gas: boolean;
  address_details_ar: string;
  contact_phone: string;
  contact_whatsapp: string;
  moderation_status: ModerationStatus;
  availability_status: AvailabilityStatus;
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  user?: User;
  category?: Category;
  location?: Location;
  images?: PropertyImage[];
  primary_image?: PropertyImage | null;
  documents?: PropertyDocument[];
  moderation_logs?: ModerationLog[];
}

export interface PublicPropertyOwnerDisplay {
  name: string;
  account_type: AccountType;
  company_name?: string | null;
}

export interface PublicProperty {
  id: number;
  reference_code: string;
  slug: string;
  transaction_type: TransactionType;
  payment_method: PaymentMethod | null;
  rental_period: RentalPeriod | null;
  title_ar: string;
  description_ar: string;
  price_egp: string;
  installment_price_egp: string | null;
  down_payment_egp: string | null;
  installment_period_months: number | null;
  insurance_deposit_egp: string | null;
  area_sqm: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_level: number | null;
  total_floors: number | null;
  finishing_type: FinishingType | null;
  building_year: number | null;
  street_width_meters: string | null;
  facade_type: FacadeType | null;
  declared_legal_status: LegalStatus | null;
  has_elevator: boolean;
  has_electricity_meter: boolean;
  has_water_meter: boolean;
  has_natural_gas: boolean;
  address_details_ar: string;
  contact_phone: string;
  contact_whatsapp: string;
  availability_status: AvailabilityStatus;
  is_featured: boolean;
  published_at: string | null;
  category?: Category;
  location?: Location;
  images?: PropertyImage[];
  owner_display?: PublicPropertyOwnerDisplay;
  company?: CompanySummary | null;
  project?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface PortalProperty {
  id: number;
  reference_code: string;
  slug: string;
  user_id: number;
  company_id?: number | null;
  project_id?: number | null;
  category_id: number;
  location_id: number;
  transaction_type: TransactionType;
  payment_method: PaymentMethod | null;
  rental_period: RentalPeriod | null;
  title_ar: string;
  description_ar: string;
  price_egp: string;
  installment_price_egp: string | null;
  down_payment_egp: string | null;
  installment_period_months: number | null;
  insurance_deposit_egp: string | null;
  area_sqm: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_level: number | null;
  total_floors: number | null;
  finishing_type: FinishingType | null;
  building_year: number | null;
  street_width_meters: string | null;
  facade_type: FacadeType | null;
  declared_legal_status: LegalStatus | null;
  has_elevator: boolean;
  has_electricity_meter: boolean;
  has_water_meter: boolean;
  has_natural_gas: boolean;
  address_details_ar: string;
  contact_phone: string;
  contact_whatsapp: string;
  moderation_status: ModerationStatus;
  availability_status: AvailabilityStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  location?: Location;
  images?: PropertyImage[];
  documents?: PropertyDocument[];
  moderation_logs?: Array<{
    id: number;
    from_status: ModerationStatus | null;
    to_status: ModerationStatus;
    action: string;
    notes: string | null;
    created_at: string;
  }>;
}

export interface AdminProperty extends PortalProperty {
  reviewed_by: number | null;
  deleted_at: string | null;
  views_count?: number;
  whatsapp_clicks?: number;
  phone_clicks?: number;
  is_potential_duplicate?: boolean;
  is_suspicious_price?: boolean;
  user?: User;
  company?: CompanySummary | null;
  reviewer?: User | null;
  moderation_logs?: Array<{
    id: number;
    actor_id: number;
    actor_name: string | null;
    from_status: ModerationStatus | null;
    to_status: ModerationStatus;
    action: string;
    notes: string | null;
    created_at: string;
  }>;
}

export interface AdminDashboardStats {
  properties: {
    total: number;
    by_moderation_status: Record<ModerationStatus, number>;
    by_availability_status: Record<AvailabilityStatus, number>;
  };
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  taxonomy: {
    categories: number;
    locations: number;
  };
  recent_moderation_logs: Array<{
    id: number;
    property_id: number;
    property_reference: string | null;
    property_title: string | null;
    actor_id: number;
    actor_name: string | null;
    from_status: ModerationStatus | null;
    to_status: ModerationStatus;
    action: string;
    notes: string | null;
    created_at: string;
  }>;
}

export interface ModerationDecisionPayload {
  notes?: string | null;
  reason?: string;
}

export interface UpdateUserStatusPayload {
  status?: UserStatus;
  is_active?: boolean;
}

export interface AdminAreaItem {
  id: number;
  name: string;
  city: string;
  is_active: boolean;
  search_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminOverviewStats {
  total_users: number;
  online_users_count: number;
  online_users: Array<{
    id: number;
    name: string;
    email: string;
    role: UserRole;
    account_type: AccountType;
    last_seen_at: string;
  }>;
  properties: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    stale: number;
  };
  companies: {
    total: number;
    verified: number;
  };
  engagement: {
    total_whatsapp_clicks: number;
    total_phone_clicks: number;
    total_views: number;
  };
  top_areas: AdminAreaItem[];
  open_reports_count: number;
  new_buyer_requests_count: number;
}

export interface AdminCompanyItem {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  logo_path: string | null;
  cover_path: string | null;
  bio: string | null;
  address: string | null;
  whatsapp: string | null;
  phone: string | null;
  accent_color: string;
  is_verified: boolean;
  plan_tier: 'free' | 'partner' | 'enterprise';
  max_properties: number;
  plan_expires_at: string | null;
  views_count: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  properties_count?: number;
  projects_count?: number;
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  created_at?: string;
}

export interface PropertyReportItem {
  id: number;
  property_id: number;
  reporter_phone: string | null;
  reason: string;
  notes: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  property?: {
    id: number;
    title_ar: string;
    reference_code: string;
    moderation_status: ModerationStatus;
  } | null;
}

export interface BuyerRequestItem {
  id: number;
  name: string;
  phone: string;
  property_type: string;
  area: string;
  budget_max: string | null;
  notes: string | null;
  assigned_company_id: number | null;
  status: 'new' | 'assigned' | 'closed';
  created_at: string;
  assigned_company?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface AdminAuditLogItem {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface SiteConfigData {
  areas: AdminAreaItem[];
  announcement_bar: {
    text: string;
    active: boolean;
  };
  hero_banner: {
    title: string;
    subtitle: string;
    image: string | null;
    image_url: string | null;
  };
}

export interface CategoryPayload {
  parent_id?: number | null;
  property_type: PropertyType;
  name_ar: string;
  name_en?: string | null;
  slug: string;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface LocationPayload {
  parent_id?: number | null;
  type: LocationType;
  name_ar: string;
  name_en?: string | null;
  slug: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface HealthCheckData {
  service: string;
  version: string;
  status: string;
  database: 'connected' | string;
  timestamp: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  whatsapp_number?: string | null;
  password: string;
  password_confirmation: string;
  account_type: Exclude<AccountType, 'admin'>;
  company_name?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name: string;
  phone: string;
  whatsapp_number?: string | null;
  company_name?: string | null;
  current_password?: string | null;
  password?: string | null;
  password_confirmation?: string | null;
}
