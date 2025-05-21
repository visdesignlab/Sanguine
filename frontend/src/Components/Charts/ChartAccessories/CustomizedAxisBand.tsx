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
  const [selectedColumns, setSelectedColumns] = useState<number[] | null>([]);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  /**
 * Helper to get all case IDs for one or more column values (using dp.xVal).
 *
 * @param columnValues
 *   A single xVal or an array of xVals to match against.
 * @returns
 *   An array of CASE_IDs for all data points whose xVal is in columnValues.
 */
  const getCaseIds = (columnValues: number | number[]): number[] => {
  // normalize to array
    const values = Array.isArray(columnValues) ? columnValues : [columnValues];
    return data
      .filter((dp: ScatterDataPoint) => values.includes(dp.xVal))
      .map((dp: ScatterDataPoint) => Number(dp.case.CASE_ID));
  };

  // Hover handler using the helper function.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      if (selectedColumns && !selectedColumns.includes(columnValue)) {
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
    if (selectedColumns && selectedColumns.includes(columnValue)) {
      setSelectedColumns(null);
      store.interactionStore.clearSelectedCases();
      store.interactionStore.deselectCaseIds(caseIds);
      return;
    }
    // Sets the selected column locally (for background highlighting).
    setSelectedColumns((prevSelectedColumns) => [...(prevSelectedColumns || []), columnValue]);

    // Sets selected case IDs & attribute from this column in the store.
    store.interactionStore.selectedCaseIds = caseIds;
    store.interactionStore.addSelectedAttribute([xAxisVar, columnValue]);
  };

  // Reset locally selected column when another component updates the store's selectedCaseIds.
  useEffect(() => {
    if (selectedColumns !== null) {
      const columnCaseIds = getCaseIds(selectedColumns);
      const storeCaseIds = store.interactionStore.selectedCaseIds;

      // If the store's selected case IDs don't match the column's case IDs, reset the selected column.
      const isSame = columnCaseIds.length === storeCaseIds.length
        && columnCaseIds.every((id) => storeCaseIds.includes(id));
      if (!isSame) {
        setSelectedColumns(null);
      }
    }
  }, [store.interactionStore.selectedCaseIds, data, selectedColumns]);

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
                selectedColumns?.includes(idx)
                  ? backgroundSelectedColor
                  : hoveredColumn === idx
                    ? backgroundHoverColor
                    : idx % 2 === 1
                      ? 'white'
                      : 'black'
              }
              opacity={selectedColumns?.includes(idx) || hoveredColumn === idx ? 0.5 : 0.05}
            />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
