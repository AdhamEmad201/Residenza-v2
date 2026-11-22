import type { PublicProperty } from '@/types/api';

export interface CompanySummary {
  id: number;
  name: string;
  slug: string;
  logo_path: string | null;
  logo_url?: string | null;
  is_verified: boolean;
  accent_color?: string | null;
}

export interface CompanyProject {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  cover_path: string | null;
  cover_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyProfile extends CompanySummary {
  user_id: number;
  cover_path: string | null;
  cover_url?: string | null;
  bio: string | null;
  address: string | null;
  whatsapp: string | null;
  phone: string | null;
  accent_color: string;
  properties_count?: number;
  projects_count?: number;
  projects?: CompanyProject[];
  created_at?: string;
  updated_at?: string;
}

export interface CompanyStorefrontResponse {
  company: CompanyProfile;
  properties: PublicProperty[];
  properties_meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
