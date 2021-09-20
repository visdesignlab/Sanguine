import styled from "styled-components";
import { Offset } from "../Interfaces/Types/OffsetType";
import { Basic_Gray, highlight_orange, postop_color, preop_color } from "./Constants";

export const ChartSVG = styled.svg`
  height: calc(100% - 100px);
  width: 100%;
`;

export const SurgeryRect = styled(`rect`)`
  y:1;
  height:15px;
  fill-opacity:0.4;
  fill:${postop_color};
`
interface ListSVGProps {
    widthInput: number;
}
export const ListSVG = styled.svg<ListSVGProps>`
  height: 15px;
  padding-left:5px;
  width:${props => props.widthInput}px;
`
interface ChartGProps {
    currentOffset: Offset
    extraPairTotalWidth: number;
}

export const ChartG = styled(`g`) <ChartGProps>`
    transform: translate(${props => (props.currentOffset.left + props.extraPairTotalWidth)}px,0px)
`


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

interface DotProps {

    isSelectSet: boolean;
    ispreop: boolean;
}
interface RectProps {
    isselected: boolean;
}

interface AverageLineProps {
    ispreop: boolean;
}


export const DumbbellCircle = styled(`circle`) <DotProps>`
  r:4px;
  fill: ${props => (props.isSelectSet ? highlight_orange : props.ispreop ? preop_color : postop_color)};
  opacity:${props => props.isSelectSet ? 1 : 0.8};
`;

export const DumbbellRect = styled(`rect`) <RectProps>`
 width:1.5px;
 opacity:${props => props.isselected ? 1 : 0.5};
 fill: ${props => (props.isselected ? highlight_orange : Basic_Gray)};
`;

export const DumbbellLine = styled(`line`) < AverageLineProps>`
    stroke: ${props => (props.ispreop ? preop_color : postop_color)};
    stroke-width:3px
    `

export const AxisText = styled.text`
    fill:white;
    alignment-baseline: hanging;
    text-anchor: middle;
    y:0;
`

export const CustomAxisLine = styled(`line`)`
    stroke: #404040;
    stroke-width:2px;
    y1: 0;
    y2:0;
`

export const CustomAxisLineBox = styled(`rect`)`
    height: 13px;
    y:0px;
    opacity:0.75;
`