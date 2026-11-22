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
