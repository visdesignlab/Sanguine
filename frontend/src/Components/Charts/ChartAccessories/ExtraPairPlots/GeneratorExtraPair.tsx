/** @jsxImportSource @emotion/react */
import { observer } from 'mobx-react';
import styled from '@emotion/styled';
import { Tooltip } from '@mui/material';
import { useContext } from 'react';
import { format, max } from 'd3';
import { ExtendedExtraPairPoint, ExtraPairPoint } from '../../../../Interfaces/Types/DataTypes';
import {
  basicGray,
  ExtraPairPadding, ExtraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, largeFontSize, OffsetDict, regularFontSize,
} from '../../../../Presets/Constants';
import ExtraPairViolin from './ExtraPairViolin';
import ExtraPairBar from './ExtraPairBar';
import ExtraPairBasic from './ExtraPairBasic';
import { AcronymDictionary, EXTRA_PAIR_OPTIONS } from '../../../../Presets/DataDict';
import { BiggerTooltip } from '../../../../Presets/StyledComponents';
import { BiggerFontProps } from '../../../../Presets/StyledSVGComponents';
import Store from '../../../../Interfaces/Store';

const ExtraPairText = styled('text') <BiggerFontProps>`
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

interface OwnProps {
    extraPairDataSet: ExtraPairPoint[];
    secondaryExtraPairDataSet?: ExtendedExtraPairPoint[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    text?: boolean;
    height?: number;
    chartId: string;
}

type Props = OwnProps;

function GeneratorExtraPair({
  extraPairDataSet, secondaryExtraPairDataSet, aggregationScaleDomain, aggregationScaleRange, text = false, height, chartId,
}: Props) {
  let transferedDistance = 0;
  const returningComponents: JSX.Element[] = [];
  const currentOffset = OffsetDict.regular;
  const store = useContext(Store);

  extraPairDataSet.forEach((pairData, idx) => {
    let temporarySecondary = secondaryExtraPairDataSet;
    if (secondaryExtraPairDataSet) {
      temporarySecondary = secondaryExtraPairDataSet.length > 0 ? temporarySecondary : undefined;
    }
    switch (pairData.type) {
      case 'Violin':
        transferedDistance += (ExtraPairWidth.Violin + ExtraPairPadding);
        // eslint-disable-next-line no-case-declarations
        const calculatedKdeMax = temporarySecondary ? Math.max(pairData.kdeMax || 0, temporarySecondary[idx].kdeMax || 0) : (pairData.kdeMax || 0);
        returningComponents.push(
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.Violin)},0)`} key={pairData.name}>
            <ExtraPairViolin
              medianSet={pairData.medianSet}
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
              kdeMax={calculatedKdeMax}
              dataSet={pairData.data}
              name={pairData.name}
              secondaryDataSet={temporarySecondary ? temporarySecondary[idx].data : undefined}
              secondaryMedianSet={temporarySecondary ? temporarySecondary[idx].medianSet : undefined}
            />
          </g>,
        );
        break;

      case 'BarChart':
        transferedDistance += (ExtraPairWidth.BarChart + ExtraPairPadding);
        returningComponents.push(
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.BarChart)},0)`} key={pairData.name}>
            <ExtraPairBar
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
              dataSet={pairData.data}
              secondaryDataSet={temporarySecondary ? temporarySecondary[idx].data : undefined}
            />
          </g>,
        );
        break;

      case 'Basic':
        transferedDistance += (ExtraPairWidth.Basic + ExtraPairPadding);

        returningComponents.push(
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.Basic)},0)`} key={pairData.name}>
            <ExtraPairBasic
              aggregationScaleDomain={aggregationScaleDomain}
              aggregationScaleRange={aggregationScaleRange}
              secondaryDataSet={temporarySecondary ? temporarySecondary[idx].data : undefined}
              dataSet={pairData.data}
            />
          </g>,
        );
        break;

      default:
        break;
    }
  });
  const extraPairTextGenerator = (
    nameInput: typeof EXTRA_PAIR_OPTIONS[number],
    labelInput: string,
    type: 'Basic' | 'Violin' | 'BarChart',
    extraPairDataPoint: ExtraPairPoint,
    idx: number,
    allExtraPairs: ExtraPairPoint[],
    dimensionHeight: number,
  ) => {
    let explanation = '';
    switch (type) {
      case 'Basic':
        explanation = 'Percentage of Patients';
        break;
      case 'Violin':
        explanation = nameInput === 'RISK' ? 'Scaled 0-30' : (`Scaled 0-18, line at ${nameInput as string === 'Preop HGB' ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD}`);
        break;
      case 'BarChart':
        explanation = `Scaled 0-${format('.4r')(max(Object.values(extraPairDataPoint.data)))}`;
        break;
      default:
        break;
    }

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

    const xPadding: number = allExtraPairs.slice(0, idx + 1).map((extraPair) => ExtraPairWidth[extraPair.type] + ExtraPairPadding).reduce((partialSum, a) => partialSum + a, 0);

    return (
      <Tooltip title={tooltipText}>
        <ExtraPairText
          x={xPadding - ExtraPairWidth[type] / 2}
          y={dimensionHeight - currentOffset.bottom + 25}
          biggerFont={store.configStore.largeFont}
          onClick={() => {
            store.chartStore.removeExtraPair(chartId, nameInput);
          }}
        >
          {labelInput}
          <RemoveTSpan x={xPadding - ExtraPairWidth[type] / 2} dy="-0.5em">x</RemoveTSpan>
        </ExtraPairText>
      </Tooltip>
    );
  };
  return (
    <g>
      {returningComponents}
      {text && height ? extraPairDataSet.map((extraPairDataPoint, idx) => extraPairTextGenerator(extraPairDataPoint.name, extraPairDataPoint.label, extraPairDataPoint.type, extraPairDataPoint, idx, extraPairDataSet, height)) : null}
    </g>
  );
}

export default observer(GeneratorExtraPair);
