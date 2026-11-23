export interface MuqeemFields {
  report_date: string;
  operator_id: string;
  location: string;
  iqama_number: string;
  version_number: string;
  gender: string;
  name: string;
  translated_name: string;
  birth_date: string;
  birth_country: string;
  marital_status: string;
  religion: string;
  occupation: string;
  status: string;
  entry_date: string;
  entry_location: string;
  passport_number: string;
  passport_nationality: string;
  passport_issue_date: string;
  passport_expiry_date: string;
  passport_issue_location: string;
  iqama_issue_date: string;
  iqama_expiry_date: string;
  iqama_issue_location: string;
  employer_number: string;
  employer_name: string;
}

export interface MuqeemRecord extends MuqeemFields {
  id: string;
  verify_code: string;
  archived_at: string | null;
  created_at: string;
}

export interface CountItem {
  label: string;
  count: number;
  /** Monthly series only: how many of that month's entries have status Valid. */
  valid?: number;
}

export interface Stats {
  total: number;
  valid: number;
  not_valid: number;
  this_month: number;
  last_7_days: number;
  archived: number;
  employers: number;
  by_status: CountItem[];
  by_nationality: CountItem[];
  by_occupation: CountItem[];
  by_gender: CountItem[];
  monthly: CountItem[];
  recent: MuqeemRecord[];
}

export interface Facets {
  nationalities: string[];
  occupations: string[];
  statuses: string[];
  employers: string[];
  genders: string[];
}

export interface RecordFilters {
  q?: string;
  nationality?: string;
  occupation?: string;
  status?: string;
  employer?: string;
  gender?: string;
  archived?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  at: string;
  actor: string;
  changes: { field: string; from: string; to: string }[];
}

export interface PublicVerify {
  verified: boolean;
  name: string;
  iqama_number: string;
  status: string;
  report_date: string;
  employer_name: string;
  nationality: string;
  iqama_expiry_date: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  must_change_password: boolean;
}

export const EMPTY_FIELDS: MuqeemFields = {
  report_date: "",
  operator_id: "",
  location: "Muqeem Portal",
  iqama_number: "",
  version_number: "1",
  gender: "Male",
  name: "",
  translated_name: "",
  birth_date: "",
  birth_country: "",
  marital_status: "SINGLE",
  religion: "Islam",
  occupation: "",
  status: "Valid",
  entry_date: "",
  entry_location: "",
  passport_number: "",
  passport_nationality: "",
  passport_issue_date: "",
  passport_expiry_date: "",
  passport_issue_location: "",
  iqama_issue_date: "",
  iqama_expiry_date: "",
  iqama_issue_location: "",
  employer_number: "",
  employer_name: "",
};

export interface TeamRole {
  name: string;
  label: string;
  description: string;
  permissions: string[];
  assignable: boolean;
}

export interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  role_label: string;
  source: "override" | "dashboard" | "none";
  dashboard: boolean;
  editable: boolean;
  status: "active" | "suspended" | "deleted";
  last_login_at: string | null;
  created_at: string;
  active_sessions: number;
  existing_account?: boolean;
}

export interface TeamOverview {
  roles: TeamRole[];
  permissions: Record<string, string>;
  users: TeamUser[];
  me: { id: string; is_super: boolean };
}
