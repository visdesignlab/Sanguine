import { observer } from 'mobx-react';
import {
  useContext, useRef, useState,
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
import { ScatterLayoutElement } from '../../../Interfaces/Types/LayoutTypes';
import useComponentSize from '../../Hooks/UseComponentSize';

const ChartAccessoryDiv = styled.div({
  textAlign: 'right',
  color: basicGray,
});

function WrapperScatter({ layout }: { layout: ScatterLayoutElement }) {
  const {
    xAxisVar, yAxisVar, i: chartId, annotationText,
  } = layout;
  const store = useContext(Store);
  const { filteredCases } = store;

  const { proceduresSelection, showZero, rawDateRange } = store.provenanceState;

  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ScatterDataPoint[]>([]);
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(0);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(0);

  const size = useComponentSize(svgRef);

  useDeepCompareEffect(() => {
    let tempYMax = 0;
    let tempYMin = Infinity;
    let tempXMin = Infinity;
    let tempXMax = 0;
    if (filteredCases) {
      let castData = filteredCases.map((ob: SingleCasePoint) => {
        const yValue = yAxisVar === 'PREOP_HEMO' ? ob.PREOP_HEMO : ob.POSTOP_HEMO;
        let xValue = parseInt(`${ob[xAxisVar]}`, 10);

        if ((!Number.isNaN(yValue) && showZero) || (!showZero && !Number.isNaN(yValue) && xValue > 0)) {
          if ((xValue > 100 && xAxisVar === 'PRBC_UNITS')) {
            xValue -= 999;
          }
          if ((xValue > 100 && xAxisVar === 'PLT_UNITS')) {
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

      castData = castData.filter((d) => d && d.yVal);

      store.chartStore.totalIndividualCaseCount = castData.length;
      stateUpdateWrapperUseJSON(data, castData, setData);
      setXMax(tempXMax);
      setXMin(tempXMin);
      setYMax(tempYMax);
      setYMin(tempYMin);
    }
  }, [rawDateRange, proceduresSelection, filteredCases, showZero, yAxisVar, xAxisVar]);

  return (
    <ChartWrapperContainer>
      <ChartAccessoryDiv>
        Scatterplot
        <ChartConfigMenu layout={layout} />
        <ChartStandardButtons chartID={chartId} />
      </ChartAccessoryDiv>
      <ChartSVG ref={svgRef}>
        <ScatterPlot
          xAxisVar={xAxisVar}
          xMax={xMax}
          xMin={xMin}
          yMax={yMax}
          yMin={yMin}
          yAxisVar={yAxisVar}
          data={data}
          width={size.width}
          height={size.height}
          svg={svgRef}
        />
      </ChartSVG>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </ChartWrapperContainer>
  );
}

export default observer(WrapperScatter);
