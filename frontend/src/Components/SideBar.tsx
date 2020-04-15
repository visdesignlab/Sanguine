import React, { FC, useEffect, useState, useMemo } from "react";
import Store from "../Interfaces/Store";
import styled from 'styled-components'
import { Menu, Dropdown, Grid, Container, Message, List } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear } from "d3";
import { actions } from "..";

interface OwnProps {
  store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ store }: Props) => {
  const {
    // totalCaseCount, 
    actualYearRange,
    filterSelection } = store!;
  const [procedureList, setProcedureList] = useState([]);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [itemSelected, setItemSelected] = useState<any[]>([]);
  const [itemUnselected, setItemUnselected] = useState<any[]>([]);



  async function fetchProcedureList() {
    const res = await fetch("http://localhost:8000/api/get_attributes");
    const data = await res.json();
    const result = data.result

    let tempMaxCaseCount = 0
    result.forEach((d: any) => {
      tempMaxCaseCount = d.count > tempMaxCaseCount ? d.count : tempMaxCaseCount;
    })
    result.sort((a: any, b: any) => b.count - a.count)
    setMaxCaseCount(tempMaxCaseCount)
    setProcedureList(result);
    setItemUnselected(result);
  }

  useEffect(() => {
    fetchProcedureList();
  }, []);

  useEffect(() => {
    let newItemSelected: any[] = []
    let newItemUnselected: any[] = []
    procedureList.forEach((d: any) => {
      if (filterSelection.includes(d.value)) {
        newItemSelected.push(d)
      }
      else {
        newItemUnselected.push(d)
      }
    })
    newItemSelected.sort((a: any, b: any) => b.count - a.count)
    setItemSelected(newItemSelected)
    setItemUnselected(newItemUnselected)
  }, [filterSelection])

  const [caseScale] = useMemo(() => {
    const caseScale = scaleLinear().domain([0, maxCaseCount]).range([0, 100])

    return [caseScale];
  }, [maxCaseCount])

  return (
    <Grid
      divided="vertically"

      verticalAlign={"middle"}
      padded
    >

      <Grid.Row centered>
        <Message>
          <Message.Header>Current View</Message.Header>
          {/* <Message.Item>Case Count:{totalCaseCount}</Message.Item> */}
          <Message.Item>
            Selected Year Range: {actualYearRange[0]} - {actualYearRange[1]}
          </Message.Item>
        </Message>
      </Grid.Row>
      <Grid.Row>
        <Container>

        </Container>
      </Grid.Row>
      <Grid.Row style={{ padding: "10px" }}>
        <Container style={{ overflow: "auto", height: "40vh" }}>
          <List relaxed divided >
            {itemSelected.map((listItem: any) => {
              if (listItem.value) {
                return (
                  <ListIT key={listItem.value} isSelected={true} style={{ cursor: "pointer" }} onClick={() => { actions.filterSelectionChange(listItem.value) }}>
                    <List.Content floated="left" style={{ width: "60%" }}>
                      {listItem.value.toLowerCase()}
                    </List.Content>
                    <List.Content floated="right" style={{ width: "30%" }}>
                      <SVG><rect x={0} y={0} width={caseScale(listItem.count)} height={"10px"} fill={"#20639B"}></rect></SVG>
                    </List.Content>
                  </ListIT>
                )
              }
            })}
            {itemSelected.length > 0 ? (<List.Item />) : (<></>)}
            {itemUnselected.map((listItem: any) => {
              if (listItem.value) {
                return (
                  <ListIT key={listItem.value} isSelected={false} style={{ cursor: "pointer" }} onClick={() => { actions.filterSelectionChange(listItem.value) }}>
                    <List.Content floated="left" style={{ width: "60%" }}>
                      {listItem.value.toLowerCase()}
                    </List.Content>
                    <List.Content floated="right" style={{ width: "30%" }}>
                      <SVG><rect x={0} y={0} width={caseScale(listItem.count)} height={"10px"} fill={"#20639B"}></rect></SVG>
                    </List.Content>
                  </ListIT>)
              }
            })}
          </List>
          {/* <Dropdown
              placeholder="Procedure"
              multiple
              search
              selection
              onChange={actions.filterSelectionChange}
              options={procedureList.result}
              value={filterSelection}
            /> */}

        </Container>
      </Grid.Row>
    </Grid>
  );
}
export default inject("store")(observer(SideBar));

const SVG = styled.svg`
  height: 10px;
  width: 100px;
`;
interface ListITProps {
  isSelected: boolean;
}
const ListIT = styled(List.Item) <ListITProps>`
  background:${props => props.isSelected ? '#ffdbb8' : 'none'};
  &:hover{
    background:#d0e4f5;
  }
`