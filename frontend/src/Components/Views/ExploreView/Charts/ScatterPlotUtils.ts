import {
  DumbbellCase,
  SCATTER_CHAR_WIDTH_CASE,
  SCATTER_EMPTY_NESTED_BIN_WIDTH,
} from '../../../../Types/application';

// ---------- Types ----------

export interface ScatterBinGroup {
  id: string;
  label: string;
  cases: DumbbellCase[];
  nestedBins: {
    id: string;
    label: string;
    cases: DumbbellCase[];
  }[];
  avg: number | null;
}

export interface ScatterVarConfig {
  label: string;
  unit: string;
  min: number;
  max: number;
  key: keyof DumbbellCase;
  defaultTargets: { min: number; max: number };
}

export type SpatialIndex = Map<string, number[]>;

// ---------- Data Processing ----------

/**
 * Groups raw DumbbellCase[] into bin groups for discrete x-axis mode.
 * For continuous x-axis mode, returns a single flat bin with all cases.
 */
export function getProcessedScatterData(
  rawData: DumbbellCase[],
  selectedX: string,
  yKey: keyof DumbbellCase,
  sortMode: string,
  isDiscrete: boolean,
): ScatterBinGroup[] {
  // --- Continuous mode: return all cases in a single "virtual" bin ---
  if (!isDiscrete) {
    const sortedCases = sortCases([...rawData], yKey, sortMode);
    const avg = computeAvg(sortedCases, yKey);
    return [{
      id: '__continuous__',
      label: '',
      cases: sortedCases,
      nestedBins: [{ id: '__continuous__-all', label: 'All Cases', cases: sortedCases }],
      avg,
    }];
  }

  // --- Discrete mode: group into bins ---
  const groupedByBinGroup = new Map<string, DumbbellCase[]>();

  rawData.forEach((d: DumbbellCase) => {
    let key = '';
    if (selectedX === 'year_quarter') {
      const date = new Date(d.surgery_start_dtm);
      key = `${date.getFullYear()}`;
    } else if (selectedX === 'rbc_units') {
      const val = ((d as unknown) as Record<string, unknown>).rbc_units as number ?? 0;
      key = `${val} ${val === 1 ? 'RBC' : 'RBCs'}`;
    } else if (selectedX === 'plt_units') {
      const val = ((d as unknown) as Record<string, unknown>).plt_units as number ?? 0;
      key = `${val} ${val === 1 ? 'Platelet' : 'Platelets'}`;
    } else if (selectedX === 'cryo_units') {
      const val = ((d as unknown) as Record<string, unknown>).cryo_units as number ?? 0;
      key = `${val} ${val === 1 ? 'Cryo' : 'Cryo Units'}`;
    } else if (selectedX === 'ffp_units') {
      const val = ((d as unknown) as Record<string, unknown>).ffp_units as number ?? 0;
      key = `${val} ${val === 1 ? 'FFP' : 'FFPs'}`;
    } else if (selectedX === 'cell_saver_ml') {
      const val = ((d as unknown) as Record<string, unknown>).cell_saver_ml as number ?? 0;
      if (val === 0) {
        key = '0 mL';
      } else {
        const lower = Math.floor(val / 100) * 100;
        const upper = lower + 100;
        key = `${lower}-${upper} mL`;
      }
    }

    if (!groupedByBinGroup.has(key)) groupedByBinGroup.set(key, []);
    groupedByBinGroup.get(key)?.push(d);
  });

  // Sort bin group keys
  const sortedKeys = Array.from(groupedByBinGroup.keys());
  if (['year_quarter', 'rbc_units', 'plt_units', 'cryo_units', 'ffp_units'].includes(selectedX)) {
    sortedKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  } else if (selectedX === 'cell_saver_ml') {
    sortedKeys.sort((a, b) => {
      if (a === '0 mL') return -1;
      if (b === '0 mL') return 1;
      const aVal = parseInt(a.split('-')[0], 10);
      const bVal = parseInt(b.split('-')[0], 10);
      return aVal - bVal;
    });
  }

  const hierarchy: ScatterBinGroup[] = [];

  sortedKeys.forEach((binGroupId) => {
    const cases = groupedByBinGroup.get(binGroupId)!;
    const hasNestedBins = selectedX === 'year_quarter';

    if (sortMode === 'time' && hasNestedBins) {
      // Year & Quarter: create quarter nested bins
      const groupedByNestedBin = new Map<string, DumbbellCase[]>();

      cases.forEach((d) => {
        const date = new Date(d.surgery_start_dtm);
        const q = Math.floor((date.getMonth() + 3) / 3);
        const subKey = `Q${q}`;
        if (!groupedByNestedBin.has(subKey)) groupedByNestedBin.set(subKey, []);
        groupedByNestedBin.get(subKey)?.push(d);
      });

      // Ensure all 4 quarters exist
      for (let q = 1; q <= 4; q += 1) {
        const qKey = `Q${q}`;
        if (!groupedByNestedBin.has(qKey)) {
          groupedByNestedBin.set(qKey, []);
        }
      }

      const nestedBins = Array.from(groupedByNestedBin.entries())
        .map(([nestedBinLabel, nestedBinCases]) => {
          const sortedCases = [...nestedBinCases];
          sortedCases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);
          return {
            id: `${binGroupId}-${nestedBinLabel}`,
            label: nestedBinLabel,
            cases: sortedCases,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      hierarchy.push({
        id: binGroupId,
        label: binGroupId,
        cases,
        nestedBins,
        avg: computeAvg(cases, yKey),
      });
    } else {
      // Flat or sorted mode: all cases in one virtual nested bin
      const sortedCases = sortCases([...cases], yKey, sortMode);

      hierarchy.push({
        id: binGroupId,
        label: binGroupId,
        cases,
        nestedBins: [{
          id: `${binGroupId}-all`,
          label: 'All Cases',
          cases: sortedCases,
        }],
        avg: computeAvg(cases, yKey),
      });
    }
  });

  return hierarchy;
}

// ---------- Layout ----------

function getShortenedLabel(label: string) {
  if (label.includes('RBC')) return label.split(' ')[0];
  if (label.includes('Platelet')) return label.split(' ')[0];
  if (label.includes('Cryo')) return label.split(' ')[0];
  if (label.includes('FFP')) return label.split(' ')[0];
  return label;
}

export function calculateScatterLayout(
  processedData: ScatterBinGroup[],
  collapsedBinGroups: Set<string>,
  collapsedNestedBins: Set<string>,
  selectedX: string,
  measureText: (text: string) => number,
) {
  const binGroupLayout = new Map<string, { x: number, width: number, label: string }>();
  const nestedBinLayout = new Map<string, { x: number, width: number }>();

  let currentX = 0;

  processedData.forEach((binGroup) => {
    const binGroupStartX = currentX;
    let displayLabel = binGroup.id;

    if (collapsedBinGroups.has(binGroup.id)) {
      currentX += 50;
    } else {
      binGroup.nestedBins.forEach((nestedBin) => {
        const nestedBinStartX = currentX;
        if (collapsedNestedBins.has(nestedBin.id)) {
          currentX += 40;
        } else if (nestedBin.cases.length === 0) {
          currentX += SCATTER_EMPTY_NESTED_BIN_WIDTH;
        } else {
          currentX += nestedBin.cases.length * SCATTER_CHAR_WIDTH_CASE;
        }
        nestedBinLayout.set(nestedBin.id, { x: nestedBinStartX, width: currentX - nestedBinStartX });
      });
    }

    let binGroupWidth = currentX - binGroupStartX;

    // Ensure bin group labels fit
    const fullWidth = measureText(displayLabel);
    if (binGroupWidth < fullWidth + 10) {
      const shortLabel = getShortenedLabel(displayLabel);
      const shortWidth = measureText(shortLabel);

      if (shortLabel !== displayLabel && binGroupWidth >= shortWidth + 8) {
        displayLabel = shortLabel;
      } else {
        const targetWidth = (shortLabel !== displayLabel) ? shortWidth : fullWidth;
        if (binGroupWidth < targetWidth + 10) {
          const deficit = (targetWidth + 10) - binGroupWidth;
          currentX += deficit;
          binGroupWidth += deficit;
          if (shortLabel !== displayLabel) displayLabel = shortLabel;
        }
      }
    }

    binGroupLayout.set(binGroup.id, { x: binGroupStartX, width: binGroupWidth, label: displayLabel });
  });

  return { binGroupLayout, nestedBinLayout, totalWidth: currentX };
}

// ---------- Spatial Index ----------

interface PointPosition {
  x: number;
  y: number;
  caseIdx: number;
  binGroupIdx: number;
  nestedBinIdx: number;
  caseInBinIdx: number;
}

const CELL_SIZE = 20;

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function buildSpatialIndex(points: PointPosition[]): SpatialIndex {
  const index: SpatialIndex = new Map();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const cx = Math.floor(p.x / CELL_SIZE);
    const cy = Math.floor(p.y / CELL_SIZE);
    const key = cellKey(cx, cy);
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push(i);
  }
  return index;
}

export function findNearestPoint(
  index: SpatialIndex,
  points: PointPosition[],
  mouseX: number,
  mouseY: number,
  maxDistance: number = 10,
): PointPosition | null {
  const cx = Math.floor(mouseX / CELL_SIZE);
  const cy = Math.floor(mouseY / CELL_SIZE);

  let nearest: PointPosition | null = null;
  let nearestDist = maxDistance * maxDistance; // squared distance

  // Check the cell the mouse is in + all 8 neighbors
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const key = cellKey(cx + dx, cy + dy);
      const bucket = index.get(key);
      if (!bucket) continue;

      for (let i = 0; i < bucket.length; i += 1) {
        const p = points[bucket[i]];
        const distSq = (p.x - mouseX) ** 2 + (p.y - mouseY) ** 2;
        if (distSq < nearestDist) {
          nearestDist = distSq;
          nearest = p;
        }
      }
    }
  }

  return nearest;
}

// ---------- Helpers ----------

function sortCases(cases: DumbbellCase[], yKey: keyof DumbbellCase, sortMode: string): DumbbellCase[] {
  if (sortMode === 'asc') {
    cases.sort((a, b) => {
      const aVal = a[yKey] as number | null | undefined;
      const bVal = b[yKey] as number | null | undefined;
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -1;
      if (bVal == null) return 1;
      return aVal - bVal;
    });
  } else if (sortMode === 'desc') {
    cases.sort((a, b) => {
      const aVal = a[yKey] as number | null | undefined;
      const bVal = b[yKey] as number | null | undefined;
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return bVal - aVal;
    });
  } else {
    // 'time' or default: sort by surgery time
    cases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);
  }
  return cases;
}

function computeAvg(cases: DumbbellCase[], yKey: keyof DumbbellCase): number | null {
  let sum = 0;
  let count = 0;
  cases.forEach((c) => {
    const val = c[yKey] as number | undefined;
    if (val !== undefined && val !== null) {
      sum += val;
      count += 1;
    }
  });
  return count > 0 ? sum / count : null;
}

// Export the PointPosition type for use in ScatterPlot.tsx
export type { PointPosition };
