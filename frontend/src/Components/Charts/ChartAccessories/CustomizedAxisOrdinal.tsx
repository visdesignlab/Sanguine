/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import { scaleOrdinal } from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { Watch } from '@mui/icons-material';
import { reaction } from 'mobx';
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
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [columnRecentlyClicked, setColumnRecentlyClicked] = useState<boolean | null>(null);

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
  const handleColumnHover = (columnIndex: string | null) => {
    setHoveredColumn(columnIndex);
    if (columnIndex !== null) {
      // Filter the sorted data for cases within the hovered column.
      const pointsInColumn = data.filter(
        (dp: DumbbellDataPoint) => dp.yVal.toString() === columnIndex,
      );
      // Update the hover store with all case IDs in that column
      store.InteractionStore.hoveredCaseIds = pointsInColumn.map(
        (dp: DumbbellDataPoint) => dp.case.CASE_ID,
      );
    } else {
      // Clear hovered cases when no column is hovered.
      store.InteractionStore.hoveredCaseIds = [];
    }
  };

  const handleColumnClick = (columnIndex: string) => {
    setSelectedColumn(columnIndex);
    setColumnRecentlyClicked(true);
    if (columnIndex !== null) {
      // Filter the sorted data for cases within the hovered column.
      const pointsInColumn = data.filter(
        (dp: DumbbellDataPoint) => dp.yVal.toString() === columnIndex,
      );
      // Update the hover store with all case IDs in that column
      store.InteractionStore.selectedCaseIds = pointsInColumn.map(
        (dp: DumbbellDataPoint) => dp.case.CASE_ID,
      );
    } else {
      // Clear hovered cases when no column is hovered.
      store.InteractionStore.selectedCaseIds = [];
    }
  };

  // Reset selectedColumn when the something else is selected
  useEffect(() => {
    if (!columnRecentlyClicked) {
      setSelectedColumn(null);
    }
    setColumnRecentlyClicked(false);
  }, [store.InteractionStore.selectedCaseIds]);

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
          const binKey = idx.toString();
          return (
            <g
              key={idx}
              onMouseEnter={() => handleColumnHover(binLabel)}
              onMouseLeave={() => handleColumnHover(null)}
              onClick={() => handleColumnClick(binLabel)}
            >
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
              <CustomAxisColumnBackground
                x={x1}
                width={x2 - x1}
                chartHeight={chartHeight}
                fill={
                selectedColumn === binKey
                  ? InteractionStore.backgroundSelectedColor
                  : hoveredColumn === binKey
                    ? InteractionStore.backgroundHoverColor
                    : idx % 2 === 1
                      ? 'white'
                      : 'black'
              }
                opacity={selectedColumn === binKey || hoveredColumn === binKey ? 0.5 : 0.05}
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
