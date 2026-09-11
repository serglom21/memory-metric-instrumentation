const cache = new Map<string, string>();

function hashHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function posterDataUrl(
  id: string,
  title: string,
  width: number,
  height: number,
): string {
  const key = `${id}:${width}x${height}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  const hue = hashHue(id);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue} 42% 22%)`);
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 38% 12%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, height * 0.62, width, height * 0.38);

  ctx.fillStyle = "#f2f2f2";
  ctx.font = `${Math.max(14, Math.round(width / 11))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  const words = title.split(" ");
  let line = "";
  let y = height * 0.68;
  const x = width * 0.08;
  const maxWidth = width * 0.84;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += width / 9;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, x, y);

  const url = canvas.toDataURL("image/jpeg", 0.55);
  cache.set(key, url);
  return url;
}
