"use client";

import { useMemo } from "react";
import { useCmsContent, type CmsItem } from "./cms-content";
import { REQUIREMENTS, type RequirementContact, type RequirementItem } from "./requirements-data";
import type { RequirementStatus } from "./requirements-data";

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function contactsValue(value: unknown): RequirementContact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const contact = item as Record<string, unknown>;
      const raw = stringValue(contact.raw);
      if (!raw) return null;
      return {
        display: stringValue(contact.display, `+${raw}`),
        raw,
        whatsapp: Boolean(contact.whatsapp),
      };
    })
    .filter(Boolean) as RequirementContact[];
}

function cmsRequirement(item: CmsItem, fallback?: RequirementItem): RequirementItem {
  const data = item.data ?? {};
  const rateAmount = stringValue(data.rate_amount);
  const rateCurrency = stringValue(data.rate_currency, "SAR");
  const rateUnit = stringValue(data.rate_unit, "hour");
  const documents = Array.isArray(data.documents) ? (data.documents as string[]) : fallback?.documents ?? [];
  const contacts = contactsValue(data.contacts);
  const status: RequirementStatus =
    item.status === "urgent" ? "urgent" : item.status === "closed" ? "closed" : "active";
  return {
    id: item.slug,
    status,
    position: item.title,
    approval: stringValue(data.approval, fallback?.approval),
    count: numberValue(data.headcount, fallback?.count ?? 1),
    rate: rateAmount ? `${rateAmount} ${rateCurrency} / ${rateUnit}` : fallback?.rate ?? "TBD",
    salaryCycle: stringValue(data.salary_cycle, fallback?.salaryCycle ?? "Monthly"),
    project: stringValue(data.project_name, fallback?.project ?? "NOVARISE Project"),
    location: stringValue(data.location, fallback?.location ?? "Saudi Arabia"),
    duration: stringValue(data.duration, fallback?.duration ?? "Long Term"),
    food: stringValue(data.food, fallback?.food ?? "As per project"),
    accommodation: stringValue(data.accommodation, fallback?.accommodation ?? "As per project"),
    documents,
    contacts: contacts.length ? contacts : fallback?.contacts ?? [],
    postedAt: item.updated_at.slice(0, 10),
  };
}

export function useManagedRequirements(): RequirementItem[] {
  const { collections } = useCmsContent();
  return useMemo(() => {
    const items = collections.requirements ?? [];
    if (!items.length) return REQUIREMENTS;
    return items.map((item) => {
      const fallback = REQUIREMENTS.find((requirement) => requirement.id === item.slug);
      return cmsRequirement(item, fallback);
    });
  }, [collections.requirements]);
}
