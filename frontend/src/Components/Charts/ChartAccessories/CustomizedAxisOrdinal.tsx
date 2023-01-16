/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  ScaleOrdinal,
  scaleOrdinal
} from "d3";
import { basicGray, secondaryGray } from "../../../Presets/Constants";
import { AxisText, CustomAxisLine, CustomAxisLineBox } from "../../../Presets/StyledSVGComponents";
import Store from "../../../Interfaces/Store";
import Tooltip from "@mui/material/Tooltip";


function CustomizedAxisOrdinal ({ numberList, scaleDomain, scaleRange, aggregationOption }: {
  scaleDomain: string;
  scaleRange: string;
  numberList: { num: number, indexEnding: number; }[];
  aggregationOption: string;
}) {
  const store = useContext(Store);
  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);
    let scale = scaleOrdinal()
      .domain(domain as any)
      .range(range);

    return scale;
  }, [scaleDomain, scaleRange]);

  const axisTextOutput = useCallback((input: number) => {
    if (store.configStore.privateMode && store.configStore.nameDictionary[aggregationOption]) {
      const name = store.configStore.nameDictionary[aggregationOption][input];
      return name ? `${name.slice(0, 1)}${name.slice(1).toLowerCase()}` : input;
    }
    return input;
  }, [store.configStore.privateMode, store.configStore.nameDictionary, aggregationOption]);

  return <>

    {numberList.map((numberOb, ind) => {
      let x1 = ind === 0 ? (scale() as ScaleOrdinal<any, number>)(0) : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[ind - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)));
      let x2 = ind === numberList.length - 1 ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)));
      if (x1 && x2) {
        return (
          <g>
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondaryGray : basicGray} />
            <Tooltip title={axisTextOutput(numberOb.num)}>
              <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{axisTextOutput(numberOb.num)}</AxisText>
            </Tooltip>

          </g>);
      } else { return <></>; }
    })}
  </>;
};

export default observer(CustomizedAxisOrdinal);
