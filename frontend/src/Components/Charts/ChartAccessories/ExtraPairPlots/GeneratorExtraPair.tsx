/** @jsxImportSource @emotion/react */
import { observer } from 'mobx-react';
import { ExtraPairPoint } from '../../../../Interfaces/Types/DataTypes';
import { ExtraPairPadding, ExtraPairWidth } from '../../../../Presets/Constants';
import ExtraPairViolin from './ExtraPairViolin';
import ExtraPairBar from './ExtraPairBar';
import ExtraPairBasic from './ExtraPairBasic';

interface OwnProps {
    extraPairDataSet: ExtraPairPoint[];
    secondaryExtraPairDataSet?: ExtraPairPoint[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
}

export type Props = OwnProps;

function ExtraPairPlotGenerator({
  extraPairDataSet, secondaryExtraPairDataSet, aggregationScaleDomain, aggregationScaleRange,
}: Props) {
  let transferedDistance = 0;
  const returningComponents: JSX.Element[] = [];

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
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.Violin)},0)`}>
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
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.BarChart)},0)`}>
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
          <g transform={`translate(${transferedDistance - (ExtraPairWidth.Basic)},0)`}>
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
  return <g>{returningComponents}</g>;
}

export default observer(ExtraPairPlotGenerator);
