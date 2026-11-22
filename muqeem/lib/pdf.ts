import { SHEET_HEIGHT, SHEET_WIDTH } from "@/components/MuqeemSheet";

/** Renders the sheet to an A4 PDF that looks identical to what is shown on screen. */
export async function downloadSheetPdf(element: HTMLElement, filename: string): Promise<void> {
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
  pdf.save(filename);
}
