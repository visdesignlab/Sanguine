import {
  Chip, Container, Grid,
} from '@mui/material';
import styled from '@emotion/styled';
import { basicGray } from './Constants';

export const LayoutDiv = styled.div`
  width: 100vw;
`;

export const Title = styled.b`
    font-size:large;
`;

export const SurgeryNumText = styled('text')({
  textAnchor: 'end',
  alignmentBaseline: 'middle',
  fontSize: '0.875rem',
});

export const CenterAlignedDiv = styled.div({
  textAlign: 'center',
});

export const SurgeryDiv = styled.td`
  overflow: hidden;
  font-size:0.875rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  alignment-baseline: hanging;
  text-align:left;
  text-shadow: 2px 2px 5px white;
  &:hover{
    overflow: visible;
  }
`;

export const FilterChip = styled(Chip)({
  margin: '3px',
});

export const ChartWrapperContainer = styled(Container)({
  height: '100%!important',
});

export const ChartAccessoryDiv = styled.div({
  textAlign: 'right',
  color: basicGray,
});

interface SurgeryListProps {
    isSelected: boolean;
}

export const SurgeryListComp = styled('tr') <SurgeryListProps>`
  background:${(props) => (props.isSelected ? '#ecbe8d' : 'none')};
  cursor: pointer;
  &:hover{
    background:#faeee1;
  }
`;

export const InheritWidthGrid = styled(Grid)({
  width: 'inherit!important',
});

export const BiggerTooltip = styled.div({
  fontSize: 'small!important',
  textAlign: 'center',
});
