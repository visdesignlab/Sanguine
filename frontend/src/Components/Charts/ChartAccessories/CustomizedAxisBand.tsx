import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import { AxisText, CustomAxisLine, CustomAxisLineBox } from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

export type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;

};

function CustomizedAxisBand({ scaleDomain, scaleRange, scalePadding }: Props) {
  const store = useContext(Store);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  return (
    <>
      {scale().domain().map((number, ind) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g key={ind}>
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondaryGray : basicGray} />
            <AxisText biggerFont={store.configStore.largeFont} x={x1 + 0.5 * (x2 - x1)}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
