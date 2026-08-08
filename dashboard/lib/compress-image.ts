const DEFAULT_MAX_BYTES = 250 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImageForWeb(
  file: File,
  options: { maxBytes?: number; maxWidth?: number; maxHeight?: number } = {},
): Promise<File> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxWidth = options.maxWidth ?? 1920;
  const maxHeight = options.maxHeight ?? 1200;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size <= maxBytes && file.type === "image/webp") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

  for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob && blob.size <= maxBytes) {
      return new File([blob], `${baseName}.webp`, { type: "image/webp" });
    }
  }

  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= maxBytes) {
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    }
  }

  const blob = await canvasToBlob(canvas, "image/webp", 0.3);
  if (!blob) throw new Error("Could not compress image.");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
