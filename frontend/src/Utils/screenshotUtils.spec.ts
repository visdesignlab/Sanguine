import {
  afterEach, beforeEach, describe, expect, test, vi,
} from 'vitest';
import {
  buildScreenshotFilename,
  captureScreenshot,
  dataUrlToFile,
  downloadDataUrl,
  shareFiles,
} from './screenshotUtils';

const { toCanvasMock } = vi.hoisted(() => ({
  toCanvasMock: vi.fn(),
}));

vi.mock('html-to-image', () => ({
  toCanvas: toCanvasMock,
}));

describe('buildScreenshotFilename', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('builds a stable timestamped filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T16:30:45.000Z'));

    expect(buildScreenshotFilename('providers')).toBe('intelvia-providers-view-2026-05-13_16-30-45.png');
  });
});

describe('dataUrlToFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('converts a fetched blob into a file', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    }));

    const file = await dataUrlToFile('data:image/png;base64,abcd', 'chart.png');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('chart.png');
    expect(file.type).toBe('image/png');
  });

  test('throws when the data URL fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
    }));

    await expect(dataUrlToFile('data:image/png;base64,abcd', 'chart.png')).rejects.toThrow('Failed to fetch data URL');
  });
});

describe('downloadDataUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates, clicks, and removes a download anchor', () => {
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') return anchor;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    downloadDataUrl('data:image/png;base64,abcd', 'chart.png');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe('data:image/png;base64,abcd');
    expect(anchor.download).toBe('chart.png');
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
  });
});

describe('shareFiles', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('warns and exits when the Web Share API is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await shareFiles([]);

    expect(warnSpy).toHaveBeenCalledWith('Web Share API not available');
  });

  test('delegates to navigator.share when available', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: shareSpy,
    });
    const file = new File(['x'], 'chart.png', { type: 'image/png' });

    await shareFiles([file], 'PBM dashboard');

    expect(shareSpy).toHaveBeenCalledWith({ files: [file], text: 'PBM dashboard' });
  });
});

describe('captureScreenshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    toCanvasMock.mockReset();
  });

  test('renders a padded screenshot canvas and respects the hide selector', async () => {
    const sourceCanvas = {
      width: 100,
      height: 50,
      toDataURL: vi.fn().mockReturnValue('source-data-url'),
    };
    toCanvasMock.mockResolvedValue(sourceCanvas);

    const fillRect = vi.fn();
    const drawImage = vi.fn();
    const paddedCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect,
        drawImage,
      }),
      toDataURL: vi.fn().mockReturnValue('padded-data-url'),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') return paddedCanvas as never;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    const target = originalCreateElement('section');
    Object.defineProperty(target, 'scrollWidth', { configurable: true, value: 120 });
    Object.defineProperty(target, 'scrollHeight', { configurable: true, value: 80 });

    const hiddenParent = originalCreateElement('div');
    hiddenParent.className = 'hide';
    const hiddenChild = originalCreateElement('span');
    hiddenParent.appendChild(hiddenChild);

    await expect(captureScreenshot(target, {
      pixelRatio: 3,
      paddingPx: 10,
      backgroundColor: '#abcdef',
      hideSelector: '.hide',
    })).resolves.toBe('padded-data-url');

    expect(toCanvasMock).toHaveBeenCalledTimes(1);
    const [, options] = toCanvasMock.mock.calls[0];
    expect(options).toMatchObject({
      backgroundColor: '#abcdef',
      pixelRatio: 3,
      width: 120,
      height: 80,
    });
    expect(options.filter(hiddenChild)).toBe(false);
    expect(options.filter(target)).toBe(true);
    expect(paddedCanvas.width).toBe(160);
    expect(paddedCanvas.height).toBe(110);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 160, 110);
    expect(drawImage).toHaveBeenCalledWith(sourceCanvas, 30, 30);
  });

  test('falls back to the source canvas data URL when 2d context is unavailable', async () => {
    const sourceCanvas = {
      width: 10,
      height: 10,
      toDataURL: vi.fn().mockReturnValue('source-data-url'),
    };
    toCanvasMock.mockResolvedValue(sourceCanvas);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(null),
        } as never;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    await expect(captureScreenshot(null)).resolves.toBe('source-data-url');
  });
});
