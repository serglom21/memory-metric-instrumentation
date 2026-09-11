export type HeapSnapshot = {
  used: number;
  limit: number;
  nativeLimit: number;
  ratio: number;
};

let heapLimitCapBytes: number | undefined;

export function setHeapLimitCap(bytes: number | undefined): void {
  heapLimitCapBytes =
    typeof bytes === "number" && bytes > 0 ? bytes : undefined;
}

export function readPerformanceMemory(): HeapSnapshot | null {
  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;
  if (
    !memory ||
    typeof memory.usedJSHeapSize !== "number" ||
    typeof memory.jsHeapSizeLimit !== "number" ||
    memory.jsHeapSizeLimit <= 0
  ) {
    return null;
  }
  const nativeLimit = memory.jsHeapSizeLimit;
  const limit =
    heapLimitCapBytes && heapLimitCapBytes > 0
      ? Math.min(nativeLimit, heapLimitCapBytes)
      : nativeLimit;
  return {
    used: memory.usedJSHeapSize,
    limit,
    nativeLimit,
    ratio: memory.usedJSHeapSize / limit,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
