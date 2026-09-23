export type UserRole = "admin" | "reader";

export type Paper = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_path: string | null;
  contents: string[];
  highlights: string[];
  storage_path: string | null;
  published: boolean;
  created_at: string;
};

export type Invite = {
  id: string;
  email: string;
  paper_id: string | null;
  invited_by: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type AccessGrant = {
  id: string;
  email: string;
  user_id: string | null;
  source: "invite" | "purchase";
  starts_at: string;
  expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  confirmation_session_id: string | null;
  access_id: string;
  created_at: string;
};

export type BillingSettings = {
  id: number;
  price_cents: number;
  currency: string;
  billing_interval: "year" | "month";
  included_copy: string;
  support_email: string | null;
  company_name: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
};
