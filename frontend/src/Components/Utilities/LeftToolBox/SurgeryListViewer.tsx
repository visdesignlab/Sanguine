import { axisTop, scaleLinear, select } from 'd3';
import { observer } from 'mobx-react';
import {
  useCallback, useContext, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { Box } from '@mui/material';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { ProcedureEntry } from '../../../Interfaces/Types/DataTypes';
import { InheritWidthGrid } from '../../../Presets/StyledComponents';
import SurgeryRow from './SurgeryRow';

type Props = {
    surgeryList: ProcedureEntry[];
    maxCaseCount: number;
};

function SurgeryListViewer({ surgeryList, maxCaseCount }: Props) {
  const store = useContext(Store);
  const [width, setWidth] = useState(0);
  const [itemSelected, setItemSelected] = useState<ProcedureEntry[]>([]);
  const [itemUnselected, setItemUnselected] = useState<ProcedureEntry[]>([]);
  const [expandedList, setExpandedList] = useState<string[]>([]);

  const caseScale = useCallback(() => scaleLinear().domain([0, maxCaseCount]).range([2, 0.3 * width - 15]), [maxCaseCount, width]);

  const surgeryViewRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (surgeryViewRef.current) {
      setWidth((surgeryViewRef.current).offsetWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeryViewRef]);

  window.addEventListener('resize', () => {
    if (surgeryViewRef.current) {
      setWidth((surgeryViewRef.current).offsetWidth);
    }
  });

  select('#surgeryCaseScale').call(axisTop(caseScale()).ticks(3) as never);

  useEffect(() => {
    const newItemSelected: ProcedureEntry[] = [];
    const newItemUnselected: ProcedureEntry[] = [];
    surgeryList.forEach((item: ProcedureEntry) => {
      if (store.provenanceState.proceduresSelection.filter((d) => d.procedureName === item.procedureName).length > 0) {
        newItemSelected.push(item);
      } else {
        newItemUnselected.push(item);
      }
    });
    stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected);
    stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.provenanceState.proceduresSelection, surgeryList]);

  const findIfSubProcedureSelected = (subProcedureName: string, parentProcedureName: string) => {
    if (store.provenanceState.proceduresSelection.filter((d) => d.procedureName === parentProcedureName).length > 0) {
      const { overlapList } = store.provenanceState.proceduresSelection.filter((d) => d.procedureName === parentProcedureName)[0];
      if (overlapList) {
        return overlapList.filter((d) => d.procedureName === subProcedureName).length > 0;
      }
    }
    return false;
  };

  const findIfSelectedSubProcedureExist = (parentProcedureName: string) => {
    if (store.provenanceState.proceduresSelection.filter((d) => d.procedureName === parentProcedureName).length > 0) {
      const { overlapList } = store.provenanceState.proceduresSelection.filter((d) => d.procedureName === parentProcedureName)[0];
      if (overlapList) {
        return overlapList.length > 0;
      }
    }
    return false;
  };

  return (
    <InheritWidthGrid item>
      <Box ref={surgeryViewRef} style={{ height: '28vh', overflow: 'auto' }}>
        <table style={{ width: '95%', tableLayout: 'fixed', marginLeft: 8 }}>
          <colgroup>
            <col span={1} style={{ width: '60%' }} />
            <col span={1} style={{ width: '40%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{`Procedures (${surgeryList.length})`}</th>
              <th>
                <svg height={18} style={{ paddingLeft: '5px' }} width="100%">
                  <g id="surgeryCaseScale" transform="translate(0 ,17)" />
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            {itemSelected.flatMap((listItem: ProcedureEntry) => {
              if (expandedList.includes(listItem.procedureName) && listItem.overlapList) {
                return [<SurgeryRow
                  key={listItem.procedureName}
                  expandedList={expandedList}
                  setExpandedList={setExpandedList}
                  listItem={listItem}
                  isSelected
                  isSubSurgery={false}
                  highlighted={!findIfSelectedSubProcedureExist(listItem.procedureName)}
                  caseScaleDomain={JSON.stringify(caseScale().domain())}
                  width={width}
                  caseScaleRange={JSON.stringify(caseScale().range())}
                />,

                ].concat(listItem.overlapList.map((subItem: ProcedureEntry) => (
                  <SurgeryRow
                    key={subItem.procedureName}
                    expandedList={expandedList}
                    setExpandedList={setExpandedList}
                    listItem={subItem}
                    isSelected={findIfSubProcedureSelected(subItem.procedureName, listItem.procedureName)}
                    isSubSurgery
                    highlighted={findIfSubProcedureSelected(subItem.procedureName, listItem.procedureName)}
                    parentSurgery={listItem}
                    caseScaleDomain={JSON.stringify(caseScale().domain())}
                    width={width}
                    caseScaleRange={JSON.stringify(caseScale().range())}
                  />
                )));
              }
              return [
                <SurgeryRow
                  key={listItem.procedureName}
                  expandedList={expandedList}
                  setExpandedList={setExpandedList}
                  listItem={listItem}
                  isSelected
                  isSubSurgery={false}
                  highlighted
                  caseScaleDomain={JSON.stringify(caseScale().domain())}
                  width={width}
                  caseScaleRange={JSON.stringify(caseScale().range())}
                />,
              ];
            })}
            {itemUnselected.flatMap((listItem: ProcedureEntry) => {
              if (expandedList.includes(listItem.procedureName) && listItem.overlapList) {
                return [<SurgeryRow
                  key={listItem.procedureName}
                  listItem={listItem}
                  expandedList={expandedList}
                  setExpandedList={setExpandedList}
                  isSelected={false}
                  isSubSurgery={false}
                  highlighted={false}
                  caseScaleDomain={JSON.stringify(caseScale().domain())}
                  width={width}
                  caseScaleRange={JSON.stringify(caseScale().range())}
                />,
                ].concat(listItem.overlapList.map((subItem: ProcedureEntry) => (
                  <SurgeryRow
                    key={subItem.procedureName}
                    listItem={subItem}
                    isSelected={false}
                    expandedList={expandedList}
                    setExpandedList={setExpandedList}
                    isSubSurgery
                    highlighted={false}
                    parentSurgery={listItem}
                    caseScaleDomain={JSON.stringify(caseScale().domain())}
                    width={width}
                    caseScaleRange={JSON.stringify(caseScale().range())}
                  />
                )));
              }
              return [<SurgeryRow
                key={listItem.procedureName}
                listItem={listItem}
                expandedList={expandedList}
                setExpandedList={setExpandedList}
                isSelected={false}
                isSubSurgery={false}
                highlighted={false}
                caseScaleDomain={JSON.stringify(caseScale().domain())}
                width={width}
                caseScaleRange={JSON.stringify(caseScale().range())}
              />,
              ];
            })}
          </tbody>
        </table>

      </Box>
    </InheritWidthGrid>
  );
}

export default observer(SurgeryListViewer);
