import styled from '@emotion/styled';
import { timeFormat } from 'd3';
import { observer } from 'mobx-react';
import { useContext } from 'react';
import Store from '../../../Interfaces/Store';
import {
  DifferentialSquareWidth, preopColor, postopColor, OffsetDict, largeFontSize, regularFontSize,
} from '../../../Presets/Constants';
import { AcronymDictionary, Outcome } from '../../../Presets/DataDict';
import { BiggerFontProps } from '../../../Presets/StyledSVGComponents';

const ComparisonDiv = styled.div<BiggerFontProps>`
  font-size:${(props) => (props.biggerFont ? `${largeFontSize}px` : `${regularFontSize}px`)};
  line-height:normal;
`;

type Props = {
    dimensionWidth: number;
    interventionDate?: number;
    firstTotal: number;
    secondTotal: number;
    outcomeComparison?: Outcome;
};

function ComparisonLegend({
  outcomeComparison, dimensionWidth, interventionDate, firstTotal, secondTotal,
}: Props) {
  const currentOffset = OffsetDict.regular;
  const store = useContext(Store);
  return (
    <g>
      <g transform="translate(0,4)">
        <rect
          x={0.2 * (dimensionWidth)}
          y={0}
          width={DifferentialSquareWidth}
          height={12}
          fill={preopColor}
          opacity={0.65}
        />
        <rect
          x={0.2 * (dimensionWidth)}
          y={12}
          width={DifferentialSquareWidth}
          height={12}
          fill={postopColor}
          opacity={0.65}
        />
        <text
          x={0.2 * (dimensionWidth) + DifferentialSquareWidth + 1}
          y={6}
          alignmentBaseline="middle"
          textAnchor="start"
          fontSize={store.configStore.largeFont ? largeFontSize : regularFontSize}
          fill="black"
        >
          {`${interventionDate ? 'Pre Intervene' : 'True'} ${firstTotal}/${firstTotal + secondTotal}`}
        </text>
        <text
          x={0.2 * (dimensionWidth) + DifferentialSquareWidth + 1}
          y={18}
          alignmentBaseline="middle"
          textAnchor="start"
          fontSize={store.configStore.largeFont ? largeFontSize : regularFontSize}
          fill="black"
        >
          {`${interventionDate ? 'Post Intervene' : 'False'} ${secondTotal}/${firstTotal + secondTotal}`}
        </text>
      </g>
      <foreignObject x={0.0 * (dimensionWidth)} y={0} width={0.2 * dimensionWidth} height={currentOffset.top}>
        <ComparisonDiv biggerFont={store.configStore.largeFont}>{interventionDate ? 'Intervention:' : 'Comparing:'}</ComparisonDiv>
        <ComparisonDiv biggerFont={store.configStore.largeFont}>{interventionDate ? timeFormat('%Y-%m-%d')(new Date(interventionDate)) : (AcronymDictionary[outcomeComparison!]) || outcomeComparison}</ComparisonDiv>
      </foreignObject>
    </g>
  );
}

export default observer(ComparisonLegend);
