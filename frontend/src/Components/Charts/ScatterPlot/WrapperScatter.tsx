import { observer } from 'mobx-react';
import {
  useContext, useLayoutEffect, useRef, useState,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import styled from '@emotion/styled';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint, SingleCasePoint } from '../../../Interfaces/Types/DataTypes';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import { ChartSVG } from '../../../Presets/StyledSVGComponents';
import ScatterPlot from './ScatterPlot';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartWrapperContainer } from '../../../Presets/StyledComponents';
import { basicGray } from '../../../Presets/Constants';
import { AcronymDictionary, ScatterYOptions } from '../../../Presets/DataDict';

const ChartAccessoryDiv = styled.div({
  textAlign: 'right',
  color: basicGray,
});

type Props = {
    yValueOption: typeof ScatterYOptions[number]['key'];
    xAggregationOption: keyof typeof AcronymDictionary;
    chartId: string;
    layoutW: number;
    layoutH: number;
    annotationText: string;
};
function WrapperScatter({
  annotationText, yValueOption, xAggregationOption, chartId, layoutW, layoutH,
}: Props) {
  const store = useContext(Store);
  const { filteredCases } = store;

  const { proceduresSelection, showZero, rawDateRange } = store.provenanceState;

  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(layoutW === 1 ? 542.28 : 1146.97);
  const [height, setHeight] = useState(0);
  const [data, setData] = useState<ScatterDataPoint[]>([]);
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(0);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(0);

  useLayoutEffect(() => {
    if (svgRef.current) {
      setWidth(svgRef.current.clientWidth);
      setHeight(svgRef.current.clientHeight);
    }
  }, [layoutH, layoutW, store.mainCompWidth, svgRef]);

  useDeepCompareEffect(() => {
    let tempYMax = 0;
    let tempYMin = Infinity;
    let tempXMin = Infinity;
    let tempXMax = 0;
    if (filteredCases) {
      let castData = filteredCases.map((ob: SingleCasePoint) => {
        const yValue = yValueOption === 'PREOP_HEMO' ? ob.PREOP_HEMO : ob.POSTOP_HEMO;
        let xValue = parseInt(`${ob[xAggregationOption]}`, 10);

        if ((!Number.isNaN(yValue) && showZero) || (!showZero && !Number.isNaN(yValue) && xValue > 0)) {
          if ((xValue > 100 && xAggregationOption === 'PRBC_UNITS')) {
            xValue -= 999;
          }
          if ((xValue > 100 && xAggregationOption === 'PLT_UNITS')) {
            xValue -= 245;
          }
          tempYMin = yValue < tempYMin ? yValue : tempYMin;
          tempYMax = yValue > tempYMax ? yValue : tempYMax;
          tempXMin = xValue < tempXMin ? xValue : tempXMin;
          tempXMax = xValue > tempXMax ? xValue : tempXMax;
          return {
            xVal: xValue,
            yVal: yValue,
            randomFactor: Math.random(),
            case: ob,
          };
        } return undefined;
      });

      castData = castData.filter((d) => d);

      store.chartStore.totalIndividualCaseCount = castData.length;
      stateUpdateWrapperUseJSON(data, castData, setData);
      setXMax(tempXMax);
      setXMin(tempXMin);
      setYMax(tempYMax);
      setYMin(tempYMin);
    }
  }, [rawDateRange, proceduresSelection, filteredCases, showZero, yValueOption, xAggregationOption]);

  return (
    <ChartWrapperContainer>
      <ChartAccessoryDiv>
        Scatterplot
        <ChartConfigMenu
          xAggregationOption={xAggregationOption}
          yValueOption={yValueOption}
          chartTypeIndexinArray={2}
          chartId={chartId}
          requireOutcome={false}
          requireSecondary
        />
        <ChartStandardButtons chartID={chartId} />
      </ChartAccessoryDiv>
      <ChartSVG ref={svgRef}>
        <ScatterPlot
          xAggregationOption={xAggregationOption}
          xMax={xMax}
          xMin={xMin}
          yMax={yMax}
          yMin={yMin}
          yValueOption={yValueOption}
          data={data}
          width={width}
          height={height}
          svg={svgRef}
        />
      </ChartSVG>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </ChartWrapperContainer>
  );
}

export default observer(WrapperScatter);
