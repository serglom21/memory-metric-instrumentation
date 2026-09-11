export function cpuCores(): number {
  return navigator.hardwareConcurrency || 0;
}

export function ramGb(): number {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return typeof deviceMemory === "number" ? deviceMemory : 0;
}

export function gpuTier(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
      return "unknown";
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const lower = renderer.toLowerCase();
    if (/apple|metal|m[1-4]\b/.test(lower)) {
      return "apple";
    }
    if (/nvidia|geforce|radeon|amd/.test(lower)) {
      return "discrete";
    }
    if (/intel|adreno|mali|apple gpu/.test(lower)) {
      return "integrated";
    }
    return "other";
  } catch {
    return "unknown";
  }
}

export function deviceFacts() {
  return {
    cpu_cores: cpuCores(),
    ram_gb: ramGb(),
    gpu_tier: gpuTier(),
  };
}
