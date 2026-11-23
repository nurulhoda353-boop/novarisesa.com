import { SHEET_HEIGHT, SHEET_WIDTH } from "@/components/MuqeemSheet";

async function renderPdf(element: HTMLElement, filename: string) {
  await document.fonts.ready;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(element, {
    scale: 4,
    backgroundColor: "#ffffff",
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    useCORS: true,
    logging: false,
  });
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 595.28, 841.89, undefined, "FAST");
  pdf.setProperties({ title: filename.replace(/\.pdf$/i, ""), creator: "NOVARISE Muqeem Control" });
  return pdf;
}

/** Renders the sheet to an A4 PDF that looks identical to what is shown on screen. */
export async function downloadSheetPdf(element: HTMLElement, filename: string): Promise<void> {
  (await renderPdf(element, filename)).save(filename);
}

/** Same render, returned as a Blob (used to bundle many reports into one ZIP). */
export async function sheetPdfBlob(element: HTMLElement, filename: string): Promise<Blob> {
  return (await renderPdf(element, filename)).output("blob");
}
