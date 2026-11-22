/** Today's date in the Umm al-Qura Hijri calendar, formatted like the Muqeem report: 1448-05-25. */
export function todayHijri(): string {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const HIJRI_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
