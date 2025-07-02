import { observer } from 'mobx-react';
import {
  useContext, useEffect, useRef, useState,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Box, Container } from '@mui/material';
import { generateAttributePlotData, generateExtraAttributeData } from '../../../HelperFunctions/AttributePlotDataGenerator';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { AttributePlotPadding, AttributePlotWidth } from '../../../Presets/Constants';
import Store from '../../../Interfaces/Store';
import { AttributePlotData, HeatMapDataPoint } from '../../../Interfaces/Types/DataTypes';
import HeatMap from './HeatMap';
import AttributePlotButtons from '../ChartAccessories/AttributePlotButtons';
import { AttributePlotOptions } from '../../../Presets/DataDict';
import ChartConfigMenu from '../ChartAccessories/ChartConfigMenu';
import AnnotationForm from '../ChartAccessories/AnnotationForm';
import ChartStandardButtons from '../ChartStandardButtons';
import { ChartAccessoryDiv } from '../../../Presets/StyledComponents';
import { HeatMapLayoutElement } from '../../../Interfaces/Types/LayoutTypes';
import useComponentSize from '../../Hooks/UseComponentSize';

function WrapperHeatMap({ layout }: { layout: HeatMapLayoutElement }) {
  const {
    xAxisVar, yAxisVar, i: chartId, annotationText, attributePlots, interventionDate, outcomeComparison,
  } = layout;
  const store = useContext(Store);

  const { filteredCases } = store;
  const { surgeryUrgencySelection, rawDateRange, proceduresSelection } = store.provenanceState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [attributePlotData, setAttributePlotData] = useState<AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[]>([]);
  const [attributePlotArray, setAttributePlotArray] = useState<string[]>([]);
  const [data, setData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryData, setSecondaryData] = useState<HeatMapDataPoint[]>([]);
  const [secondaryAttributePlotData, setSecondaryAttributePlotData] = useState<AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[]>([]);
  const [attributePlotTotalWidth, setAttributePlotTotalWidth] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [secondaryCaseCount, setSecondaryCaseCount] = useState(0);

  useEffect(() => {
    if (attributePlots) {
      stateUpdateWrapperUseJSON(attributePlotArray, attributePlots, setAttributePlotArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributePlots]);

  useDeepCompareEffect(() => {
    const newAttributePlotData = generateAttributePlotData(yAxisVar, filteredCases, attributePlotArray, data);
    if (outcomeComparison || interventionDate) {
      const newSecondaryAttributePlotData = generateAttributePlotData(yAxisVar, filteredCases, attributePlotArray, secondaryData);
      stateUpdateWrapperUseJSON(secondaryAttributePlotData, newSecondaryAttributePlotData, setSecondaryAttributePlotData);
    }
    let totalWidth = newAttributePlotData.length > 0 ? (newAttributePlotData.length + 1) * AttributePlotPadding : 0;
    newAttributePlotData.forEach((d) => {
      totalWidth += (AttributePlotWidth[d.type]);
    });
    setAttributePlotTotalWidth(totalWidth);
    stateUpdateWrapperUseJSON(attributePlotData, newAttributePlotData, setAttributePlotData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributePlotArray, data, filteredCases, secondaryData, outcomeComparison, interventionDate]);

  const size = useComponentSize(svgRef);

  // Generating the extra attribute data for the extra pair plot ------------------------------------------------------------
  useDeepCompareEffect(() => {
    const [secondCaseCount, tempCaseCount, outputData, secondaryOutputData] = generateExtraAttributeData(filteredCases, yAxisVar, outcomeComparison, interventionDate, store.provenanceState.showZero, xAxisVar);
    stateUpdateWrapperUseJSON(data, outputData, setData);
    stateUpdateWrapperUseJSON(secondaryData, secondaryOutputData, setSecondaryData);
    store.chartStore.totalAggregatedCaseCount = (tempCaseCount as number) + (secondCaseCount as number);
    // Marks the 'true' and 'false' if attribute === 0.
    setCaseCount(tempCaseCount as number);
    setSecondaryCaseCount(secondCaseCount as number);
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
        <AttributePlotButtons disbleButton={size.width * 0.6 < attributePlotTotalWidth} attributePlotLength={attributePlotArray.length} chartId={chartId} buttonOptions={AttributePlotOptions} />
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
            attributePlotTotalWidth={attributePlotTotalWidth}
            yAxisVar={yAxisVar}
            xAxisVar={xAxisVar}
            chartId={chartId}
            attributePlotData={attributePlotData}
            secondaryAttributePlotData={(outcomeComparison || interventionDate) ? secondaryAttributePlotData : undefined}
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
