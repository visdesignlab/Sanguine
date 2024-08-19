import { Tooltip } from '@mui/material';
import { format, scaleLinear, sum } from 'd3';
import { observer } from 'mobx-react';
import { useCallback, useContext } from 'react';
import Store from '../../../Interfaces/Store';
import { CostBarChartDataPoint } from '../../../Interfaces/Types/DataTypes';
import { colorProfile } from '../../../Presets/Constants';
import { BloodComponentOptions } from '../../../Presets/DataDict';

interface OwnProps {
  dataPoint: CostBarChartDataPoint;
  howToTransform: string;
  valueScaleDomain: string;
  valueScaleRange: string;
  bandwidth: number;
  costMode: boolean;
  showPotential: boolean;
}

export type Props = OwnProps;

function SingleStackedBar({
  howToTransform, dataPoint, showPotential, bandwidth, costMode, valueScaleDomain, valueScaleRange,
}: Props) {
  const store = useContext(Store);

  const { BloodProductCost } = store.provenanceState;
  const valueScale = useCallback(() => {
    const domain = JSON.parse(valueScaleDomain);
    const range = JSON.parse(valueScaleRange);
    const valScale = scaleLinear()
      .domain(domain)
      .range(range);
    return valScale;
  }, [valueScaleDomain, valueScaleRange]);

  const generateStackedBars = () => {
    let outputElements = [];
    if (!costMode) {
      outputElements = dataPoint.dataArray.map((point, index) => (
        <Tooltip title={`${BloodComponentOptions[index].key}: ${costMode ? format('$.2f')(point) : format('.4r')(point)}`} key={index}>
          <rect
            x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
            transform={howToTransform}
            height={bandwidth}
            width={valueScale()(point) - valueScale()(0)}
            fill={colorProfile[index]}
          />
        </Tooltip>
      ));
    } else {
      outputElements = dataPoint.dataArray.slice(0, 4).map((point, index) => (
        <Tooltip title={`${BloodComponentOptions[index].key}: ${costMode ? format('$.2f')(point) : format('.4r')(point)}`} key={index}>
          <rect
            x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
            transform={howToTransform}
            height={bandwidth}
            width={valueScale()(point) - valueScale()(0)}
            fill={colorProfile[index]}
          />
        </Tooltip>
      ));
      const potentialCost = dataPoint.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS;
      const cellSalvageCost = dataPoint.dataArray[4];
      outputElements.push(
        <Tooltip title={showPotential ? `Potential RBC Cost ${format('$.2f')(potentialCost)}` : `Cell Salvage Cost${format('$.2f')(cellSalvageCost)}`}>
          <rect
            x={valueScale()(sum(dataPoint.dataArray.slice(0, 4)))}
            transform={howToTransform}
            height={bandwidth}
            width={showPotential ? (valueScale()(potentialCost) - valueScale()(0)) : (valueScale()(cellSalvageCost) - valueScale()(0))}
            fill={showPotential ? colorProfile[0] : colorProfile[4]}
          />
        </Tooltip>,
      );
      const costSaved = dataPoint.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - dataPoint.dataArray[4];
      outputElements.push(
        <Tooltip title={`Potential Saving per case ${format('$.2f')(costSaved)}`}>
          <rect
            x={valueScale()(-costSaved)}
            transform={howToTransform}
            height={bandwidth}
            visibility={showPotential ? 'hidden' : 'visible'}
            width={valueScale()(0) - valueScale()(-costSaved)}
            fill="#f5f500"
          />
        </Tooltip>,
      );
    }
    return outputElements;
  };
  return (
    <>
      {generateStackedBars()}
    </>
  );
}

export default observer(SingleStackedBar);
