import { invoke } from '@tauri-apps/api/core';

/**
 * Capture the Molten window as PNG using Win32 API.
 * Saves to temp/molten-capture.png.
 * Works even when window is behind other windows.
 */
export async function captureSelf(): Promise<string> {
  return invoke<string>('capture_window');
}

// Auto-capture every 10 seconds (for development/testing)
let captureInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoCapture(intervalMs = 10000) {
  stopAutoCapture();
  captureInterval = setInterval(() => {
    captureSelf().catch(() => {}); // Silently ignore errors
  }, intervalMs);
  // Also capture immediately
  captureSelf().catch(() => {});
}

export function stopAutoCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
}

// Start auto-capture in development mode
if (import.meta.env.DEV) {
  // Wait for app to fully render before first capture
  setTimeout(() => startAutoCapture(10000), 3000);
}

// Expose globally for console access
(window as any).__moltenCapture = captureSelf;
(window as any).__moltenStartCapture = startAutoCapture;
(window as any).__moltenStopCapture = stopAutoCapture;
