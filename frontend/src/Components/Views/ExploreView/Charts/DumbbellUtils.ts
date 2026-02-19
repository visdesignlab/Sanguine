import {
  DumbbellCase, DumbbellData, DumbbellLabConfig, DumbbellSortState,
  DUMBBELL_EMPTY_NESTED_BIN_WIDTH, DUMBBELL_CHAR_WIDTH_CASE,
} from '../../../../Types/application';

// Grouping and processing logic
export function getProcessedDumbbellData(
  rawData: DumbbellData,
  selectedX: string,
  labConfig: DumbbellLabConfig,
  sortMode: string,
  hasNestedBins: boolean,
) {
  const groupedByBinGroup = new Map<string, DumbbellCase[]>();

  // Grouping Logic based on selectedX
  rawData.forEach((d: DumbbellCase) => {
    let key = d.surgeon_prov_id; // Default Surgeon
    if (selectedX === 'anesthesiologist') key = d.anesth_prov_id;
    else if (selectedX === 'year_quarter') {
      const date = new Date(d.surgery_start_dtm);
      key = `${date.getFullYear()}`;
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
    cases: DumbbellCase[];
    nestedBins: {
      id: string;
      label: string;
      cases: DumbbellCase[];
      minPre: number;
      minPost: number;
    }[];
  }[] = [];

  // Sort Keys
  const sortedKeys = Array.from(groupedByBinGroup.keys());
  if (selectedX === 'year_quarter' || selectedX === 'rbc' || selectedX === 'platelet' || selectedX === 'cryo' || selectedX === 'ffp') {
    sortedKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  } else if (selectedX === 'cell_salvage') {
    sortedKeys.sort((a, b) => {
      if (a === '0 mL') return -1;
      if (b === '0 mL') return 1;
      const aVal = parseInt(a.split('-')[0], 10);
      const bVal = parseInt(b.split('-')[0], 10);
      return aVal - bVal;
    });
  } else {
    sortedKeys.sort(); // Alphabetical for names
  }

  sortedKeys.forEach((binGroupId) => {
    const cases = groupedByBinGroup.get(binGroupId)!;
    const binGroupSort = sortMode === 'time' ? 'none' : sortMode as DumbbellSortState;

    if (binGroupSort === 'none') {
      const groupedByNestedBin = new Map<string, DumbbellCase[]>();

      cases.forEach((d) => {
        let subKey = d.visit_no; // Default Visit ID
        if (selectedX === 'year_quarter') {
          const date = new Date(d.surgery_start_dtm);
          const q = Math.floor((date.getMonth() + 3) / 3);
          subKey = `Q${q}`;
        } else if (!hasNestedBins) {
          subKey = 'All Cases';
        }
        if (!groupedByNestedBin.has(subKey)) groupedByNestedBin.set(subKey, []);
        groupedByNestedBin.get(subKey)?.push(d);
      });

      if (selectedX === 'year_quarter') {
        for (let q = 1; q <= 4; q += 1) {
          const qKey = `Q${q}`;
          if (!groupedByNestedBin.has(qKey)) {
            groupedByNestedBin.set(qKey, []);
          }
        }
      }

      const nestedBins = Array.from(groupedByNestedBin.entries()).map(([nestedBinLabel, nestedBinCases]) => {
        const preAccess = labConfig.preKey;
        const postAccess = labConfig.postKey;
        const preValues = nestedBinCases.map((c) => c[preAccess] as number);
        const postValues = nestedBinCases.map((c) => c[postAccess] as number);
        const minPre = preValues.length > 0 ? Math.min(...preValues) : Infinity;
        const minPost = postValues.length > 0 ? Math.min(...postValues) : Infinity;

        const sortedCases = [...nestedBinCases];
        sortedCases.sort((a, b) => a.surgery_start_dtm - b.surgery_start_dtm);

        return {
          id: `${binGroupId}-${nestedBinLabel}`,
          label: nestedBinLabel,
          cases: sortedCases,
          minPre,
          minPost,
        };
      });

      if (selectedX === 'year_quarter') {
        nestedBins.sort((a, b) => a.label.localeCompare(b.label));
      } else if (['surgeon', 'anesthesiologist'].includes(selectedX)) {
        nestedBins.sort((a, b) => {
          const timeA = a.cases[0]?.surgery_start_dtm || 0;
          const timeB = b.cases[0]?.surgery_start_dtm || 0;
          return timeA - timeB;
        });
      }

      hierarchy.push({
        id: binGroupId,
        cases,
        nestedBins,
      });
    } else {
      const sortedCases = [...cases];
      const preAccess = labConfig.preKey;
      const postAccess = labConfig.postKey;

      if (binGroupSort === 'pre') {
        sortedCases.sort((a, b) => (a[preAccess] as number) - (b[preAccess] as number));
      } else if (binGroupSort === 'post') {
        sortedCases.sort((a, b) => (a[postAccess] as number) - (b[postAccess] as number));
      } else if (binGroupSort === 'gap') {
        sortedCases.sort((a, b) => Math.abs((a[preAccess] as number) - (a[postAccess] as number)) - Math.abs((b[preAccess] as number) - (b[postAccess] as number)));
      }

      const minPre = Math.min(...sortedCases.map((c) => c[preAccess] as number));
      const minPost = Math.min(...sortedCases.map((c) => c[postAccess] as number));

      const virtualNestedBin = {
        id: `${binGroupId}-all-sorted`,
        label: 'All Cases',
        cases: sortedCases,
        minPre,
        minPost,
      };

      hierarchy.push({
        id: binGroupId,
        cases,
        nestedBins: [virtualNestedBin],
      });
    }
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

// Layout calculation logic
export function calculateDumbbellLayout(
  processedData: ReturnType<typeof getProcessedDumbbellData>,
  collapsedBinGroups: Set<string>,
  collapsedNestedBins: Set<string>,
  selectedX: string,
  measureText: (text: string) => number,
) {
  const items: {
    type: 'case' | 'visit_gap' | 'provider_gap' | 'spacer',
    data?: DumbbellCase,
    width: number
  }[] = [];

  const binGroupLayout = new Map<string, { x: number, width: number, label: string }>();
  const nestedBinLayout = new Map<string, { x: number, width: number }>();

  let currentX = 0;

  processedData.forEach((binGroup) => {
    const binGroupStartX = currentX;
    let displayLabel = binGroup.id;

    if (collapsedBinGroups.has(binGroup.id)) {
      const width = 50;
      items.push({ type: 'provider_gap', width });
      currentX += width;
    } else {
      binGroup.nestedBins.forEach((nestedBin) => {
        const nestedBinStartX = currentX;
        if (collapsedNestedBins.has(nestedBin.id)) {
          const width = 40;
          items.push({ type: 'visit_gap', width });
          currentX += width;
        } else if (nestedBin.cases.length === 0) {
          const width = DUMBBELL_EMPTY_NESTED_BIN_WIDTH;
          items.push({ type: 'visit_gap', width });
          currentX += width;
        } else {
          nestedBin.cases.forEach((c) => {
            const width = DUMBBELL_CHAR_WIDTH_CASE;
            items.push({ type: 'case', data: c, width });
            currentX += width;
          });
        }
        nestedBinLayout.set(nestedBin.id, { x: nestedBinStartX, width: currentX - nestedBinStartX });
      });
    }

    let binGroupWidth = currentX - binGroupStartX;
    const isSurgeon = selectedX === 'surgeon' || selectedX === 'anesthesiologist';

    if (isSurgeon) {
      const MIN_SURGEON_WIDTH = 40;
      if (binGroupWidth < MIN_SURGEON_WIDTH) {
        const deficit = MIN_SURGEON_WIDTH - binGroupWidth;
        items.push({ type: 'spacer', width: deficit });
        currentX += deficit;
        binGroupWidth += deficit;
      }
    } else {
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
            items.push({ type: 'spacer', width: deficit });
            currentX += deficit;
            binGroupWidth += deficit;
            if (shortLabel !== displayLabel) displayLabel = shortLabel;
          }
        }
      }
    }

    binGroupLayout.set(binGroup.id, { x: binGroupStartX, width: binGroupWidth, label: displayLabel });
  });

  return { items, binGroupLayout, nestedBinLayout };
}
