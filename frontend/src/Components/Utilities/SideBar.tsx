import React, { FC, useEffect, useState, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { Grid, Container, List, Button } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear, timeFormat } from "d3";
import { actions } from "../..";
import { AxisLabelDict, Accronym, stateUpdateWrapperUseJSON } from "../../PresetsProfile";
import { highlight_orange, secondary_gray } from "../../PresetsProfile";

interface OwnProps {
  store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ store }: Props) => {
  const {
    // totalCaseCount, 
    totalAggregatedCaseCount,
    totalIndividualCaseCount,
    rawDateRange,
    currentSelectSet,
    currentOutputFilterSet,
    currentSelectPatientGroup,
    filterSelection } = store!;
  const [procedureList, setProcedureList] = useState<any[]>([]);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [itemSelected, setItemSelected] = useState<any[]>([]);
  const [itemUnselected, setItemUnselected] = useState<any[]>([]);



  async function fetchProcedureList() {
    const res = await fetch("http://localhost:8000/api/get_attributes");
    const data = await res.json();
    const result = data.result

    console.log(result)
    let tempMaxCaseCount = 0;
    let tempItemUnselected: any[] = [];
    let tempItemSelected: any[] = [];
    result.forEach((d: any) => {
      tempMaxCaseCount = d.count > tempMaxCaseCount ? d.count : tempMaxCaseCount;
      if (filterSelection.includes(d.value)) {
        tempItemSelected.push(d)
      } else {
        tempItemUnselected.push(d)
      }
    })
    tempItemSelected.sort((a: any, b: any) => b.count - a.count)
    tempItemUnselected.sort((a: any, b: any) => b.count - a.count)
    setMaxCaseCount(tempMaxCaseCount)
    stateUpdateWrapperUseJSON(procedureList, result, setProcedureList)
    //setProcedureList(result);
    setItemUnselected(tempItemUnselected);
    setItemSelected(tempItemSelected)
  }

  useEffect(() => {
    fetchProcedureList();
    //  console.log(rawDateRange)
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
    newItemUnselected.sort((a: any, b: any) => b.count - a.count)
    stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected)

    stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected)
  }, [filterSelection])

  const caseScale = useCallback(() => {
    const caseScale = scaleLinear().domain([0, maxCaseCount]).range([0, 90])

    return caseScale;
  }, [maxCaseCount])

  const generateSurgery = () => {
    let output: any[] = [<span>Procedures: </span>]
    if (filterSelection.length === 0) {
      output.push(<span>All</span>);
    } else {
      filterSelection.map((d, i) => {
        const stringArray = d.split(" ")
        stringArray.map((word, index) => {
          if ((Accronym as any)[word]) {
            output.push((<div className="tooltip" style={{ cursor: "help" }}>{word}<span className="tooltiptext">{`${(Accronym as any)[word]}`}</span></div>))
          } else {
            output.push((<span>{`${index !== 0 ? " " : ""}${word}${index !== stringArray.length - 1 ? " " : ""}`}</span>))
          }
        })
        if (i !== filterSelection.length - 1) {
          output.push((<span>, </span>))
        }
      })
    }
    return output
  }

  const generatePatientSelection = () => {
    let output: any[] = []
    if (currentSelectPatientGroup.length > 0) {
      output.push(<List.Item key={"Patient Circled"} style={{ textAlign: "left" }} content={`${currentSelectPatientGroup.length} patients selected in LineUp`} />)
    }
    return output
  }

  return (
    <Grid
      divided="vertically"
      verticalAlign={"middle"}
      padded
    >

      <Grid.Row centered style={{ padding: "20px" }}>
        <Container style={{ height: "20vh" }}>
          <List bulleted>

            <List.Header style={{ textAlign: "left" }}><b>Current View</b></List.Header>
            <List.Item key="Date"
              //icon="circle"
              style={{ textAlign: "left" }}
              content={`${timeFormat("%Y-%m-%d")(new Date(rawDateRange[0]))} ~ ${timeFormat("%Y-%m-%d")(new Date(rawDateRange[1]))}`} />
            <List.Item key="AggreCaseCount"
              //   icon="caret right"
              style={{ textAlign: "left" }}
              content={`Aggregated Case: ${totalAggregatedCaseCount}`} />
            <List.Item key="IndiCaseCount"
              //  icon="caret right"
              style={{ textAlign: "left" }}
              content={`Individual Case: ${totalIndividualCaseCount}`} />

            <List.Item
              key="SurgeryList"
              //icon="caret right" 
              style={{ textAlign: "left" }}
              content={generateSurgery()} />
            {generatePatientSelection()}


            {currentOutputFilterSet.map((selectSet) => {
              return <FilterListIT
                //icon="caret right"
                key={`${selectSet.set_name}selected`}
                onClick={() => { actions.clearOutputFilterSet(selectSet.set_name) }}
                content={`${AxisLabelDict[selectSet.set_name]}: ${selectSet.set_value.sort()}`} />
            })}
          </List>
        </Container>

      </Grid.Row>
      <Grid.Row centered style={{ padding: "20px" }}>
        <Container style={{ height: "20vh" }}>
          <List bulleted>
            <List.Header style={{ textAlign: "left" }}><b>Current Selected</b></List.Header>
            {currentSelectSet.map((selectSet) => {
              return <FilterListIT
                //icon="caret right" 
                key={`${selectSet.set_name}currentselecting`}
                onClick={() => { actions.clearSelectSet(selectSet.set_name) }}
                content={`${AxisLabelDict[selectSet.set_name]} - ${selectSet.set_value.sort()}`} />
            })}
          </List>
          <Button disabled={!(currentSelectSet.length > 0)}
            basic size="tiny" content="Create Filter" onClick={actions.currentOutputFilterSetChange}
          />
          <Button disabled={!(currentOutputFilterSet.length > 0)}
            basic size="tiny" content="Clear Filter" onClick={() => { actions.clearOutputFilterSet() }}
          />
        </Container>
      </Grid.Row>

      <Grid.Row style={{ padding: "20px" }}>
        <Container style={{ overflow: "auto", height: "40vh" }}>
          <List relaxed divided >
            <List.Item key={"filter-header"} style={{ background: "#dff9ec" }}>
              <List.Content floated="left" style={{ width: "60%" }}>
                <b>Procedures</b>
              </List.Content>
              <List.Content floated="right" style={{ width: "30%" }}>
                <SVG>
                  <rect x={0} y={0} width={caseScale().range()[1]} height={13} fill={secondary_gray} />
                  <text x={0} y={13} textAnchor="start" alignmentBaseline="baseline" fill="white">0</text>
                  <text x={caseScale().range()[1]} y={13} textAnchor="end" alignmentBaseline="baseline" fill="white">{caseScale().domain()[1]}</text>
                </SVG>
              </List.Content>
            </List.Item>
            {itemSelected.map((listItem: any) => {
              if (listItem.value) {
                return (
                  <ListIT key={listItem.value} isSelected={true} style={{ cursor: "pointer" }} onClick={() => { actions.filterSelectionChange(listItem.value) }}>
                    <List.Content floated="left" style={{ width: "60%" }}>
                      {listItem.value}
                    </List.Content>
                    <List.Content floated="right" style={{ width: "30%" }}>
                      <SVG><rect x={0} y={0} width={caseScale()(listItem.count)} height={13} fill={secondary_gray}></rect></SVG>
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
                      {listItem.value}
                    </List.Content>
                    <List.Content floated="right" style={{ width: "30%" }}>
                      <SVG><rect x={0} y={0} width={caseScale()(listItem.count)} height={13} fill={secondary_gray}></rect></SVG>
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
  height: 15px;
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

const FilterListIT = styled(List.Item)`
  text-align: left;
  cursor: pointer;
  &:hover{
    text-shadow: 2px 2px 5px ${highlight_orange};
  }
`