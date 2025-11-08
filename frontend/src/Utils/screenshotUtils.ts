import * as htmlToImage from 'html-to-image';

export type CaptureOptions = {
  pixelRatio?: number;
  paddingPx?: number;
  backgroundColor?: string;
  hideSelector?: string; // Nodes to be excluded from the screenshot
};

export type ScreenshotItem = {
  id: string;
  dataUrl: string;
  tab: string;
  ts: string;
  filename: string;
};

/**
 * Build a predictable filename for screenshots.
 */
export const buildScreenshotFilename = (tab?: string, prefix = 'intelvia') => {
  const tabName = tab || 'dashboard';
  const ts = new Date().toISOString().replace(/T/, '_').split('.')[0].replace(/:/g, '-');
  return `${prefix}-${tabName}-view-${ts}.png`;
};

/**
 * Convert a data URL to a File object.
 */
export async function dataUrlToFile(dataUrl: string, filename: string) {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error('Failed to fetch data URL');
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

/**
 * Download a data URL as a file.
 */
export function downloadDataUrl(dataUrl: string, filename?: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share files using the Web Share API (if available).
 */
export async function shareFiles(files: File[], text?: string) {
  const nav = navigator as Navigator;
  if (!nav.share) {
    console.warn('Web Share API not available');
    return;
  }
  await nav.share({ files, text });
}

/**
 * Capture an element (or document) to a PNG data URL with optional white padding.
 * - Returns padded data URL (image/png)
 * - Optionally filter out elements matching `hideSelector`
 */
export async function captureScreenshot(target: Element | Document | null, opts: CaptureOptions = {}) {
  const {
    pixelRatio = 2, paddingPx = 16, backgroundColor = '#ffffff', hideSelector,
  } = opts;

  const targetEl = target ?? document.documentElement;
  const width = targetEl instanceof Element ? targetEl.scrollWidth : document.documentElement.scrollWidth;
  const height = targetEl instanceof Element ? targetEl.scrollHeight : document.documentElement.scrollHeight;

  const filter = (node: Node) => {
    try {
      if (!(node instanceof Element)) return true;
      if (hideSelector && node.closest(hideSelector)) return false;
      return true;
    } catch {
      return true;
    }
  };

  // Create source canvas
  const screenshot = await htmlToImage.toCanvas(targetEl as HTMLElement, {
    backgroundColor,
    pixelRatio,
    filter,
    width,
    height,
  });

  // Create output canvas with padding
  const pad = Math.round(paddingPx * pixelRatio);
  const paddedScreenshot = document.createElement('canvas');
  paddedScreenshot.width = screenshot.width + pad * 2;
  paddedScreenshot.height = screenshot.height + pad * 2;
  const ctx = paddedScreenshot.getContext('2d');
  if (!ctx) return screenshot.toDataURL('image/png');

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, paddedScreenshot.width, paddedScreenshot.height);
  ctx.drawImage(screenshot, pad, pad);

  return paddedScreenshot.toDataURL('image/png');
}
