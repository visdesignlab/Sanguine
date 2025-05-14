/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import { scaleOrdinal } from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
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
  const { InteractionStore } = store;

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

  // Add a new handler that updates both the local hoveredColumn state and the store.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      setHoveredColumn(columnValue);
      // Filter the sorted data for cases within the hovered column.
      const pointsInColumn = data.filter(
        (dp: DumbbellDataPoint) => dp.yVal === columnValue,
      );
      // Update the hover store with all case IDs in that column
      store.InteractionStore.hoveredCaseIds = pointsInColumn.map(
        (dp: DumbbellDataPoint) => dp.case.CASE_ID,
      );
      store.InteractionStore.hoveredAttribute = [xAxisVar, columnValue];
    }
  };

  const handleColumnClick = (columnValue: number) => {
    const pointsInColumn = data.filter(
      (dp: DumbbellDataPoint) => dp.yVal === columnValue,
    );
    const caseIds = pointsInColumn.map(
      (dp: DumbbellDataPoint) => Number(dp.case.CASE_ID),
    );
    // If the column is already selected, deselect it.
    if (selectedColumn === columnValue) {
      setSelectedColumn(null);
      store.InteractionStore.clearSelectedCases();
      store.InteractionStore.selectedCaseIds = store.InteractionStore.selectedCaseIds.filter(
        (id: number) => !caseIds.includes(id),
      );
      return;
    }
    // Set the local and store selected column and case ids.
    setSelectedColumn(columnValue);
    store.InteractionStore.selectedCaseIds = caseIds;
    store.InteractionStore.selectedAttribute = [xAxisVar, columnValue];
  };

  // Reset selectedColumn when another plot selects other points.
  useEffect(() => {
    if (selectedColumn !== null) {
      // Get the case IDs for the currently selected column.
      const pointsInColumn = data.filter(
        (dp: DumbbellDataPoint) => dp.yVal === selectedColumn,
      );
      const columnCaseIds = pointsInColumn.map(
        (dp: DumbbellDataPoint) => Number(dp.case.CASE_ID),
      );
      // If there exists at least one different selected case ID in the store, clear the selected column.
      const storeCaseIds = store.InteractionStore.selectedCaseIds;
      const isSame = columnCaseIds.length === storeCaseIds.length
        && columnCaseIds.every((id) => storeCaseIds.includes(id));
      if (!isSame) {
        setSelectedColumn(null);
      }
    }
  }, [store.InteractionStore.selectedCaseIds, data, selectedColumn]);

  return (
    <>

      {numberList.map((numberOb, idx) => {
        const s = scale();
        const x1 = idx === 0
          ? 2 * s(0) - s(1)
          : 1 + s(numberList[idx - 1].indexEnding + 1) - 0.5 * (s(numberList[idx - 1].indexEnding + 1) - s(numberList[idx - 1].indexEnding));

        const x2 = idx === numberList.length - 1
          ? s.range().at(-1) as number + 30
          : -1 + s(numberOb.indexEnding) + 0.5 * (s(numberOb.indexEnding + 1) - s(numberOb.indexEnding));

        if (x1 && x2) {
          const binLabel = getLabel(numberOb.bin, xAxisVar);
          return (
            <g
              key={idx}
              onMouseEnter={() => handleColumnHover(numberOb.bin)}
              onMouseLeave={() => { setHoveredColumn(null); store.InteractionStore.clearHoveredAttribute(); }}
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
                  ? InteractionStore.backgroundSelectedColor
                  : hoveredColumn === numberOb.bin
                    ? InteractionStore.backgroundHoverColor
                    : idx % 2 === 1
                      ? 'white'
                      : 'black'
              }
                opacity={selectedColumn === numberOb.bin || hoveredColumn === numberOb.bin ? 0.5 : 0.05}
              />
              <Tooltip title={getLabel(numberOb.bin, xAxisVar)} arrow>
                <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{binLabel}</AxisText>
              </Tooltip>
            </g>
          );
        } return null;
      })}
    </>
  );
}

export default observer(CustomizedAxisOrdinal);
