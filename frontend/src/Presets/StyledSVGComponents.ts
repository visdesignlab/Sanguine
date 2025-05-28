import styled from '@emotion/styled';
import { Offset } from '../Interfaces/Types/OffsetType';
import {
  largeFontSize, lightGray, postopColor, preopColor, regularFontSize,
} from './Constants';

export const ChartSVG = styled.svg`
  height: calc(100% - 100px);
  width: 100%;
`;

export const SurgeryRect = styled('rect')`
  y:1;
  height:15px;
  fill-opacity:0.4;
  fill:${postopColor};
`;
interface ListSVGProps {
  widthInput: number;
}
export const ListSVG = styled.svg<ListSVGProps>`
  height: 15px;
  padding-left:5px;
  width:${(props) => props.widthInput}px;
`;
interface ChartGProps {
  currentOffset: Offset;
  attributePlotTotalWidth: number;
}

export const ChartG = styled('g') <ChartGProps>`
  transform: translate(${(props) => (props.currentOffset.left + props.attributePlotTotalWidth)}px,0px)
`;

export const HeatMapRect = styled('rect')`
  y:0;
  opacity:0.6;
  stroke-width:2;
`;
interface HeatMapDivideProp {
  currentOffset: Offset;
  dimensionHeight: number;
}

export const HeatMapDividerLine = styled('line') <HeatMapDivideProp>`
  x1:1;
  x2:1;
  y1=${(props) => (props.currentOffset.top)}
  y2=${(props) => (props.dimensionHeight - props.currentOffset.bottom)};
  stroke: #e5e5e5;
    stroke-width:1;
`;

interface DotProps {
  selected: boolean;
  isPreop: boolean;
  hovered: boolean;
  hoverColor: string;
  selectColor: string;
}
interface RectProps {
  selected: boolean;
  hovered: boolean;
  hoverColor: string;
  selectColor: string;
}

interface AverageLineProps {
  isPreop: boolean;
}

// If selected: selectColor; If only hovered: hoverColor; If none, preop/postop color
export const DumbbellCircle = styled('circle')<DotProps>`
  r: 4px;
  opacity: 1;
  fill: ${(props) => (props.selected
    ? props.selectColor
    : props.hovered
      ? props.hoverColor
      : props.isPreop
        ? preopColor
        : postopColor)};
`;

// If selected: selectColor; If only hovered: hoverColor; If none, lightGray
export const DumbbellRect = styled('rect')<RectProps>`
  width: 1.5px;
  opacity: 1;
  fill: ${(props) => (props.selected
    ? props.selectColor
    : props.hovered
      ? props.hoverColor
      : lightGray)};
`;

export const DumbbellLine = styled('line') < AverageLineProps>`
    stroke: ${(props) => (props.isPreop ? preopColor : postopColor)};
    stroke-width:3px
    `;

export interface BiggerFontProps {
  biggerFont: boolean;
}

export const AxisText = styled.foreignObject<BiggerFontProps>`
    alignment-baseline: hanging;
    y:0px;
    text-align:center;
      height: 13px;
    font-size:${(props) => (props.biggerFont ? `${largeFontSize}px` : `${regularFontSize}px`)};
    color:white;
    -webkit-text-fill-color: white;
`;

export const CustomAxisLine = styled('line')`
    stroke: #404040;
    stroke-width:2px;
    y1: 0;
    y2:0;
`;

interface CustomAxisColumnBackgroundProps {
  chartHeight: number;
}

export const CustomAxisColumnBackground = styled('rect')<CustomAxisColumnBackgroundProps>`
    height: ${({ chartHeight }) => chartHeight}px;
    y: -${({ chartHeight }) => chartHeight}px;
`;

export const CustomAxisLineBox = styled('rect')`
    height: 13px;
    y:0px;
    opacity:0.75;
`;
