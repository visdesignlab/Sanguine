import React, { FC, useEffect, useState, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { Menu, Dropdown, Grid, Container, Message, List, Button } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear, timeFormat } from "d3";
import { actions } from "../..";
import { AxisLabelDict } from "../../Interfaces/ApplicationState";
import { basic_gray } from "../../ColorProfile";

interface OwnProps {
  store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ store }: Props) => {
  const {
    // totalCaseCount, 
    rawDateRange,
    currentSelectSet,
    currentOutputFilterSet,
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
    console.log(rawDateRange)
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

      <Grid.Row centered style={{ padding: "40px" }}>
        <Container style={{ height: "20vh" }}>
          <List>

            <List.Header>Current View</List.Header>
            <List.Item icon="caret right" style={{ textAlign: "left" }} content={`Date Range: ${timeFormat("%Y-%m-%d")(rawDateRange[0])} - ${timeFormat("%Y-%m-%d")(rawDateRange[1])}`} />
            {currentOutputFilterSet.map((selectSet) => {
              return <List.Item
                icon="caret right"
                style={{ textAlign: "left" }}
                content={`${AxisLabelDict[selectSet.set_name]}: ${selectSet.set_value.sort()}`} />
            })}
          </List>
        </Container>

      </Grid.Row>
      <Grid.Row centered style={{ padding: "40px" }}>
        <Container style={{ height: "20vh" }}>
          <List>
            <List.Header>Current Selected</List.Header>
            {currentSelectSet.map((selectSet) => {
              return <List.Item icon="caret right" style={{ textAlign: "left" }} content={`${AxisLabelDict[selectSet.set_name]} - ${selectSet.set_value.sort()}`} />
            })}
            <List.Item>
              <Button disabled={!(currentSelectSet.length > 0)}
                basic size="tiny" content="Create Filter" onClick={actions.currentOutputFilterSetChange}
              />
              <Button disabled={!(currentOutputFilterSet.length > 0)}
                basic size="tiny" content="Clear Filter" onClick={actions.clearOutputFilterSet}
              />
            </List.Item>
          </List>
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
                      <SVG><rect x={0} y={0} width={caseScale(listItem.count)} height={"10px"} fill={basic_gray}></rect></SVG>
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
                      <SVG><rect x={0} y={0} width={caseScale(listItem.count)} height={"10px"} fill={basic_gray}></rect></SVG>
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