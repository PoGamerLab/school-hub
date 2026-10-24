/**
 * Canvas Cropping & Compression Utility (Phase D).
 */

export function drawCropCanvas(canvas, img, zoom, offsetX, offsetY) {
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (w - drawW) / 2 + offsetX;
  const y = (h - drawH) / 2 + offsetY;

  ctx.drawImage(img, x, y, drawW, drawH);
}

export function exportCompressedJpeg(canvas, img, size, maxChars, initialQuality = 0.78) {
  if (!canvas || !img) return null;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const ctx = outCanvas.getContext('2d');

  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

  let q = initialQuality;
  let dataUrl = outCanvas.toDataURL('image/jpeg', q);

  while (dataUrl.length > maxChars && q > 0.35) {
    q -= 0.05;
    dataUrl = outCanvas.toDataURL('image/jpeg', q);
  }

  return dataUrl.length <= maxChars ? dataUrl : null;
}
