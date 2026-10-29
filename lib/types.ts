export const BUSINESS_TYPES = ["hotel", "restaurant", "clinic", "gym", "store", "agency", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BRAND_TONES = ["formal", "casual", "fun", "premium"] as const;
export type BrandTone = (typeof BRAND_TONES)[number];

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  /** ISO 639-1, uppercase (ES, EN, PT...) */
  language: string;
  /** ISO 4217 (EUR, USD, ARS...) */
  currency: string;
  /** IANA time zone (Europe/Madrid...) */
  timezone: string;
  /** ISO 3166-1 alpha-2, optional */
  country_code: string | null;
  brand_tone: BrandTone;
  /** Spend (in business.currency) without conversions above which a campaign is flagged "pause" */
  ad_pause_threshold: number;
  /** Free-form knowledge base: services, prices, hours, policies. Used by every AI prompt. */
  knowledge: string;
  created_at: string;
}

export const LEAD_STATUSES = ["new", "contacted", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  source: string;
  status: LeadStatus;
  value: number;
  contact: string;
  notes: string;
  /** ISO timestamp (UTC). Displayed in business.timezone */
  lead_date: string;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  author: string;
  rating: number;
  content: string;
  detected_language: string;
  replies: string[];
  chosen_reply: string;
  status: "pending" | "replied";
  created_at: string;
}

export interface GbpPost {
  id: string;
  business_id: string;
  title: string;
  body: string;
  cta: string;
  image_idea: string;
  status: "draft" | "published";
  /** YYYY-MM-DD in business.timezone */
  scheduled_for: string | null;
  created_at: string;
}

export interface Campaign {
  name: string;
  platform: string;
  spend: number;
  conversions: number;
  conversion_label: string;
  clicks: number | null;
  impressions: number | null;
  revenue: number | null;
  /** Computed by code from business.ad_pause_threshold */
  flag: "pause" | "ok";
}

export interface Recommendation {
  campaign: string;
  action: "pause" | "scale" | "optimize" | "keep";
  reason: string;
}

export interface AdReport {
  id: string;
  business_id: string;
  raw_input: string;
  period: string;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  report: string;
  total_spend: number;
  created_at: string;
}

export const SOCIAL_STATUSES = ["todo", "in_production", "published"] as const;
export type SocialStatus = (typeof SOCIAL_STATUSES)[number];
export const SOCIAL_TYPES = ["reel", "carousel", "story", "post"] as const;
export type SocialType = (typeof SOCIAL_TYPES)[number];

export interface SocialPost {
  id: string;
  business_id: string;
  type: SocialType;
  title: string;
  copy: string;
  hashtags: string[];
  status: SocialStatus;
  scheduled_for: string | null;
  created_at: string;
}

export interface TableMap {
  businesses: Business;
  leads: Lead;
  reviews: Review;
  gbp_posts: GbpPost;
  ad_reports: AdReport;
  social_posts: SocialPost;
}
export type TableName = keyof TableMap;
