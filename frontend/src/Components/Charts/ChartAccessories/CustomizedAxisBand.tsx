import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import {
  basicGray, secondaryGray, backgroundHoverColor, backgroundSelectedColor,
} from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint } from '../../../Interfaces/Types/DataTypes';

type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;
  chartHeight: number;
  data: ScatterDataPoint[];
  xAxisVar: string;
};

function CustomizedAxisBand({
  scaleDomain, scaleRange, scalePadding, chartHeight, data, xAxisVar,
}: Props) {
  const store = useContext(Store);

  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  // Helper to get all case IDs for a column (using dp.xVal)
  const getCaseIds = (columnValue: number): number[] => data.filter((dp: ScatterDataPoint) => dp.xVal === columnValue)
    .map((dp: ScatterDataPoint) => Number(dp.case.CASE_ID));

  // Hover handler using the helper function.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      if (selectedColumn !== columnValue) {
        setHoveredColumn(columnValue);
      }
      const caseIds = getCaseIds(columnValue);
      store.interactionStore.hoveredCaseIds = caseIds;
      store.interactionStore.hoveredAttribute = [xAxisVar, columnValue];
    }
  };

  // Click handler using the helper function.
  const handleColumnClick = (columnValue: number) => {
    const caseIds = getCaseIds(columnValue);

    // If the column is already selected, deselect it.
    if (selectedColumn === columnValue) {
      setSelectedColumn(null);
      store.interactionStore.clearSelectedCases();
      store.interactionStore.deselectCaseIds(caseIds);
      return;
    }
    // Sets the selected column locally (for background highlighting).
    setSelectedColumn(columnValue);

    // Sets selected case IDs & attribute from this column in the store.
    store.interactionStore.selectedCaseIds = caseIds;
    store.interactionStore.selectedAttribute = [xAxisVar, columnValue];
  };

  // Reset locally selected column when another component updates the store's selectedCaseIds.
  useEffect(() => {
    if (selectedColumn !== null) {
      const columnCaseIds = getCaseIds(selectedColumn);
      const storeCaseIds = store.interactionStore.selectedCaseIds;

      // If the store's selected case IDs don't match the column's case IDs, reset the selected column.
      const isSame = columnCaseIds.length === storeCaseIds.length
        && columnCaseIds.every((id) => storeCaseIds.includes(id));
      if (!isSame) {
        setSelectedColumn(null);
      }
    }
  }, [store.interactionStore.selectedCaseIds, data, selectedColumn]);

  return (
    <>
      {scale().domain().map((number, idx) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g
            key={idx}
            onMouseEnter={() => handleColumnHover(idx)}
            onMouseLeave={() => {
              setHoveredColumn(null);
              store.interactionStore.clearHoveredAttribute();
            }}
            onClick={() => handleColumnClick(idx)}
          >
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
            <CustomAxisColumnBackground
              x={x1}
              width={x2 - x1}
              chartHeight={chartHeight}
              fill={
                selectedColumn === idx
                  ? backgroundSelectedColor
                  : hoveredColumn === idx
                    ? backgroundHoverColor
                    : idx % 2 === 1
                      ? 'white'
                      : 'black'
              }
              opacity={selectedColumn === idx || hoveredColumn === idx ? 0.5 : 0.05}
            />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
