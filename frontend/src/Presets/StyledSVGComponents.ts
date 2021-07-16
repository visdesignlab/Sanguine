import styled from "styled-components";
import { Offset } from "../Interfaces/Types/OffsetType";
import { postop_color } from "./Constants";

export const ChartSVG = styled.svg`
  height: 80%;
  width: 100%;
`;

export const SurgeryRect = styled(`rect`)`
  y:1;
  height:15px;
  fill-opacity:0.4;
  fill:${postop_color};
`

export const ListSVG = styled.svg`
  height: 15px;
  padding-left:5px;
  width:95%;
`
interface ChartGProps {
    currentOffset: Offset
    extraPairTotalWidth: number;
}

export const ChartG = styled(`g`) <ChartGProps>`
    transform: translate(${props => (props.currentOffset.left + props.extraPairTotalWidth)}px,0px)
`

// interface HeatRectProp {
//     isselected: boolean;
// }
//stroke: ${props => (props.isselected ? highlight_orange : `none`)};

export const HeatMapRect = styled(`rect`)`
    y:0;
    opacity:0.6;
    stroke-width:2;
`
interface HeatMapDivideProp {
    currentOffset: Offset;
    dimensionHeight: number
}

export const HeatMapDividerLine = styled(`line`) <HeatMapDivideProp>`
    x1:1;
    x2:1;
    y1=${props => (props.currentOffset.top)}
    y2=${props => (props.dimensionHeight - props.currentOffset.bottom)};
    stroke: #e5e5e5;
    stroke-width:1;
`