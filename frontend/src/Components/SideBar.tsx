import React, { FC, useEffect, useState,useMemo } from "react";
import Store from "../Interfaces/Store";
import styled from 'styled-components'
import { Menu,  Dropdown, Grid, Container,Message, List } from "semantic-ui-react";
import { inject, observer } from "mobx-react";
import { scaleLinear } from "d3";

interface OwnProps{
    store?: Store;
}

export type Props = OwnProps;

const SideBar: FC<Props> = ({ store }: Props) => { 
    const { totalCaseCount, actualYearRange, filterSelection } = store!;
  const [procedureList, setProcedureList] = useState({ result: [] });
  const[maxCaseCount, setMaxCaseCount] = useState(0)

    async function fetchProcedureList() {
      const res = await fetch("http://localhost:8000/api/get_attributes");
      const data = await res.json();
      setProcedureList(data);
      let tempMaxCaseCount = 0
      data.result.forEach((d: any) => {
        tempMaxCaseCount = d.count > tempMaxCaseCount ? d.count : tempMaxCaseCount;
      })
      data.result.sort((a:any,b:any)=>b.count-a.count)
      setMaxCaseCount(tempMaxCaseCount)
    }

    useEffect(() => {
      fetchProcedureList();
    }, []);
  
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
            <Message.Item>Case Count:{totalCaseCount}</Message.Item>
            <Message.Item>
              Selected Year Range: {actualYearRange[0]} - {actualYearRange[1]}
            </Message.Item>
          </Message>
        </Grid.Row>
        <Grid.Row style={{padding:"10px"}}>
          <Container style={{ overflow: "auto",height:"80vh" }}>
            <List relaxed >
              {procedureList.result.map((listItem: any) => {
                if (listItem.value) {
                  return (
                    <ListIT style={{cursor:"pointer"}} onClick={() => { console.log(listItem.value)}}>
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

const ListIT = styled(List.Item)`
  background:none;
  &:hover{
    background:#d0e4f5;
  }
`