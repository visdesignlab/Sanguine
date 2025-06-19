import { Tabs, Divider, Tab } from '@mui/material';
import { max } from 'd3';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { ProcedureEntry } from '../../../Interfaces/Types/DataTypes';
import FilterBoard from '../FilterInterface/FilterBoard';
import TabPanel from '../TabPanel';
import CurrentSelected from './CurrentSelected';
import CurrentView from './CurrentView';
import SurgeryListViewer from './SurgeryListViewer';
import SurgerySearchBar from './SurgerySearchBar';

function LeftToolBox() {
  const [surgeryList, setSurgeryList] = useState<ProcedureEntry[]>([]);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const handleChange = (_: unknown, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    async function fetchData() {
      const procedureFetch = await fetch(`${import.meta.env.VITE_QUERY_URL}get_procedure_counts`);
      const procedureInput = await procedureFetch.json() as { result: { procedureName: string, procedureCodes: string[], count: number, overlapList: { [key: string]: number } }[] };

      // Process the result into the data type required.
      const result = procedureInput.result.map((procedure) => {
        console.log('Procedure:', procedure);

        // Overlap List
        const procedureOverlapList = Object.keys(procedure.overlapList).map((subProcedureName) => {
          // Strip "Only " prefix for lookup
          const baseName = subProcedureName.startsWith('Only ') ? subProcedureName.replace(/^Only\s+/, '') : subProcedureName;
          return {
            procedureName: subProcedureName,
            count: procedure.overlapList[subProcedureName],
            codes: procedureInput.result.find((p) => p.procedureName === baseName)?.procedureCodes || [],
          }});
        procedureOverlapList.sort((a, b) => {
          if (a.procedureName.includes('Only')) {
            return -1;
          } if (b.procedureName.includes('Only')) {
            return 1;
          }

          return b.count - a.count;
        });
        return {
          procedureName: procedure.procedureName,
          count: procedure.count,
          codes: procedure.procedureCodes,
          overlapList: procedureOverlapList,
        };
      });
      const tempSurgeryList: ProcedureEntry[] = result;
      let tempMaxCaseCount = (max(result, (d) => d.count)) || 0;

      tempMaxCaseCount *= 1.1;
      setMaxCaseCount(tempMaxCaseCount);
      tempSurgeryList.sort((a: ProcedureEntry, b: ProcedureEntry) => b.count - a.count);

      stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Tabs
        value={tabValue}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        centered
      >
        <Tab label="Current View" />
        <Tab label="Filter" />
      </Tabs>
      <TabPanel
        value={tabValue}
        index={0}
      >
        <CurrentView />
        <Divider orientation="horizontal" />
        <CurrentSelected />
        <Divider orientation="horizontal" />
        <SurgerySearchBar surgeryList={surgeryList} />
        <Divider orientation="horizontal" />
        <SurgeryListViewer surgeryList={surgeryList} maxCaseCount={maxCaseCount} />
      </TabPanel>
      <TabPanel
        value={tabValue}
        index={1}
      >
        <FilterBoard />
      </TabPanel>
    </>
  );
}

export default observer(LeftToolBox);
