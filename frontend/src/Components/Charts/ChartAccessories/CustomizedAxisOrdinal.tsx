/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import { scaleOrdinal } from 'd3';
import Tooltip from '@mui/material/Tooltip';
import {
  basicGray, secondaryGray, backgroundSelectedColor, backgroundHoverColor,
} from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import { usePrivateProvLabel } from '../../Hooks/PrivateModeLabeling';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAxisVar, chartHeight, data,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { bin: number, indexEnding: number; }[];
  xAxisVar: string;
  chartHeight: number;
  data: DumbbellDataPoint[];
}) {
  const store = useContext(Store);

  // Used for keeping track of currently hovered and selected columns for background highlighting.
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    const sc = scaleOrdinal<any, number>()
      .domain(domain)
      .range(range);

    return sc;
  }, [scaleDomain, scaleRange]);

  // Gets the provider name depending on the private mode setting
  const getLabel = usePrivateProvLabel();

  // Helper to get all case IDs for a column
  const getCaseIds = (columnValue: number): number[] => data.filter((dp: DumbbellDataPoint) => dp.yVal === columnValue)
    .map((dp: DumbbellDataPoint) => Number(dp.case.CASE_ID));

  // Hover handler using the helper function.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      if (selectedColumn !== columnValue) {
        setHoveredColumn(columnValue);
      }
      store.interactionStore.hoveredAttribute = [xAxisVar, columnValue];
    }
  };

  // Click handler using the helper function.
  const handleColumnClick = (columnValue: number) => {
    // If the column is already selected, deselect it.
    console.log("column clicked", columnValue, "selected column", selectedColumn);
    if (selectedColumn === columnValue) {
      setSelectedColumn(null);
      console.log("Desselecting column: ", columnValue);
      store.interactionStore.deselectAttribute([xAxisVar, columnValue]);
      console.log("attributes:", store.interactionStore.selectedAttributes);
      return;
    }
    // Set the local and store selected column and case ids.
    setSelectedColumn(columnValue);

    // Sets selected case IDs & attribute from this column in the store.
    store.interactionStore.addSelectedAttribute([xAxisVar, columnValue]);
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
      {numberList.map((numberOb, idx) => {
        const s = scale();
        const x1 = idx === 0
          ? 2 * s(0) - s(1)
          : 1 + s(numberList[idx - 1].indexEnding + 1) - 0.5 * (s(numberList[idx - 1].indexEnding + 1) - s(numberList[idx - 1].indexEnding));

        const x2 = idx === numberList.length - 1
          ? (s.range().at(-1) as number) + 30
          : -1 + s(numberOb.indexEnding) + 0.5 * (s(numberOb.indexEnding + 1) - s(numberOb.indexEnding));

        if (x1 && x2) {
          const binLabel = getLabel(numberOb.bin, xAxisVar);
          return (
            <g
              key={idx}
              onMouseEnter={() => handleColumnHover(numberOb.bin)}
              onMouseLeave={() => {
                setHoveredColumn(null);
                store.interactionStore.clearHoveredAttribute();
              }}
              onClick={() => handleColumnClick(numberOb.bin)}
            >
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
              <CustomAxisColumnBackground
                x={x1}
                width={x2 - x1}
                chartHeight={chartHeight}
                fill={
                  selectedColumn === numberOb.bin
                    ? backgroundSelectedColor
                    : hoveredColumn === numberOb.bin
                      ? backgroundHoverColor
                      : idx % 2 === 1
                        ? 'white'
                        : 'black'
                }
                opacity={selectedColumn === numberOb.bin || hoveredColumn === numberOb.bin ? 0.5 : 0.05}
              />
              <Tooltip title={binLabel} arrow>
                <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>
                  {binLabel}
                </AxisText>
              </Tooltip>
            </g>
          );
        }
        return null;
      })}
    </>
  );
}

export default observer(CustomizedAxisOrdinal);
