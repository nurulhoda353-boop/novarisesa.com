import { forwardRef } from "react";
import { MuqeemSheet } from "./MuqeemSheet";
import type { MuqeemRecord } from "@/lib/types";

export function verifyUrlFor(record: MuqeemRecord): string {
  const origin = typeof window === "undefined" ? "https://muqeem.novarisesa.com" : window.location.origin;
  return `${origin}/verify/${record.verify_code}`;
}

/** Off-screen, full-size sheets (one per record) used for batch printing and ZIP export. */
export const BatchSheets = forwardRef<HTMLDivElement, { rows: MuqeemRecord[]; qr: boolean }>(function BatchSheets(
  { rows, qr },
  ref,
) {
  return (
    <div className="print-area" ref={ref} aria-hidden>
      {rows.map((row) => (
        <div className="print-page" key={row.id} data-id={row.id} data-iqama={row.iqama_number}>
          <MuqeemSheet data={row} verifyUrl={qr ? verifyUrlFor(row) : undefined} />
        </div>
      ))}
    </div>
  );
});
