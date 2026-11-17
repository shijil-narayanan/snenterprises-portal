// Prepares an uploaded signature / stamp photo for printing on documents:
// resize, optionally make the white paper background transparent, trim empty margins,
// and return a small PNG data URL (kept in the Settings record, so it must stay small).

const MAX_BYTES = 300 * 1024; // per image, as base64 text

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      reject(new Error('Please choose a PNG or JPG image.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    img.src = url;
  });
}

/**
 * @param {File} file
 * @param {{ maxWidth: number, maxHeight: number, removeBackground: boolean }} options
 * @returns {Promise<string>} PNG data URL
 */
export async function prepareSignatureImage(file, { maxWidth, maxHeight, removeBackground }) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  if (removeBackground) {
    // Light, low-colour pixels (paper) become transparent, with a soft edge so ink stays smooth
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const light = (r + g + b) / 3;
      const colour = Math.max(r, g, b) - Math.min(r, g, b);
      if (colour < 40 && light > 200) px[i + 3] = 0;
      else if (colour < 40 && light > 160) px[i + 3] = Math.round((px[i + 3] * (200 - light)) / 40);
    }
  }

  // Trim empty (transparent or white) margins
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const blank = px[i + 3] < 16 || (px[i] > 245 && px[i + 1] > 245 && px[i + 2] > 245);
      if (!blank) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) throw new Error('The image looks empty. Please use a clearer photo.');
  ctx.putImageData(data, 0, 0);
  const pad = 4;
  const cx = Math.max(0, left - pad), cy = Math.max(0, top - pad);
  const cw = Math.min(w, right + pad + 1) - cx, ch = Math.min(h, bottom + pad + 1) - cy;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

  const url = out.toDataURL('image/png');
  if (url.length > MAX_BYTES) throw new Error('The image is too detailed. Please crop it closer and try again.');
  return url;
}

/** Only small PNG data URLs we created are accepted. */
export const isSignatureDataUrl = (v) => typeof v === 'string' && v.startsWith('data:image/png;base64,') && v.length <= MAX_BYTES;
