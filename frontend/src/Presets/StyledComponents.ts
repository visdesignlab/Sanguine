
import { Basic_Gray, Third_Gray } from "./Constants";
import { Chip, Container, Grid, ListSubheader, Toolbar } from "@mui/material";
import styled from "@emotion/styled";

export const LayoutDiv = styled.div`
  width: 100vw;
`;

export const CaseListSubheader = styled(ListSubheader)({
    padding: "5px!important",
    backgroundColor: "white!important"
});

export const Title = styled.b`
    font-size:large;
`;

export const SurgeryNumText = styled(`text`)({
    textAnchor: 'end',
    alignmentBaseline: 'middle',
    fontSize: '0.875rem',
});


export const CenterAlignedDiv = styled.div({
    textAlign: "center"
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
    margin: '3px'
});

export const ChartWrapperContainer = styled(Container)({
    height: "100%!important"
});

export const ChartAccessoryDiv = styled.div({
    textAlign: "right",
    color: Basic_Gray
});

interface SurgeryListProps {
    isSelected: boolean;
}

export const SurgeryListComp = styled(`tr`) <SurgeryListProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
  cursor: pointer;
  &:hover{
    background:#faeee1;
  }
`;

interface WelcomeTextProps {
    show: boolean;
}

export const WelcomeText = styled(`text`) < WelcomeTextProps>`
    display:${props => props.show ? "none" : "block"};
    font-size:xxx-large;
    fill:${Third_Gray};
    opacity:0.25;
    margin:20px;
`;

export const UtilityContainer = styled(Container)({
    width: "100%",
    paddingLeft: "5px!important",
    paddingRight: "5px!important",
    maxWidth: "none",
    overflow: "hidden",
    height: "100%",
    '&:hover': {
        overflow: "overlay"
    },
});

export const InheritWidthGrid = styled(Grid)({
    width: "inherit!important"
});

export const PaddedToolBar = styled(Toolbar)({
    '& > *': {
        paddingLeft: "6px",
        paddingRight: "6px"
    },
});

export const BiggerTooltip = styled.div({
    fontSize: "small!important",
    textAlign: "center",
});
