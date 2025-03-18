import { useCallback, useContext } from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;
  chartHeight: number;
};

function CustomizedAxisBand({
  scaleDomain, scaleRange, scalePadding, chartHeight,
}: Props) {
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
      {scale().domain().map((number, idx) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g key={idx}>
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisColumnBackground
              x={x1}
              width={x2 - x1}
              chartHeight={chartHeight}
              fill={idx % 2 === 1 ? 'black' : 'white'}
              opacity={0.05}
              style={{ pointerEvents: 'none' }}
            />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
