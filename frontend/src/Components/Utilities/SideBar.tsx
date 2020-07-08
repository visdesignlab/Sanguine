import React, { FC, useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from 'styled-components'
import { Grid, Container, List, Button, Header, Search } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear, timeFormat, max } from "d3";
import { actions } from "../..";
import { AxisLabelDict, Accronym, stateUpdateWrapperUseJSON, postop_color, Title } from "../../PresetsProfile";
import { highlight_orange, secondary_gray } from "../../PresetsProfile";
import { SingleCasePoint } from "../../Interfaces/ApplicationState";

interface OwnProps {
  hemoData: any;
  store?: Store;
}
// const surgeryBarStarting = 160
// const surgeryBarEnding = 290


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
    currentBrushedPatientGroup,
    currentSelectPatient,
    filterSelection } = store!;

  const [surgerySearchResult, setsurgerySearchResult] = useState<any[]>([]);
  const [caseSearchResult, setCaseSearchResult] = useState<any[]>([])

  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [itemSelected, setItemSelected] = useState<any[]>([]);
  const [itemUnselected, setItemUnselected] = useState<any[]>([]);
  const [surgeryList, setSurgeryList] = useState<any[]>([]);

  const [searchSurgeryVal, setSearchSurgeryVal] = useState("");
  const [searchCaseVal, setSearchCaseVal] = useState("");

  const [width, setWidth] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    if (svgRef.current) {
      setWidth(svgRef.current.clientWidth)
    }
  })

  window.addEventListener("resize", () => {
    if (svgRef.current) {
      setWidth(svgRef.current.clientWidth)
    }
  })

  const caseScale = useCallback(() => {

    const caseScale = scaleLinear().domain([0, maxCaseCount]).range([0.6 * width, 0.96 * width])
    return caseScale;
  }, [maxCaseCount, width])

  async function fetchProcedureList() {
    const res = await fetch("http://localhost:8000/api/get_attributes");
    const data = await res.json();
    const result = data.result;

    let tempSurgeryList: any[] = result;

    const tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);
    setMaxCaseCount(tempMaxCaseCount)
    let tempItemUnselected: any[] = [];
    let tempItemSelected: any[] = [];

    result.forEach((d: any) => {
      if (filterSelection.includes(d.value)) {
        tempItemSelected.push(d)
      } else {
        tempItemUnselected.push(d)
      }
    })
    tempSurgeryList.sort((a: any, b: any) => b.count - a.count)
    tempItemSelected.sort((a: any, b: any) => b.count - a.count)
    tempItemUnselected.sort((a: any, b: any) => b.count - a.count)
    // setMaxCaseCount(tempMaxCaseCount)
    stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList)
    //setProcedureList(result);
    stateUpdateWrapperUseJSON(itemUnselected, tempItemUnselected, setItemUnselected);
    stateUpdateWrapperUseJSON(itemSelected, tempItemSelected, setItemSelected);
    //setItemUnselected(tempItemUnselected);
    // setItemSelected(tempItemSelected);
  }

  useEffect(() => {
    fetchProcedureList();
  }, []);



  useEffect(() => {
    let newItemSelected: any[] = []
    let newItemUnselected: any[] = []
    surgeryList.forEach((d: any) => {
      if (filterSelection.includes(d.value)) {
        newItemSelected.push(d)
      }
      else {
        newItemUnselected.push(d)
      }
    })
    // newItemSelected.sort((a: any, b: any) => b.count - a.count)
    // newItemUnselected.sort((a: any, b: any) => b.count - a.count)
    stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected)
    stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected)
  }, [filterSelection])



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

  const generateBrushPatientItem = () => {
    if (currentBrushedPatientGroup.length > 0) {
      return (<List.Item
        style={{ textAlign: "left", paddingLeft: "20px" }}
        key="Brushed Patients"
        content={`${currentBrushedPatientGroup.length} patients selected`} />)
    }
  }


  return (
    <Grid
      divided="vertically"
      verticalAlign={"middle"}
      padded
    >

      <Grid.Row centered  >
        <Container style={{ height: "20vh" }}>
          <List bulleted>

            <List.Header style={{ textAlign: "left" }}>
              <Title>Current View</Title>
            </List.Header>
            <List.Item key="Date"
              style={{ textAlign: "left", paddingLeft: "20px" }}
              content={`${timeFormat("%Y-%m-%d")(new Date(rawDateRange[0]))} ~ ${timeFormat("%Y-%m-%d")(new Date(rawDateRange[1]))}`} />
            <List.Item key="AggreCaseCount"
              style={{ textAlign: "left", paddingLeft: "20px" }}
              content={`Aggregated Case: ${totalAggregatedCaseCount}`} />
            <List.Item key="IndiCaseCount"
              //  icon="caret right"
              style={{ textAlign: "left", paddingLeft: "20px" }}
              content={`Individual Case: ${totalIndividualCaseCount}`} />

            <List.Item
              key="SurgeryList"
              //icon="caret right" 
              style={{ textAlign: "left", paddingLeft: "20px" }}
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
      <Grid.Row centered >
        <Container style={{ height: "20vh" }}>
          <List bulleted>

            <List.Header style={{ textAlign: "left" }}>
              <Title>Current Selected</Title>
            </List.Header>

            {generateBrushPatientItem()}

            {currentSelectSet.map((selectSet) => {
              return <FilterListIT
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


      <Grid.Row centered >
        <Container>
          <Search
            placeholder="Search a Case by ID"
            //defaultValue={"Search Case"}
            minCharacters={3}
            onSearchChange={(e, output) => {
              setSearchCaseVal(output.value || "")
              if (output.value && output.value.length >= 3) {
                let searchResult = hemoData.filter((d: any) => d.CASE_ID.toString().includes(output.value))
                stateUpdateWrapperUseJSON(caseSearchResult, searchResult, setCaseSearchResult);
              }
            }
            }
            results={caseSearchResult.map(d => { return { title: d.CASE_ID } })}
            onResultSelect={(e, resultSelection) => {
              const selectedPat = caseSearchResult.filter((d: any) => d.CASE_ID === resultSelection.result.title)[0]
              console.log(selectedPat)
              const newSingleCasePoint: SingleCasePoint = {
                visitNum: selectedPat.VISIT_ID,
                caseId: selectedPat.CASE_ID,
                YEAR: selectedPat.YEAR,
                SURGEON_ID: selectedPat.SURGEON_ID,
                ANESTHOLOGIST_ID: selectedPat.ANESTHOLOGIST_ID,
                patientID: selectedPat.PATIENT_ID,
                DATE: selectedPat.DATE
              };
              actions.selectPatient(newSingleCasePoint);
              setSearchCaseVal("")
            }
            }
            value={searchCaseVal}
          />

        </Container>
      </Grid.Row>

      <Grid.Row centered >
        <Container style={{ overflow: "overlay", height: "35vh" }} >
          <Search
            placeholder="Search a Procedure"
            minCharacters={3}
            onSearchChange={(e, output) => {
              setSearchSurgeryVal(output.value || "")
              if (output.value && output.value.length >= 3) {
                let searchResult = surgeryList.filter(d => d.value.includes(output.value))
                //setsurgerySearchResult(searchResult);
                stateUpdateWrapperUseJSON(surgerySearchResult, searchResult, setsurgerySearchResult)
              }
            }
            }
            results={surgerySearchResult.map(d => { return { title: d.value } })}
            onResultSelect={(e, d) => {
              if (!filterSelection.includes(d.result)) { actions.filterSelectionChange(d.result.title) } setSearchSurgeryVal("")
            }
            }
            value={searchSurgeryVal}
          />
          <List relaxed divided >

            <List.Item key={"filter-header"}
              content={
                <Header><ListSVG id="Procedure-SVG" ref={svgRef}>
                  <text alignmentBaseline="hanging" x={0} y={0} fontSize="medium">Procedures</text>
                  <rect
                    x={caseScale().range()[0]}
                    y={0}
                    width={caseScale().range()[1] - caseScale().range()[0]}
                    height={13}
                    fill={postop_color} />
                  <text x={caseScale().range()[0] + 1} y={11} fontSize={14} textAnchor="start" alignmentBaseline="baseline" fill="white">0</text>
                  <text x={caseScale().range()[1]} y={11} fontSize={14} textAnchor="end" alignmentBaseline="baseline" fill="white">{maxCaseCount}</text>
                </ListSVG></Header>}
            />

            {itemSelected.map((listItem: any) => {
              if (listItem.value) {
                return (
                  <ListIT key={listItem.value} isSelected={true} style={{ cursor: "pointer" }} onClick={() => { actions.filterSelectionChange(listItem.value) }}
                    content={<ListSVG >
                      <text alignmentBaseline="hanging" x={0} y={0}>{listItem.value}</text>
                      <SurgeryRect
                        x={caseScale().range()[0]}
                        width={caseScale()(listItem.count) - caseScale().range()[0]}
                      />
                    </ListSVG>} />
                )
              }
            })}
            {/* {itemSelected.length > 0 ? (<List.Item />) : (<></>)} */}
            {itemUnselected.map((listItem: any) => {

              if (listItem.value) {
                return (
                  <ListIT key={listItem.value} isSelected={false} style={{ cursor: "pointer" }} content={
                    <ListSVG >
                      <text alignmentBaseline="hanging" x={0} y={0}>{listItem.value}</text>
                      <SurgeryRect
                        x={caseScale().range()[0]}
                        width={caseScale()(listItem.count) - caseScale().range()[0]}
                      />
                    </ListSVG>}
                    onClick={() => { actions.filterSelectionChange(listItem.value) }} />
                )
              }
            })}
          </List>
        </Container>
      </Grid.Row>


    </Grid>
  );
}
export default inject("store")(observer(SideBar));

const ListSVG = styled.svg`
  height: 15px;
  padding-left:5px;
  width:95%
  
`;
// width: ${surgeryBarEnding};

interface ListITProps {
  isSelected: boolean;
}
const ListIT = styled(List.Item) <ListITProps>`
  background:${props => props.isSelected ? "#e2a364" : 'none'};
  &:hover{
    background:#f2d4b6;
  }
`

const FilterListIT = styled(List.Item)`
  text-align: left;
  padding-left: 20px;
  cursor: pointer;
  &:hover{
    text-shadow: 2px 2px 5px ${highlight_orange};
  }
`

const SurgeryRect = styled(`rect`)`
  y:0;
  height:13px;
  fill-opacity:0.4;
  fill:${postop_color};
  &:hover{
    fill-opacity:0.6
  }
`