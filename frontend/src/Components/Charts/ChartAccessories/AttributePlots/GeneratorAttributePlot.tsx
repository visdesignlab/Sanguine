/** @jsxImportSource @emotion/react */
import { observer } from 'mobx-react';
import styled from '@emotion/styled';
import { Tooltip } from '@mui/material';
import { Fragment, useContext, useState } from 'react';
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
  isDescending: boolean,
  onSortClick: () => void,
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

  const tooltipTitle = isDescending ? 'Sort Descending' : 'Sort Ascending';

  const ARROW_SIZE = 24; // px
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
      {/* Absolutely positioned IconButton overlay */}
      <g
        style={{
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
        transform={`translate(${labelX - AttributePlotWidth[type] / 2 - ARROW_SIZE / 2}, ${dimensionHeight - currentOffset.bottom + 5})`}
        onClick={onSortClick}
      >
        <Tooltip title={tooltipTitle}>
          {/* Plain SVG arrow */}
          {isDescending ? (
            <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 24 24">
              <path d="M7 14l5-5 5 5H7z" fill="#666" />
            </svg>
          )
            : (
              <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5H7z" fill="#666" />
              </svg>
            )}
        </Tooltip>
      </g>
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
        </AttributePlotText>
      </Tooltip>
      {/* 'x' below the label */}
      <RemoveTSpan
        x={labelX - AttributePlotWidth[type] / 2}
        dy="2.5em"
        onClick={() => {
          store.chartStore.removeAttributePlot(chartId, nameInput);
        }}
        style={{ cursor: 'pointer' }}
      >
        x
      </RemoveTSpan>
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

  attributePlotData.forEach((plotData, idx) => {
    let temporarySecondary = secondaryAttributePlotData;
    if (secondaryAttributePlotData) {
      temporarySecondary = secondaryAttributePlotData.length > 0 ? temporarySecondary : undefined;
    }

    // Calculate the X position for centering the plot
    const plotWidth = AttributePlotWidth[plotData.type];
    transferedDistance += (plotWidth + AttributePlotPadding);
    const plotX = transferedDistance - plotWidth;

    returningComponents.push(
      <g key={plotData.attributeName}>
        {/* The plot itself */}
        <g transform={`translate(${plotX}, 0)`}>
          {plotData.type === 'Violin' ? (
            <AttributePlotViolin
              plotData={plotData as AttributePlotData<'Violin'>}
              secondaryPlotData={temporarySecondary ? (temporarySecondary[idx] as AttributePlotData<'Violin'>) : undefined}
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
            />
          ) : plotData.type === 'BarChart' ? (
            <AttributePlotBar
              plotData={plotData as AttributePlotData<'BarChart'>}
              secondaryPlotData={temporarySecondary ? (temporarySecondary[idx] as AttributePlotData<'BarChart'>) : undefined}
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
            />
          ) : (
            <AttributePlotBasic
              plotData={plotData as AttributePlotData<'Basic'>}
              secondaryPlotData={temporarySecondary ? (temporarySecondary[idx] as AttributePlotData<'Basic'>) : undefined}
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
            />
          )}
        </g>
      </g>,
    );
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
  const [sortDirections, setSortDirections] = useState<boolean[]>(() => attributePlotData.map(() => false));

  const handleSortClick = (idx: number) => {
    setSortDirections((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };
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
            sortDirections[idx],
            () => handleSortClick(idx),
          )}
        </Fragment>
      ))}
    </>
  );
}
