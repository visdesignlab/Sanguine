import { timeFormat } from "d3";
import { observer } from "mobx-react";
import { FC } from "react";
import styled from "styled-components";
import { DifferentialSquareWidth, preop_color, postop_color, OffsetDict } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";

type Props = {
    dimensionWidth: number;
    interventionDate?: number;
    firstTotal: number;
    secondTotal: number;
    outcomeComparison: string;
}

const ComparisonLegend: FC<Props> = ({ outcomeComparison, dimensionWidth, interventionDate, firstTotal, secondTotal }: Props) => {
    const currentOffset = OffsetDict.regular;
    return (<g>
        <g transform="translate(0,4)">
            <rect x={0.2 * (dimensionWidth)}
                y={0}
                width={DifferentialSquareWidth}
                height={12}
                fill={preop_color}
                opacity={0.65} />
            <rect x={0.2 * (dimensionWidth)}
                y={12}
                width={DifferentialSquareWidth}
                height={12}
                fill={postop_color}
                opacity={0.65} />
            <text
                x={0.2 * (dimensionWidth) + DifferentialSquareWidth + 1}
                y={6}
                alignmentBaseline={"middle"}
                textAnchor={"start"}
                fontSize="11px"
                fill={"black"}>
                {` ${interventionDate ? `Pre Intervene` : `True`} ${firstTotal}/${firstTotal + secondTotal}`}
            </text>
            <text
                x={0.2 * (dimensionWidth) + DifferentialSquareWidth + 1}
                y={18}
                alignmentBaseline={"middle"}
                textAnchor={"start"}
                fontSize="11px"
                fill={"black"}>
                {`${interventionDate ? `Post Intervene` : `False`} ${secondTotal}/${firstTotal + secondTotal}`}
            </text>
        </g>
        <foreignObject x={0.0 * (dimensionWidth)} y={0} width={0.2 * dimensionWidth} height={currentOffset.top}>
            <ComparisonDiv>{interventionDate ? `Intervention:` : `Comparing:`}</ComparisonDiv>
            <ComparisonDiv>{interventionDate ? timeFormat("%Y-%m-%d")(new Date(interventionDate)) : (AcronymDictionary[outcomeComparison || ""]) || outcomeComparison}</ComparisonDiv>
        </foreignObject>
    </g>)
}

export default observer(ComparisonLegend)

const ComparisonDiv = styled.div`
  font-size:x-small;
  line-height:normal;
`;