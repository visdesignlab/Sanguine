import {
  DumbbellCase, DumbbellData, DumbbellLabConfig, DumbbellSortState,
  DUMBBELL_CHAR_WIDTH_CASE,
} from '../../../../Types/application';

// Grouping and processing logic
export function getProcessedDumbbellData(
  rawData: DumbbellData,
  selectedX: string,
  labConfig: DumbbellLabConfig,
  sortMode: string,
  providerSort: 'alpha' | 'count' | 'pre' | 'post' = 'alpha',
) {
  const preAccess = labConfig.preKey;
  const postAccess = labConfig.postKey;

  // Filter out cases where either pre or post values are missing
  const filteredData = rawData.filter((d) => {
    const preVal = d[preAccess];
    const postVal = d[postAccess];
    return preVal != null && postVal != null;
  });

  const groupedByBinGroup = new Map<string, DumbbellCase[]>();

  // Grouping Logic based on selectedX
  filteredData.forEach((d: DumbbellCase) => {
    let key = d.surgeon_prov_name; // Default Surgeon Name
    if (selectedX === 'anesthesiologist') key = d.anesth_prov_name;
    else if (selectedX === 'year') {
      const date = new Date(d.surgery_start_dtm);
      key = `${date.getFullYear()}`;
    } else if (selectedX === 'quarter') {
      const date = new Date(d.surgery_start_dtm);
      const year = date.getFullYear();
      const q = Math.floor((date.getMonth() + 3) / 3);
      key = `${year}-Q${q}`;
    } else if (selectedX === 'rbc') {
      const val = d.intraop_rbc_units;
      key = `${val} ${val === 1 ? 'RBC' : 'RBCs'}`;
    } else if (selectedX === 'platelet') {
      const val = d.intraop_plt_units;
      key = `${val} ${val === 1 ? 'Platelet' : 'Platelets'}`;
    } else if (selectedX === 'cryo') {
      const val = d.intraop_cryo_units;
      key = `${val} ${val === 1 ? 'Cryo' : 'Cryo Units'}`;
    } else if (selectedX === 'ffp') {
      const val = d.intraop_ffp_units;
      key = `${val} ${val === 1 ? 'FFP' : 'FFPs'}`;
    } else if (selectedX === 'cell_salvage') {
      const val = d.intraop_cell_saver_ml ?? 0;
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

  const hierarchy: {
    id: string;
    label: string;
    cases: DumbbellCase[];
    minPre: number;
    minPost: number;
    avgPre: number | null;
    avgPost: number | null;
  }[] = [];

  const sortedKeys = Array.from(groupedByBinGroup.keys());
  if (selectedX === 'year' || selectedX === 'rbc' || selectedX === 'platelet' || selectedX === 'cryo' || selectedX === 'ffp') {
    sortedKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  } else if (selectedX === 'quarter') {
    sortedKeys.sort((a, b) => a.localeCompare(b));
  } else if (selectedX === 'cell_salvage') {
    sortedKeys.sort((a, b) => {
      if (a === '0 mL') return -1;
      if (b === '0 mL') return 1;
      const aVal = parseInt(a.split('-')[0], 10);
      const bVal = parseInt(b.split('-')[0], 10);
      return aVal - bVal;
    });
  } else if (providerSort === 'count') { // Surgeon or Anesthesiologist Sorting
    sortedKeys.sort((a, b) => {
      const aCount = groupedByBinGroup.get(a)?.length || 0;
      const bCount = groupedByBinGroup.get(b)?.length || 0;
      return bCount - aCount;
    });
  } else if (providerSort === 'pre' || providerSort === 'post') {
    sortedKeys.sort((a, b) => {
      const casesA = groupedByBinGroup.get(a) || [];
      const casesB = groupedByBinGroup.get(b) || [];

      const getAvg = (cases: DumbbellCase[], type: 'pre' | 'post') => {
        let sum = 0;
        let count = 0;
        cases.forEach((c) => {
          const val = type === 'pre' ? c[preAccess] : c[postAccess];
          if (val !== undefined && val !== null) {
            sum += val as number;
            count += 1;
          }
        });
        return count > 0 ? sum / count : 0;
      };

      const aAvg = getAvg(casesA, providerSort);
      const bAvg = getAvg(casesB, providerSort);

      return bAvg - aAvg; // Descending average
    });
  } else {
    sortedKeys.sort(); // Alphabetical for names
  }

  sortedKeys.forEach((binGroupId) => {
    const cases = groupedByBinGroup.get(binGroupId)!;
    const binGroupSort = sortMode === 'time' ? 'none' : sortMode as DumbbellSortState;

    const sortedCases = [...cases];

    if (binGroupSort === 'pre') {
      sortedCases.sort((a, b) => {
        const aVal = a[preAccess] as number | null | undefined;
        const bVal = b[preAccess] as number | null | undefined;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return -1;
        if (bVal == null) return 1;
        return aVal - bVal;
      });
    } else if (binGroupSort === 'post') {
      sortedCases.sort((a, b) => {
        const aVal = a[postAccess] as number | null | undefined;
        const bVal = b[postAccess] as number | null | undefined;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return -1;
        if (bVal == null) return 1;
        return aVal - bVal;
      });
    } else if (binGroupSort === 'gap') {
      sortedCases.sort((a, b) => {
        const aPre = a[preAccess] as number | null | undefined;
        const aPost = a[postAccess] as number | null | undefined;
        const bPre = b[preAccess] as number | null | undefined;
        const bPost = b[postAccess] as number | null | undefined;

        const aValid = aPre != null && aPost != null;
        const bValid = bPre != null && bPost != null;

        if (!aValid && !bValid) return 0;
        if (!aValid) return -1; // place invalid at the beginning
        if (!bValid) return 1;

        const aGap = Math.abs(aPre! - aPost!);
        const bGap = Math.abs(bPre! - bPost!);
        return aGap - bGap;
      });
    } else {
      // sortMode 'time' or default 'none'
      sortedCases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);
    }

    const preValues = sortedCases.map((c) => c[preAccess] as number).filter((v) => v !== undefined && v !== null);
    const postValues = sortedCases.map((c) => c[postAccess] as number).filter((v) => v !== undefined && v !== null);
    const minPre = preValues.length > 0 ? Math.min(...preValues) : Infinity;
    const minPost = postValues.length > 0 ? Math.min(...postValues) : Infinity;

    let sumPre = 0; let countPre = 0;
    let sumPost = 0; let countPost = 0;

    cases.forEach((c) => {
      const preVal = c[preAccess] as number | undefined;
      const postVal = c[postAccess] as number | undefined;
      if (preVal !== undefined && preVal !== null) {
        sumPre += preVal;
        countPre += 1;
      }
      if (postVal !== undefined && postVal !== null) {
        sumPost += postVal;
        countPost += 1;
      }
    });
    const avgPre = countPre > 0 ? sumPre / countPre : null;
    const avgPost = countPost > 0 ? sumPost / countPost : null;

    hierarchy.push({
      id: binGroupId,
      label: binGroupId,
      cases: sortedCases,
      minPre,
      minPost,
      avgPre,
      avgPost,
    });
  });

  return hierarchy;
}

function getShortenedLabel(label: string) {
  if (label.includes('RBC')) return label.split(' ')[0];
  if (label.includes('Platelet')) return label.split(' ')[0];
  if (label.includes('Cryo')) return label.split(' ')[0];
  if (label.includes('FFP')) return label.split(' ')[0];
  return label;
}

function getProviderLastName(label: string) {
  if (label.includes(',')) {
    return label.split(',')[0].trim();
  }
  const parts = label.split(' ');
  return parts[parts.length - 1];
}

// Layout calculation logic
export function calculateDumbbellLayout(
  processedData: ReturnType<typeof getProcessedDumbbellData>,
  collapsedBinGroups: Set<string>,
  selectedX: string,
  measureText: (text: string) => number,
) {
  const items: {
    type: 'case' | 'provider_gap' | 'spacer',
    data?: DumbbellCase,
    width: number
  }[] = [];

  const binGroupLayout = new Map<string, { x: number, width: number, label: string, isOverflowing: boolean }>();

  let currentX = 0;

  processedData.forEach((binGroup) => {
    const binGroupStartX = currentX;
    let displayLabel = binGroup.id;

    if (collapsedBinGroups.has(binGroup.id)) {
      const width = 50;
      items.push({ type: 'provider_gap', width });
      currentX += width;
    } else {
      binGroup.cases.forEach((c) => {
        const width = DUMBBELL_CHAR_WIDTH_CASE;
        items.push({ type: 'case', data: c, width });
        currentX += width;
      });
    }

    let binGroupWidth = currentX - binGroupStartX;
    let isOverflowing = false;
    const isSurgeon = selectedX === 'surgeon' || selectedX === 'anesthesiologist';

    if (isSurgeon) {
      const MIN_SURGEON_WIDTH = 40;
      if (binGroupWidth < MIN_SURGEON_WIDTH) {
        const deficit = MIN_SURGEON_WIDTH - binGroupWidth;
        items.push({ type: 'spacer', width: deficit });
        currentX += deficit;
        binGroupWidth += deficit;
      }
    }

    const fullWidth = measureText(displayLabel);
    if (binGroupWidth < fullWidth + 10) {
      if (isSurgeon) {
        const lastName = getProviderLastName(displayLabel);
        const shortWidth = measureText(lastName);
        displayLabel = lastName;
        if (binGroupWidth < shortWidth + 10) {
          isOverflowing = true;
        }
      } else {
        const shortLabel = getShortenedLabel(displayLabel);
        const shortWidth = measureText(shortLabel);
        if (shortLabel !== displayLabel) {
          displayLabel = shortLabel;
        }
        if (binGroupWidth < shortWidth + 10) {
          isOverflowing = true;
        }
      }
    }

    binGroupLayout.set(binGroup.id, {
      x: binGroupStartX,
      width: binGroupWidth,
      label: displayLabel,
      isOverflowing,
    });
  });

  return { items, binGroupLayout };
}
