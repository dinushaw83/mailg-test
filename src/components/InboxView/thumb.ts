// thumb-file.ts
type ImgOpts = {
  maxW?: number; // default 320
  maxH?: number; // default 320
  mime?: string; // default "image/jpeg"
  quality?: number; // default 0.85 (only for lossy mimes)
  nameSuffix?: string; // default "_thumb"
  signal?: AbortSignal;
};

function fitWithin(srcW: number, srcH: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / srcW, maxH / srcH, 1);
  return { w: Math.max(1, Math.round(srcW * scale)), h: Math.max(1, Math.round(srcH * scale)) };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [hdr, b64] = dataUrl.split(",");
  const mime = hdr.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function inferThumbName(input: File, suffix: string, w: number, h: number, ext: string) {
  const base = input.name.replace(/\.[^.]+$/, "");
  return `${base}${suffix}_${w}x${h}.${ext}`;
}

export async function imageFileToThumbnailFile(file: File, opts: ImgOpts = {}): Promise<File> {
  const { maxW = 320, maxH = 320, mime = "image/jpeg", quality = 0.85, nameSuffix = "_thumb", signal } = opts;

  if (!file.type.startsWith("image/")) {
    throw new Error(`Expected an image File, got ${file.type || "unknown type"}`);
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  let objUrl: string | null = null;
  try {
    objUrl = URL.createObjectURL(file);

    // Decode
    let bmp: ImageBitmap | HTMLImageElement;
    if ("createImageBitmap" in window) {
      bmp = await createImageBitmap(file);
    } else {
      bmp = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = objUrl!;
      });
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const srcW = "width" in bmp ? bmp.width : (bmp as HTMLImageElement).naturalWidth;
    const srcH = "height" in bmp ? bmp.height : (bmp as HTMLImageElement).naturalHeight;
    const { w, h } = fitWithin(srcW, srcH, maxW, maxH);

    // Draw
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp as any, 0, 0, w, h);

    // Encode -> Blob
    const blob = await new Promise<Blob>((res) => {
      canvas.toBlob(
        (b) => {
          if (b) return res(b);
          // Fallback if mime unsupported by toBlob
          const fallback = dataUrlToBlob(canvas.toDataURL(mime, quality));
          res(fallback);
        },
        mime,
        quality
      );
    });

    const ext = mime.split("/")[1] || "jpg";
    const name = inferThumbName(file, nameSuffix, w, h, ext);
    return new File([blob], name, { type: blob.type || mime, lastModified: Date.now() });
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
  }
}

type VidOpts = {
  at?: number; // seconds; default 1
  maxW?: number; // default 320
  maxH?: number; // default 320
  mime?: string; // output image mime; default "image/jpeg"
  quality?: number; // default 0.85
  nameSuffix?: string; // default "_thumb"
  signal?: AbortSignal;
};

export async function videoFileToThumbnailFile(file: File, opts: VidOpts = {}): Promise<File> {
  const { at = 1, maxW = 320, maxH = 320, mime = "image/jpeg", quality = 0.85, nameSuffix = "_thumb", signal } = opts;

  if (!file.type.startsWith("video/")) {
    throw new Error(`Expected a video File, got ${file.type || "unknown type"}`);
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const srcUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    (video as any).playsInline = true;
    video.muted = true;
    video.src = srcUrl;

    await new Promise<void>((res, rej) => {
      const onMeta = () => res();
      const onErr = () => rej(new Error("Video metadata load failed"));
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const dur = isFinite(video.duration) ? video.duration : Math.max(2, at + 0.1);
    const target = Math.min(Math.max(0, at), Math.max(0, dur - 0.05));

    await new Promise<void>((res, rej) => {
      const onSeeked = () => res();
      const onErr = () => rej(new Error("Seek failed"));
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onErr, { once: true });
      video.currentTime = target;
    });

    const srcW = video.videoWidth || 320;
    const srcH = video.videoHeight || 180;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise<Blob>((res) => {
      canvas.toBlob(
        (b) => {
          if (b) return res(b);
          const fallback = dataUrlToBlob(canvas.toDataURL(mime, quality));
          res(fallback);
        },
        mime,
        quality
      );
    });

    const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const base = file.name.replace(/\.[^.]+$/, "");
    const name = `${base}${nameSuffix}_${w}x${h}.${ext}`;
    return new File([blob], name, { type: blob.type || mime, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}
