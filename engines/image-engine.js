// CloakStudio Image Engine
// All operations run locally in the visitor's browser.

export async function loadImageFile(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new Error("Please choose a supported image file.");
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("The browser could not read this image.");
    }
    if (image.naturalWidth * image.naturalHeight > 40000000) {
      throw new Error("This image exceeds the 40-megapixel safety limit for this browser editor.");
    }

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      url
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function drawImage(canvas, image, settings = {}) {
  const rotation = ((settings.rotation || 0) % 360 + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;
  const width = sideways ? image.naturalHeight : image.naturalWidth;
  const height = sideways ? image.naturalWidth : image.naturalHeight;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);

  const brightness = Number(settings.brightness ?? 100);
  const contrast = Number(settings.contrast ?? 100);
  const saturation = Number(settings.saturation ?? 100);
  const grayscale = settings.grayscale ? 1 : 0;

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${grayscale ? 0 : saturation}%)`;
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();

  return { width, height };
}

export function exportCanvas(canvas, mime = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      reject(new Error("That export format is not supported."));
      return;
    }

    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("The browser could not create the export."));
        return;
      }
      resolve(blob);
    }, mime, quality);
  });
}
