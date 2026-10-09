import { IMAGE_ASPECT, IMAGE_FORMATS, IMAGE_PIXELS, MAX_IMAGE_BYTES } from "@/lib/seed-audio/constants";

export type ImageFormat = (typeof IMAGE_FORMATS)[number];

const EXTENSION_ALIASES: Record<string, ImageFormat> = { jpg: "jpeg", jpe: "jpeg", tif: "tiff" };

export function detectImageFormat(fileName: string, mimeType: string): ImageFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const aliased = EXTENSION_ALIASES[extension] ?? extension;
  if ((IMAGE_FORMATS as readonly string[]).includes(aliased)) return aliased as ImageFormat;
  const subtype = mimeType.toLowerCase().replace(/^image\//, "").replace(/^x-/, "");
  const fromMime = EXTENSION_ALIASES[subtype] ?? subtype;
  return (IMAGE_FORMATS as readonly string[]).includes(fromMime) ? (fromMime as ImageFormat) : null;
}

export type ImageFileCheck = { ok: true; format: ImageFormat } | { ok: false; reason: string };

export function checkImageFile(file: { name: string; type: string; size: number }): ImageFileCheck {
  if (file.size === 0) return { ok: false, reason: `${file.name}: the file is empty` };
  const format = detectImageFormat(file.name, file.type);
  if (!format) return { ok: false, reason: `${file.name}: use a jpeg, png, webp, bmp, tiff, gif, heic or heif image` };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: `${file.name}: images must be 10 MB or smaller` };
  return { ok: true, format };
}

export function describeImageProblem(width: number, height: number): string | null {
  const { min, max } = IMAGE_PIXELS;
  if (width < min || height < min || width > max || height > max) {
    return `The image is ${width}x${height}px. Width and height must each be ${min}-${max}px.`;
  }
  const ratio = width / height;
  if (ratio < IMAGE_ASPECT.min || ratio > IMAGE_ASPECT.max) {
    return `The image's aspect ratio is ${ratio.toFixed(2)}. It must be between ${IMAGE_ASPECT.min} and ${IMAGE_ASPECT.max}.`;
  }
  return null;
}

export function readImageDataUri(file: File, format: ImageFormat): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(`data:image/${format};base64,${result.slice(result.indexOf(",") + 1)}`);
    };
    reader.readAsDataURL(file);
  });
}

const SIZE_TIMEOUT_MS = 8000;

export function readImageSize(source: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), SIZE_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = source;
  });
}
