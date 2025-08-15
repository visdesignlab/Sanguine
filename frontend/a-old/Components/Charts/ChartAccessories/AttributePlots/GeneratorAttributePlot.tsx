/** @jsxImportSource @emotion/react */
import { observer } from 'mobx-react';
import styled from '@emotion/styled';
import { Tooltip } from '@mui/material';
import { Fragment, useContext } from 'react';
import { format } from 'd3';
import { AttributePlotData } from '../../../../Interfaces/Types/DataTypes';
import {
  basicGray,
  AttributePlotPadding, AttributePlotWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, largeFontSize, regularFontSize,
} from '../../../../Presets/Constants';
import AttributePlotViolin, { AttributePlotViolinAxis } from './AttributePlotViolin';
import AttributePlotBar from './AttributePlotBar';
import AttributePlotBasic from './AttributePlotBasic';
import { AcronymDictionary, EXTRA_PAIR_OPTIONS } from '../../../../Presets/DataDict';
import { BiggerTooltip } from '../../../../Presets/StyledComponents';
import { BiggerFontProps } from '../../../../Presets/StyledSVGComponents';
import Store, { RootStore } from '../../../../Interfaces/Store';
import { Offset } from '../../../../Interfaces/Types/OffsetType';

const AttributePlotText = styled('text') <BiggerFontProps>`
  font-size: ${(props) => (props.biggerFont ? `${largeFontSize}px` : `${regularFontSize}px`)};
  text-anchor: middle;
  alignment-baseline:hanging;
  cursor:pointer;
    &:hover tspan {
        opacity:1;
  }
`;

const RemoveTSpan = styled('tspan')`
    font-size:10px;
    fill:${basicGray};
    opacity:0;
     &:hover{
        opacity:1;
     }
`;

// Generates the Attribute Labels, Tooltips, and Violin Axis
const attributePlotTextGenerator = (
  store: RootStore,
  nameInput: typeof EXTRA_PAIR_OPTIONS[number],
  labelInput: string,
  type: 'Basic' | 'Violin' | 'BarChart',
  plotData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>,
  idx: number,
  allAttributePlots: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[],
  chartId: string,
  dimensionHeight: number,
  currentOffset: Offset,
) => {
  // Defines the explanation for the tooltip
  let explanation = '';
  switch (type) {
    case 'Basic':
      explanation = 'Percentage of Patients';
      break;
    case 'Violin':
      explanation = nameInput === 'DRG_WEIGHT' ? 'Scaled 0-30' : (`Scaled 0-18, line at ${nameInput as string === 'Preop HGB' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD}`);
      break;
    case 'BarChart':
      explanation = `Scaled 0-${format('.4r')(Math.max(...Object.values((plotData as AttributePlotData<'BarChart'>).attributeData)))}`;
      break;
    default:
      break;
  }

  // Defines the tooltip text
  const tooltipText = (
    <BiggerTooltip>
      {AcronymDictionary[nameInput as keyof typeof AcronymDictionary] ? `${AcronymDictionary[nameInput as keyof typeof AcronymDictionary]}` : undefined}
      {AcronymDictionary[nameInput as keyof typeof AcronymDictionary] ? <br /> : null}
      {explanation}
      {' '}
      <br />
      (Click to remove)
    </BiggerTooltip>
  );

  // Calculates the x value for the text, based on the width of the previous extra pairs.
  const labelX: number = allAttributePlots.slice(0, idx + 1).map((attributePlot) => AttributePlotWidth[attributePlot.type] + AttributePlotPadding).reduce((partialSum, a) => partialSum + a, 0);

  return (
    <>
      {/* Generates the Violin Axis */}
      {plotData.type === 'Violin' && (
        <AttributePlotViolinAxis
          key={`violin-axis-${idx}`}
          yPos={dimensionHeight - currentOffset.bottom}
          xPos={labelX - AttributePlotWidth.Violin}
        />
      )}
      {/* Generates the Attribute Label */}
      <Tooltip title={tooltipText}>
        <AttributePlotText
          x={labelX - AttributePlotWidth[type] / 2}
          y={dimensionHeight - currentOffset.bottom + 25}
          biggerFont={store.configStore.largeFont}
          onClick={() => {
            store.chartStore.removeAttributePlot(chartId, nameInput);
          }}
        >
          {labelInput}
          <RemoveTSpan x={labelX - AttributePlotWidth[type] / 2} dy="-0.5em">
            x
          </RemoveTSpan>
        </AttributePlotText>
      </Tooltip>
    </>
  );
};

// Generates the Additional Attributes ("Extra Pair" Plots), without labels.
function GeneratorAttributePlot({
  attributePlotData,
  secondaryAttributePlotData,
  aggregationScaleDomain,
  aggregationScaleRange,
}: {
    attributePlotData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[];
    secondaryAttributePlotData?: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
}) {
  let transferedDistance = 0;
  const returningComponents: JSX.Element[] = [];

  // For each extra pair, generate the appropriate plot.
  attributePlotData.forEach((plotData, idx) => {
    let temporarySecondary = secondaryAttributePlotData;
    if (secondaryAttributePlotData) {
      temporarySecondary = secondaryAttributePlotData.length > 0 ? temporarySecondary : undefined;
    }

    if (plotData.type === 'Violin') {
      const violinPlotData = plotData as AttributePlotData<'Violin'>;
      const secondaryViolinPlotData = (temporarySecondary ? temporarySecondary[idx] : undefined) as AttributePlotData<'Violin'> | undefined;

      transferedDistance += (AttributePlotWidth.Violin + AttributePlotPadding);
      returningComponents.push(
        <g transform={`translate(${transferedDistance - (AttributePlotWidth.Violin)},0)`} key={violinPlotData.attributeName}>
          <AttributePlotViolin
            plotData={violinPlotData}
            secondaryPlotData={secondaryViolinPlotData}
            aggregationScaleDomain={aggregationScaleDomain}
            aggregationScaleRange={aggregationScaleRange}
          />
        </g>,
      );
    } else if (plotData.type === 'BarChart') {
      const barPlotData = plotData as AttributePlotData<'BarChart'>;
      const secondaryBarPlotData = (temporarySecondary ? temporarySecondary[idx] : undefined) as AttributePlotData<'BarChart'> | undefined;

      transferedDistance += (AttributePlotWidth.BarChart + AttributePlotPadding);
      returningComponents.push(
        <g transform={`translate(${transferedDistance - (AttributePlotWidth.BarChart)},0)`} key={barPlotData.attributeName}>
          <AttributePlotBar
            plotData={barPlotData}
            secondaryPlotData={secondaryBarPlotData}
            aggregationScaleDomain={aggregationScaleDomain}
            aggregationScaleRange={aggregationScaleRange}
          />
        </g>,
      );
    } else {
      const basicPlotData = plotData as AttributePlotData<'Basic'>;
      const secondaryBasicPlotData = (temporarySecondary ? temporarySecondary[idx] : undefined) as AttributePlotData<'Basic'> | undefined;

      transferedDistance += (AttributePlotWidth.Basic + AttributePlotPadding);
      returningComponents.push(
        <g transform={`translate(${transferedDistance - (AttributePlotWidth.Basic)},0)`} key={plotData.attributeName}>
          <AttributePlotBasic
            plotData={basicPlotData}
            secondaryPlotData={secondaryBasicPlotData}
            aggregationScaleDomain={aggregationScaleDomain}
            aggregationScaleRange={aggregationScaleRange}
          />
        </g>,
      );
    }
  });
  return (
    <g>
      {returningComponents}
    </g>
  );
}

export default observer(GeneratorAttributePlot);

// Generates the Attribute Lables & Tooltips, separate from the charts.
export function AttributePlotLabels({
  attributePlotData,
  chartId,
  dimensionHeight,
  currentOffset,
}: {
  attributePlotData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[];
  chartId: string;
  dimensionHeight: number;
  currentOffset: Offset;
}): JSX.Element {
  const store = useContext(Store);
  return (
    <>
      {attributePlotData.map((plotData, idx) => (
        <Fragment key={`${chartId}-${plotData.attributeName}-${idx}`}>
          {attributePlotTextGenerator(
            store,
            plotData.attributeName,
            plotData.attributeLabel,
            plotData.type,
            plotData,
            idx,
            attributePlotData,
            chartId,
            dimensionHeight,
            currentOffset,
          )}
        </Fragment>
      ))}
    </>
  );
}
