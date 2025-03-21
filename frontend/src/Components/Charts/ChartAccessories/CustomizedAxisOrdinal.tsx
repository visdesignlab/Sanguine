/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  ScaleOrdinal,
  scaleOrdinal,
} from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import { AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox } from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAxisVar, chartHeight,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
  xAxisVar: string;
  chartHeight: number;
}) {
  const store = useContext(Store);
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
            <g key={idx}>
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
              <CustomAxisColumnBackground x={x1} width={x2 - x1} chartHeight={chartHeight} fill={idx % 2 === 1 ? 'white' : 'black'} />
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
