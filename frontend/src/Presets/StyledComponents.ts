import { Grid } from "semantic-ui-react";
import styled from "styled-components";

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