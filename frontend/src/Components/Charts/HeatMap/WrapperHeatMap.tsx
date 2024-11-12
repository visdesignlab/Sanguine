import { observer } from 'mobx-react';
import {
  useContext, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Box, Container } from '@mui/material';
import { generateRegularData } from '../../../HelperFunctions/ChartDataGenerator';
import { generateExtrapairPlotData } from '../../../HelperFunctions/ExtraPairDataGenerator';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { BloodProductCap, ExtraPairPadding, ExtraPairWidth } from '../../../Presets/Constants';
import Store from '../../../Interfaces/Store';
import { ExtraPairPoint, HeatMapDataPoint, SingleCasePoint } from '../../../Interfaces/Types/DataTypes';
import HeatMap from './HeatMap';
import ExtraPairButtons from '../ChartAccessories/ExtraPairButtons';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv } from '../../../Presets/StyledComponents';
import { Aggregation, Outcome } from '../../../Presets/DataDict';

type Props = {
    layoutW: number;
    layoutH: number;
    chartId: string;
    extraPairArrayString: string;
    xAxisVar: keyof typeof BloodProductCap;
    yAxisVar: Aggregation;
    outcomeComparison?: Outcome;
    comparisonDate?: number;
    annotationText: string;
};
function WrapperHeatMap({
  annotationText, outcomeComparison, layoutH, layoutW, chartId, extraPairArrayString, yAxisVar, xAxisVar, comparisonDate,
}: Props) {
  const store = useContext(Store);

  const { filteredCases } = store;
  const { surgeryUrgencySelection, rawDateRange, proceduresSelection } = store.provenanceState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
  const [data, setData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryData, setSecondaryData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryExtraPairData, setSecondaryExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [extraPairTotalWidth, setExtraPairTotalWidth] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [secondaryCaseCount, setSecondaryCaseCount] = useState(0);

  useEffect(() => {
    if (extraPairArrayString) {
      stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPairArrayString]);

  useDeepCompareEffect(() => {
    const newExtraPairData = generateExtrapairPlotData(yAxisVar, filteredCases, extraPairArray, data);
    if (outcomeComparison || comparisonDate) {
      const newSecondaryExtraPairData = generateExtrapairPlotData(yAxisVar, filteredCases, extraPairArray, secondaryData);
      stateUpdateWrapperUseJSON(secondaryExtraPairData, newSecondaryExtraPairData, setSecondaryExtraPairData);
    }
    let totalWidth = newExtraPairData.length > 0 ? (newExtraPairData.length + 1) * ExtraPairPadding : 0;
    newExtraPairData.forEach((d) => {
      totalWidth += (ExtraPairWidth[d.type]);
    });
    setExtraPairTotalWidth(totalWidth);
    stateUpdateWrapperUseJSON(extraPairData, newExtraPairData, setExtraPairData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPairArray, data, filteredCases, secondaryData, outcomeComparison, comparisonDate]);

  useLayoutEffect(() => {
    if (svgRef.current) {
      setWidth(svgRef.current.clientWidth);
      setHeight(svgRef.current.clientHeight);
    }
  }, [data, layoutH, layoutW, store.mainCompWidth, svgRef]);

  useDeepCompareEffect(() => {
    const temporaryDataHolder: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
    const secondaryTemporaryDataHolder: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
    filteredCases.forEach((singleCase: SingleCasePoint) => {
      if (!temporaryDataHolder[singleCase[yAxisVar]]) {
        temporaryDataHolder[singleCase[yAxisVar]] = {
          aggregateAttribute: singleCase[yAxisVar],
          data: [],
          patientIDList: new Set(),
        };
        secondaryTemporaryDataHolder[singleCase[yAxisVar]] = {
          aggregateAttribute: singleCase[yAxisVar],
          data: [],
          patientIDList: new Set(),
        };
      }

      if ((outcomeComparison && singleCase[outcomeComparison] as number > 0) || (comparisonDate && singleCase.CASE_DATE < comparisonDate)) {
        secondaryTemporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
        secondaryTemporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
      } else {
        temporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
        temporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
      }
      // }
    });
    const [tempCaseCount, outputData] = generateRegularData(temporaryDataHolder, store.provenanceState.showZero, xAxisVar);
    const [secondCaseCount, secondOutputData] = generateRegularData(secondaryTemporaryDataHolder, store.provenanceState.showZero, xAxisVar);
    stateUpdateWrapperUseJSON(data, outputData, setData);
    stateUpdateWrapperUseJSON(secondaryData, secondOutputData, setSecondaryData);
    store.chartStore.totalAggregatedCaseCount = (tempCaseCount as number) + (secondCaseCount as number);
    setCaseCount(tempCaseCount as number);
    setSecondaryCaseCount(secondCaseCount as number);
  }, [proceduresSelection, surgeryUrgencySelection, store.provenanceState.outcomeFilter,
    rawDateRange,
    store.provenanceState.showZero,
    yAxisVar,
    xAxisVar,
    outcomeComparison,
    comparisonDate,
    filteredCases]);

  return (
    <Container style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChartAccessoryDiv>
        {`Heatmap${(outcomeComparison || comparisonDate) ? ' with Comparison' : ''}`}
        <ExtraPairButtons disbleButton={width * 0.6 < extraPairTotalWidth} extraPairLength={extraPairArray.length} chartId={chartId} />
        <ChartConfigMenu
          yAxisVar={yAxisVar}
          xAxisVar={xAxisVar}
          chartTypeIndexinArray={2}
          chartId={chartId}
          xChangeable
          yChangeable
          outcomeChangeable
        />
        <ChartStandardButtons chartID={chartId} />

      </ChartAccessoryDiv>
      <Box style={{ flexGrow: 1 }}>
        <svg style={{ width: '100%', height: '100%' }} ref={svgRef}>
          <HeatMap
            dimensionHeight={height}
            dimensionWidth={width}
            data={data}
            svg={svgRef}
            extraPairTotalWidth={extraPairTotalWidth}
            yAxisVar={yAxisVar}
            xAxisVar={xAxisVar}
            chartId={chartId}
            extraPairDataSet={extraPairData}
            secondaryExtraPairDataSet={(outcomeComparison || comparisonDate) ? secondaryExtraPairData : undefined}
            secondaryData={(outcomeComparison || comparisonDate) ? secondaryData : undefined}
            firstTotal={caseCount}
            secondTotal={secondaryCaseCount}
            interventionDate={comparisonDate}
            outcomeComparison={outcomeComparison}
          />
        </svg>
      </Box>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </Container>

  );
}

export default observer(WrapperHeatMap);
