import { observer } from 'mobx-react';
import {
  useContext, useEffect, useRef, useState,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Box, Container } from '@mui/material';
import { generateExtrapairPlotData, generateExtraAttributeData } from '../../../HelperFunctions/ExtraPairDataGenerator';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { ExtraPairPadding, ExtraPairWidth } from '../../../Presets/Constants';
import Store from '../../../Interfaces/Store';
import { ExtraPairPoint, HeatMapDataPoint } from '../../../Interfaces/Types/DataTypes';
import HeatMap from './HeatMap';
import ExtraPairButtons from '../ChartAccessories/ExtraPairButtons';
import { ExtraPairOptions } from '../../../Presets/DataDict';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv } from '../../../Presets/StyledComponents';
import { HeatMapLayoutElement } from '../../../Interfaces/Types/LayoutTypes';
import useComponentSize from '../../Hooks/UseComponentSize';

function WrapperHeatMap({ layout }: { layout: HeatMapLayoutElement }) {
  const {
    xAxisVar, yAxisVar, i: chartId, annotationText, extraPair, interventionDate, outcomeComparison,
  } = layout;
  const store = useContext(Store);

  const { filteredCases } = store;
  const { surgeryUrgencySelection, rawDateRange, proceduresSelection } = store.provenanceState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [extraPairData, setExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [extraPairArray, setExtraPairArray] = useState<string[]>([]);
  const [data, setData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryData, setSecondaryData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryExtraPairData, setSecondaryExtraPairData] = useState<ExtraPairPoint[]>([]);
  const [extraPairTotalWidth, setExtraPairTotalWidth] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [secondaryCaseCount, setSecondaryCaseCount] = useState(0);

  useEffect(() => {
    if (extraPair) {
      stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPair), setExtraPairArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPair]);

  useDeepCompareEffect(() => {
    const newExtraPairData = generateExtrapairPlotData(yAxisVar, filteredCases, extraPairArray, data);
    if (outcomeComparison || interventionDate) {
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
  }, [extraPairArray, data, filteredCases, secondaryData, outcomeComparison, interventionDate]);

  const size = useComponentSize(svgRef);

  // Generating the extra attribute data for the extra pair plot ------------------------------------------------------------
  useDeepCompareEffect(() => {
    const [tempCaseCount, secondaryTempCaseCount, outputData, secondaryOutputData] = generateExtraAttributeData(filteredCases, yAxisVar, outcomeComparison, interventionDate, store.provenanceState.showZero, xAxisVar);
    stateUpdateWrapperUseJSON(data, outputData, setData);
    stateUpdateWrapperUseJSON(secondaryData, secondaryOutputData, setSecondaryData);
    store.chartStore.totalAggregatedCaseCount = (tempCaseCount as number) + (secondaryTempCaseCount as number);
    // Marks the 'true' and 'false' if attribute === 0.
    setCaseCount(tempCaseCount as number);
    setSecondaryCaseCount(secondaryTempCaseCount as number);
  }, [proceduresSelection, surgeryUrgencySelection, store.provenanceState.outcomeFilter,
    rawDateRange,
    store.provenanceState.showZero,
    yAxisVar,
    xAxisVar,
    outcomeComparison,
    interventionDate,
    filteredCases]);

  return (
    <Container style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChartAccessoryDiv>
        {`Heatmap${(outcomeComparison || interventionDate) ? ' with Comparison' : ''}`}
        <ExtraPairButtons disbleButton={size.width * 0.6 < extraPairTotalWidth} extraPairLength={extraPairArray.length} chartId={chartId} buttonOptions={ExtraPairOptions} />
        <ChartConfigMenu layout={layout} />
        <ChartStandardButtons chartID={chartId} />
      </ChartAccessoryDiv>

      <Box style={{ flexGrow: 1 }}>
        <svg style={{ width: '100%', height: '100%' }} ref={svgRef}>
          <HeatMap
            dimensionHeight={size.height}
            dimensionWidth={size.width}
            data={data}
            svg={svgRef}
            extraPairTotalWidth={extraPairTotalWidth}
            yAxisVar={yAxisVar}
            xAxisVar={xAxisVar}
            chartId={chartId}
            extraPairDataSet={extraPairData}
            secondaryExtraPairDataSet={(outcomeComparison || interventionDate) ? secondaryExtraPairData : undefined}
            secondaryData={(outcomeComparison || interventionDate) ? secondaryData : undefined}
            firstTotal={caseCount}
            secondTotal={secondaryCaseCount}
            interventionDate={interventionDate}
            outcomeComparison={outcomeComparison}
          />
        </svg>
      </Box>
      <AnnotationForm chartI={chartId} annotationText={annotationText} />
    </Container>

  );
}

export default observer(WrapperHeatMap);
