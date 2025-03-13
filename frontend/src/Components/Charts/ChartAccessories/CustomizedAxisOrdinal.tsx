/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import { scaleOrdinal } from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import { AxisText, CustomAxisLine, CustomAxisLineBox } from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

function CustomizedAxisOrdinal({
  numberList, scaleDomain, scaleRange, xAxisVar,
}: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
  xAxisVar: string;
}) {
  const store = useContext(Store);
  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    const sc = scaleOrdinal<any, number>()
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
        if (idx === numberList.length - 1) {
          return null;
        }
        const s = scale();
        const x1 = idx === 0
          ? 2 * s(0) - s(1)
          : 1 + s(numberList[idx - 1].indexEnding + 1) - 0.5 * (s(numberList[idx - 1].indexEnding + 1) - s(numberList[idx - 1].indexEnding));

        const x2 = idx === numberList.length - 1
          ? s.range()[1]
          : -1 + s(numberOb.indexEnding) + 0.5 * (s(numberOb.indexEnding + 1) - s(numberOb.indexEnding));

        if (x1 && x2) {
          return (
            <g key={idx}>
              <CustomAxisLine x1={x1} x2={x2} />
              <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
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
