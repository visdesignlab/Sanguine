import { Grid, Tabs, Divider, Tab } from "@mui/material";
import { max } from "d3";
import { observer } from "mobx-react";
import { FC, useEffect, useState } from "react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { ProcedureEntry } from "../../../Interfaces/Types/DataTypes";
import FilterBoard from "../FilterInterface/FilterBoard";
import TabPanel from "../TabPanel";
import CurrentSelected from "./CurrentSelected";
import CurrentView from "./CurrentView";
import SurgeryListViewer from "./SurgeryListViewer";
import SurgerySearchBar from "./SurgerySearchBar";

type Props = { totalCaseNum: number; };

const LeftToolBox: FC<Props> = ({ totalCaseNum }: Props) => {

  const [surgeryList, setSurgeryList] = useState<ProcedureEntry[]>([]);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const handleChange = (event: any, newValue: any) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    fetch(`${process.env.REACT_APP_QUERY_URL}get_procedure_counts`)
      .then(response => response.json())
      .then(function (data) {
        //Process the result into the data type required.
        const result = data.result.map((procedureInput: any) => {
          const procedureOverlapList = Object.keys(procedureInput.overlapList).map(subProcedureName => {
            return {
              procedureName: subProcedureName,
              count: procedureInput.overlapList[subProcedureName],
            };
          });
          procedureOverlapList.sort((a: ProcedureEntry, b: ProcedureEntry) => {
            if (a.procedureName.includes('Only')) {
              return -1;
            } else if (b.procedureName.includes('Only')) {
              return 1;
            }

            return b.count - a.count;
          });
          return {
            procedureName: procedureInput.procedureName,
            count: procedureInput.count,
            overlapList: procedureOverlapList
          };
        });
        let tempSurgeryList: ProcedureEntry[] = result;
        let tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);

        tempMaxCaseCount = 10 ** (tempMaxCaseCount.toString().length);
        setMaxCaseCount(tempMaxCaseCount);
        tempSurgeryList.sort((a: ProcedureEntry, b: ProcedureEntry) => b.count - a.count);

        stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList);
      }).catch(r => {
        console.log("failed to fetch required data");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (

    <Grid >
      <Tabs value={tabValue}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        centered>
        <Tab label="Current View" />
        <Tab label="Filter" />
      </Tabs>
      <TabPanel
        value={tabValue}
        index={0}
        children={
          <Grid container >
            <CurrentView totalCaseNum={totalCaseNum} />
            <Divider orientation="horizontal" style={{ width: '98%', }} />
            <CurrentSelected />
            <Divider orientation="horizontal" style={{ width: '98%' }} />
            <SurgerySearchBar surgeryList={surgeryList} />
            <Divider orientation="horizontal" style={{ width: '98%' }} />
            <SurgeryListViewer surgeryList={surgeryList} maxCaseCount={maxCaseCount} />
          </Grid>
        }
        styling={undefined}
      />
      <TabPanel
        value={tabValue}
        index={1}
        children={
          <FilterBoard />
        }
        styling={{ height: "85vh" }}
      />
    </Grid>);

};

export default observer(LeftToolBox);


