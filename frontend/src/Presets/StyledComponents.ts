import { Button, Grid, List } from "semantic-ui-react";
import styled from "styled-components";
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import { postop_color } from "./Constants";

export const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const SpecialPaddingColumn = styled(Grid.Column)`
  &&&&&{padding-left:5px;}
`;

export const RequirementP = styled(`p`)`
    color:red;
    font-size:large
`

export const BugButton = styled(Button)`
    &&&&&{margin-left:5px!important;}
`
export const Title = styled.b`
    font-size:larger
`

export const StyledDate = styled(SemanticDatePicker)`
  width:100%;
`

export const SurgeryRect = styled(`rect`)`
  y:1;
  height:15px;
  fill-opacity:0.4;
  fill:${postop_color};
`

export const SurgeryText = styled(`text`)`
  text-anchor:end
  alignment-baseline: middle;
  transform: translate(13px, 0px);
`

export const SurgeryDiv = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  alignment-baseline: hanging;
  text-align:left;
  text-shadow: 2px 2px 5px white;
`

export const ListSVG = styled.svg`
  height: 15px;
  padding-left:5px;
  width:95%
`

export const SurgeryForeignObj = styled.foreignObject`
  x:0;
  y:0;
  height:100%;
  &:hover{
    width:100%
  }
`
interface SurgeryListProps {
    isSelected: boolean;
}

export const SurgeryListComp = styled(List.Item) <SurgeryListProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
  cursor: pointer;
  &:hover{
    background:#faeee1;
  }
`