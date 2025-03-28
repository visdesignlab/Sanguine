/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext, useState } from 'react';
import { observer } from 'mobx-react';
import {
  ScaleOrdinal,
  scaleOrdinal,
} from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAxisVar, chartHeight, data,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
  xAxisVar: string;
  chartHeight: number;
  data: DumbbellDataPoint[];
}) {
  const store = useContext(Store);
  const { hoverStore } = store;
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    const sc = scaleOrdinal()
      .domain(domain)
      .range(range);

    return sc;
  }, [scaleDomain, scaleRange]);

  const axisTextOutput = useCallback((input: number) => {
    if (store.configStore.privateMode && xAxisVar.includes('PROV_ID')) {
      const name = store.providerMappping[input] as string;
      return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : input;
    }
    return input;
  }, [store.configStore.privateMode, store.providerMappping, xAxisVar]);

  // Add a new handler that updates both the local hoveredColumn state and the store.
  const handleColumnHover = (columnIndex: number | null) => {
    setHoveredColumn(columnIndex);
    if (columnIndex !== null) {
      // Filter the sorted data for cases within the hovered column.
      const pointsInColumn = data.filter(
        (dp: DumbbellDataPoint) => dp.yVal === columnIndex,
      );
      // Update the hover store with all case IDs in that column
      store.hoverStore.hoveredCaseIds = pointsInColumn.map(
        (dp: DumbbellDataPoint) => dp.case.CASE_ID,
      );
    } else {
      // Clear hovered cases when no column is hovered.
      store.hoverStore.hoveredCaseIds = [];
    }
  };

  return (
    <>

      {numberList.map((numberOb, idx) => {
        const x1 = idx === 0
          ? (scale() as ScaleOrdinal<any, number>)(0)
          : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[idx - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[idx - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[idx - 1].indexEnding)));

        const x2 = idx === numberList.length - 1
          ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)
          : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)));

        if (x1 && x2) {
          return (
            <g
              key={idx}
              onMouseEnter={() => handleColumnHover(idx)}
              onMouseLeave={() => handleColumnHover(null)}
            >
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
              <CustomAxisColumnBackground
                x={x1}
                width={x2 - x1}
                chartHeight={chartHeight}
                fill={hoveredColumn === idx ? hoverStore.backgroundHoverColor : (idx % 2 === 1 ? 'white' : 'black')}
                opacity={hoveredColumn === idx ? 0.5 : 0.05}
              />
              <Tooltip title={axisTextOutput(numberOb.num)}>
                <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{axisTextOutput(numberOb.num)}</AxisText>
              </Tooltip>

            </g>
          );
        } return null;
      })}
    </>
  );
}

export default observer(CustomizedAxisOrdinal);
