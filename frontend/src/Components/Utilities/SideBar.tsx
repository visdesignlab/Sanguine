import React, { FC, useEffect, useState, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { Grid, Container, List, Button, Dropdown, Header } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear, timeFormat, max } from "d3";
import { actions } from "../..";
import { AxisLabelDict, Accronym, stateUpdateWrapperUseJSON } from "../../PresetsProfile";
import { highlight_orange, secondary_gray } from "../../PresetsProfile";
import { SingleCasePoint } from "../../Interfaces/ApplicationState";

interface OwnProps {
  hemoData: any;
  store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ hemoData, store }: Props) => {
  const {
    // totalCaseCount, 
    totalAggregatedCaseCount,
    totalIndividualCaseCount,
    rawDateRange,
    currentSelectSet,
    currentOutputFilterSet,
    currentSelectPatientGroup,
    filterSelection } = store!;
  //const [procedureList, setProcedureList] = useState<any[]>([]);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  // const [itemSelected, setItemSelected] = useState<any[]>([]);
  // const [itemUnselected, setItemUnselected] = useState<any[]>([]);
  const [surgeryList, setSurgeryList] = useState<any[]>([]);
  const [caseList, setCaseList] = useState<any[]>([]);

  const surgeryBarStarting = 140
  const surgeryBarEnding = 240

  useEffect(() => {
    //TODO there are duplicated caseID. 3881 incoming, 3876 outgoing
    let caseDuplicationCheck = new Set();

    let newCaseList = hemoData.map((d: any) => {

      if (!caseDuplicationCheck.has(d.CASE_ID)) {
        caseDuplicationCheck.add(d.CASE_ID)
        const newSingleCasePoint: SingleCasePoint = {
          visitNum: d.VISIT_ID,
          caseId: d.CASE_ID,
          YEAR: d.YEAR,
          SURGEON_ID: d.SURGEON_ID,
          ANESTHOLOGIST_ID: d.ANESTHOLOGIST_ID,
          patientID: d.PATIENT_ID,
          DATE: d.DATE
        };
        const newOption = {
          key: `${d.CASE_ID}`,
          text: d.CASE_ID,
          value: JSON.stringify(newSingleCasePoint),
          //caseRelated: newSingleCasePoint

        };
        return newOption
      } else { return undefined }

    })
    newCaseList = newCaseList.filter((d: any) => d)

    stateUpdateWrapperUseJSON(caseList, newCaseList, setCaseList)
  }, [hemoData])

  async function fetchProcedureList() {
    const res = await fetch("http://localhost:8000/api/get_attributes");
    const data = await res.json();
    const result = data.result;

    let tempSurgeryList: any[] = [];

    const tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);
    setMaxCaseCount(tempMaxCaseCount)
    const caseScale = scaleLinear().domain([0, tempMaxCaseCount]).range([0, surgeryBarEnding - surgeryBarStarting])

    result.forEach((d: any) => {

      tempSurgeryList.push({
        key: d.value,
        text: d.value,
        value: d.value,
        count: d.count,
        content: (
          <SVG>
            <text alignmentBaseline="hanging" x={0} y={0}>{d.value}</text>
            <rect x={surgeryBarEnding - caseScale(d.count)} y={0} width={caseScale(d.count)} height={13} fill={secondary_gray} />
          </SVG>
        ),
      })
    })
    tempSurgeryList.sort((a: any, b: any) => b.count - a.count)
    // tempItemSelected.sort((a: any, b: any) => b.count - a.count)
    // tempItemUnselected.sort((a: any, b: any) => b.count - a.count)
    // setMaxCaseCount(tempMaxCaseCount)
    stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList)
    //setProcedureList(result);
    // setItemUnselected(tempItemUnselected);
    // setItemSelected(tempItemSelected)
  }

  useEffect(() => {
    fetchProcedureList();
    //  console.log(rawDateRange)
  }, []);

  // useEffect(() => {
  //   let newItemSelected: any[] = []
  //   let newItemUnselected: any[] = []
  //   procedureList.forEach((d: any) => {
  //     if (filterSelection.includes(d.value)) {
  //       newItemSelected.push(d)
  //     }
  //     else {
  //       newItemUnselected.push(d)
  //     }
  //   })
  //   newItemSelected.sort((a: any, b: any) => b.count - a.count)
  //   newItemUnselected.sort((a: any, b: any) => b.count - a.count)
  //   stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected)

  //   stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected)
  // }, [filterSelection])



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
      output.push(<FilterListIT key={"Patient Circled"} style={{ textAlign: "left" }} onClick={() => { actions.updateSelectedPatientGroup([]) }} content={`${currentSelectPatientGroup.length} patients filtered`} />)
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

            <List.Header style={{ textAlign: "left" }}>
              <b>Current View</b>
            </List.Header>
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
              if (selectSet.set_name === "CASE_ID") {
                return <List.Item
                  //icon="caret right" 
                  key={`${selectSet.set_name}currentselecting`}
                  style={{ textAlign: "left" }}
                  //  onClick={() => { actions.clearSelectSet(selectSet.set_name) }}
                  content={`${selectSet.set_value.length} cases selected`} />
              } else {
                return <FilterListIT
                  //icon="caret right" 
                  key={`${selectSet.set_name}currentselecting`}
                  onClick={() => { actions.clearSelectSet(selectSet.set_name) }}
                  content={`${AxisLabelDict[selectSet.set_name]} - ${selectSet.set_value.sort()}`} />
              }
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

      <Grid.Row centered style={{ padding: "20px" }}>
        <Container style={{ overflow: "auto", height: "20vh" }}>
          {/* <List relaxed divided >
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
          </List> */}

          <Dropdown
            placeholder="Procedure Selection"
            multiple
            search
            selection
            style={{ width: 270 }}
            onChange={(e, d) => { actions.filterSelectionChange(d.value) }}
            options={surgeryList}
            header={<Header><SVG>
              <text alignmentBaseline="hanging" x={0} y={0}>Procedures</text>
              <rect x={surgeryBarStarting} y={0} width={surgeryBarEnding - surgeryBarStarting} height={13} fill={secondary_gray} />

              <text x={surgeryBarStarting + 1} y={11} textAnchor="start" alignmentBaseline="baseline" fill="white">0</text>
              <text x={surgeryBarEnding} y={11} textAnchor="end" alignmentBaseline="baseline" fill="white">{maxCaseCount}</text>
            </SVG></Header>}
            value={filterSelection}
          />
        </Container>
      </Grid.Row>

      <Grid.Row centered style={{ padding: "20px" }}>
        <Container style={{ height: "20vh" }}>
          <Dropdown
            placeholder="Case Search"
            search
            selection
            style={{ width: 270 }}
            clearable
            onChange={(e, d) => {
              if (d.value && (d.value as any).length > 0) {
                actions.selectPatient(JSON.parse(d.value as any))
              } else {
                actions.selectPatient(null)
              }
            }
            }

            options={caseList}
          // header={<Header><SVG>
          //   <text alignmentBaseline="hanging" x={0} y={0}>Procedures</text>
          //   <rect x={surgeryBarStarting} y={0} width={surgeryBarEnding - surgeryBarStarting} height={13} fill={secondary_gray} />

          //   <text x={surgeryBarStarting + 1} y={11} textAnchor="start" alignmentBaseline="baseline" fill="white">0</text>
          //   <text x={surgeryBarEnding} y={11} textAnchor="end" alignmentBaseline="baseline" fill="white">{maxCaseCount}</text>
          // </SVG></Header>}
          // value={filterSelection}
          >

          </Dropdown>
        </Container>
      </Grid.Row>
    </Grid>
  );
}
export default inject("store")(observer(SideBar));

const SVG = styled.svg`
  height: 15px;
  width: 250px;
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