const MB = 1024 * 1024;

let buffers: ArrayBuffer[] = [];
let megabytes = 0;
const listeners = new Set<() => void>();

function commitBuffer(bytes: number): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i += 4096) {
    view[i] = 1;
  }
  return buffer;
}

export function getPressureMb(): number {
  return megabytes;
}

export function setPressureMb(next: number): void {
  const clamped = Math.max(0, Math.min(500, Math.round(next)));
  buffers = [];
  for (let i = 0; i < clamped; i += 1) {
    buffers.push(commitBuffer(MB));
  }
  megabytes = clamped;
  listeners.forEach((listener) => listener());
}

export function subscribePressure(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
