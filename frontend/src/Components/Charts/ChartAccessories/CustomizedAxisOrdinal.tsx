/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  ScaleOrdinal,
  scaleOrdinal,
} from 'd3';
import { basicGray, secondarygray } from '../../../Presets/Constants';
import { AxisText, CustomAxisLine, CustomAxisLineBox } from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

export type Props = {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
};

function CustomizedAxisOrdinal({ numberList, scaleDomain, scaleRange }: Props) {
  const store = useContext(Store);
  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    const sc = scaleOrdinal()
      .domain(domain)
      .range(range);

    return sc;
  }, [scaleDomain, scaleRange]);

  return (
    <>

      {numberList.map((numberOb, ind) => {
        const x1 = ind === 0 ? (scale() as ScaleOrdinal<any, number>)(0) : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[ind - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)));
        const x2 = ind === numberList.length - 1 ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)));
        if (x1 && x2) {
          return (
            <g key={ind}>
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondarygray : basicGray} />
              <AxisText biggerFont={store.configStore.largeFont} x={x1 + 0.5 * (x2 - x1)}>{numberOb.num}</AxisText>
            </g>
          );
        } return null;
      })}
    </>
  );
}

export default observer(CustomizedAxisOrdinal);
