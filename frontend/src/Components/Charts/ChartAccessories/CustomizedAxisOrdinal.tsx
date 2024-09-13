/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  ScaleOrdinal,
  scaleOrdinal,
} from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import { AxisText, CustomAxisLine, CustomAxisLineBox } from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAggregationOption,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
  xAggregationOption: string;
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
    if (store.configStore.privateMode && xAggregationOption.includes('PROV_ID')) {
      const name = store.providerMappping[input] as string;
      console.log(name);
      return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : input;
    }
    return input;
  }, [store.configStore.privateMode, store.providerMappping, xAggregationOption]);

  return (
    <>

      {numberList.map((numberOb, ind) => {
        const x1 = ind === 0
          ? (scale() as ScaleOrdinal<any, number>)(0)
          : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[ind - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)));

        const x2 = ind === numberList.length - 1
          ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)
          : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)));

        if (x1 && x2) {
          return (
            <g key={ind}>
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondaryGray : basicGray} />
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
