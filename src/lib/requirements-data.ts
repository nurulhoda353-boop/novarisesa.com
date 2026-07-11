// Urgent manpower requirement posts — Saudi Arabia projects.
// To add/remove a requirement: edit this array. Each `id` must be unique.
// Translatable strings (position, project, food, accommodation, documents) are
// resolved through i18n via `t("requirementsPage.items.<id>.<field>")` with the
// English value here as a fallback.

export type RequirementStatus = "urgent" | "active" | "closed";

export interface RequirementContact {
  /** Pretty display, e.g. "+966 57 875 3016" */
  display: string;
  /** E.164 digits-only, e.g. "966578753016" — used for tel: and wa.me */
  raw: string;
  whatsapp?: boolean;
}

export interface RequirementItem {
  id: string;
  status: RequirementStatus;
  position: string;
  approval?: string;              // e.g. "Aramco Approved"
  count: number;
  rate: string;                   // e.g. "33 SR / hour"
  salaryCycle: string;            // e.g. "Monthly"
  project: string;
  location: string;
  duration: string;               // e.g. "Long Term"
  food: string;                   // e.g. "Provided by company" / "—"
  accommodation: string;
  documents: string[];
  contacts: RequirementContact[];
  /** Open ISO date — used for sorting + recency badge */
  postedAt: string;
}

export const REQUIREMENTS: RequirementItem[] = [
  {
    id: "6g-welder-madina",
    status: "urgent",
    position: "6G Welder",
    approval: "Aramco Approved",
    count: 10,
    rate: "33 SR / hour",
    salaryCycle: "Monthly",
    project: "Madina Aramco Project",
    location: "Madinah Region, KSA",
    duration: "Long Term",
    food: "Provided by company",
    accommodation: "Provided by company",
    documents: ["Valid Iqama", "Medical Insurance"],
    contacts: [
      { display: "+966 57 875 3016", raw: "966578753016", whatsapp: true },
      { display: "+966 56 972 7122", raw: "966569727122", whatsapp: true },
    ],
    postedAt: "2026-06-22",
  },
  {
    id: "multi-welder-madina",
    status: "urgent",
    position: "Multi Welder",
    approval: "Aramco Approved",
    count: 10,
    rate: "45 SR / hour",
    salaryCycle: "Monthly",
    project: "Madina Aramco Project",
    location: "Madinah Region, KSA",
    duration: "Long Term",
    food: "Provided by company",
    accommodation: "Provided by company",
    documents: ["Valid Iqama", "Medical Insurance"],
    contacts: [
      { display: "+966 57 875 3016", raw: "966578753016", whatsapp: true },
      { display: "+966 56 972 7122", raw: "966569727122", whatsapp: true },
    ],
    postedAt: "2026-06-22",
  },
  {
    id: "electrical-grounding-foreman-qassim",
    status: "urgent",
    position: "Electrical Grounding Foreman",
    count: 2,
    rate: "18 SR / hour",
    salaryCycle: "Monthly",
    project: "Qassim-1 Project",
    location: "Qassim Region, KSA",
    duration: "Long Term",
    food: "Self-arranged",
    accommodation: "Provided by company",
    documents: ["Valid Iqama"],
    contacts: [
      { display: "+966 59 442 4759", raw: "966594424759", whatsapp: true },
      { display: "+966 59 106 5829", raw: "966591065829", whatsapp: true },
    ],
    postedAt: "2026-06-25",
  },
];

export const URGENT_COUNT = REQUIREMENTS.filter((r) => r.status === "urgent").length;

export function buildWhatsAppLink(raw: string, message: string): string {
  return `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;
}
