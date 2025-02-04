import { Typography } from '@mui/material';
import { observer } from 'mobx-react';
import {
  useContext, useEffect, useState,
} from 'react';
import Chart from 'react-google-charts';
import {
  DragDropContext, Draggable, DraggableLocation, Droppable, DropResult,
} from 'react-beautiful-dnd';
import { range } from 'd3-array';
import { DropdownInputTypes } from '../../../Interfaces/Types/DropdownInputType';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import { BloodProductCap } from '../../../Presets/Constants';
import { FilterChip } from '../../../Presets/StyledComponents';
import Store from '../../../Interfaces/Store';

const reorder = (list: { value: string, key: string }[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

function WrapperSankey() {
  const store = useContext(Store);
  const { filteredCases } = store;

  const [sankeyData, updateSankeyData] = useState<(string | number)[][]>([]);

  /**
  * Moves an item from one list to another list.
  */
  const move = (source: DropdownInputTypes[], destination: DropdownInputTypes[], droppableSource: DraggableLocation, droppableDestination: DraggableLocation) => {
    const sourceClone = Array.from(source);
    const destClone = Array.from(destination);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result = {
      [droppableSource.droppableId]: sourceClone,
      [droppableDestination.droppableId]: destClone,
    };

    return result;
  };

  const PRESET = [
    { key: 'B12', value: 'B12' },
    { key: 'IRON', value: 'IRON' },
    { key: 'TXA', value: 'Tranexamic Acid' },
    { key: 'PRBC_UNITS', value: 'Intraoperative RBCs Transfused' },
    { key: 'FFP_UNITS', value: 'Intraoperative FFP Transfused' },
    { key: 'VENT', value: 'Ventilator Over 24hr' },
    { key: 'DEATH', value: 'Death' },
  ];

  const PRESET_NONSELECTED = [
    { key: 'STROKE', value: 'Stroke' },
    { key: 'ECMO', value: 'ECMO' },
    { key: 'AMICAR', value: 'Amicar' },
    { key: 'PLT_UNITS', value: 'Intraoperative Platelets Transfused' },
    { key: 'CRYO_UNITS', value: 'Intraoperative Cryo Transfused' },
    // { value: "CELL_SAVER_ML", key: "CELL_SAVER_ML", value: "Cell Salvage Volume (ml)" }
  ];

  // with the first element being the attribute selected, and second element not selected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attributeOptions, setAttributeOptions] = useState([PRESET, PRESET_NONSELECTED]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }
    const sInd = +source.droppableId;
    const dInd = +destination.droppableId;
    const newState = [...attributeOptions];
    if (sInd === dInd) {
      const items = reorder(attributeOptions[sInd], source.index, destination.index);
      newState[sInd] = items;
    } else {
      const res = move(attributeOptions[sInd], attributeOptions[dInd], source, destination);
      newState[sInd] = res[sInd];
      newState[dInd] = res[dInd];
    }
    stateUpdateWrapperUseJSON(attributeOptions, newState, setAttributeOptions);
  };

  useEffect(() => {
    // construct data

    let newSankeyData: (string | number)[][] = [['From', 'To', 'Weight']];

    const sankeyObj: { [key: string]: { [key: string]: number } } = {};

    const allOptions = attributeOptions[0].map(({ key }) => {
      if (!BloodProductCap[key as never]) {
        return [key, ['true', 'false']];
      }
      return [key, range(0, BloodProductCap[key as never] + 1).map((d, i) => (i === BloodProductCap[key as never] ? `${d}+` : `${d}`))];
    });

    allOptions.forEach((attributePair, idx) => {
      if (idx < allOptions.length - 1) {
        const attributeOneOptions = attributePair[1] as string[];
        const nextAttributeOptions = allOptions[idx + 1][1] as string[];
        attributeOneOptions.forEach((optionOne) => {
          sankeyObj[`${attributePair[0]}-${optionOne}`] = {};
          nextAttributeOptions.forEach((optionTwo) => {
            sankeyObj[`${attributePair[0]}-${optionOne}`][`${allOptions[idx + 1][0]}-${optionTwo}`] = 0;
            // newSankeyData.push([`${attributePair[0]}-${optionOne}`, `${allOptions[idx + 1][0]}-${optionTwo}`, 0]);
          });
        });
      }
    });

    // filteredCases.forEach((singleCase) => {
    //   attributeOptions[0].forEach(({ key }, idx) => {
    //     if (idx < attributeOptions[0].length - 1) {
    //       let from = '';
    //       let to = '';

    //       const nextKey = attributeOptions[0][idx + 1].key;

    //       if (BloodProductCap[key]) {
    //         from = singleCase[key] < BloodProductCap[key] ? `${key}-${singleCase[key]}` : `${key}-${BloodProductCap[key]}+`;
    //       } else {
    //         from = singleCase[key] ? `${key}-true` : `${key}-false`;
    //       }
    //       if (BloodProductCap[nextKey]) {
    //         to = singleCase[nextKey] < BloodProductCap[nextKey] ? `${nextKey}-${singleCase[nextKey]}` : `${nextKey}-${BloodProductCap[nextKey]}+`;
    //       } else {
    //         to = singleCase[nextKey] ? `${nextKey}-true` : `${nextKey}-false`;
    //       }
    //       // sankeyObj[from][to] += 1;
    //     }
    //   });
    // });

    allOptions.forEach(([attributeName, options], idx) => {
      if (idx < allOptions.length - 1) {
        const [nextKey, nextOptions] = allOptions[idx + 1];

        (options as string[]).forEach((option) => {
          (nextOptions as string[]).forEach((nextOption) => {
            const from = `${attributeName}-${option}`;
            const to = `${nextKey}-${nextOption}`;
            newSankeyData.push([from, to, sankeyObj[from][to]]);
          });
        });
      }
    });

    // filter out empty entries
    newSankeyData = newSankeyData.filter((d) => d[2] !== 0);

    stateUpdateWrapperUseJSON(sankeyData, newSankeyData, updateSankeyData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeOptions, filteredCases]);

  return (
    <div style={{ minHeight: 800, width: '100%', padding: 10 }}>
      <Typography style={{ textAlign: 'center' }} variant="h6">
        Outcome, Transfusion, and Result Distribution
      </Typography>
      <div style={{ paddingTop: 5 }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {attributeOptions.map((options, idx) => (
            <Droppable
              direction="horizontal"
              key={`${idx}-droppable`}
              droppableId={`${idx}`}
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  style={{ display: 'flex', minHeight: '40px' }}
                  {...provided.droppableProps}
                >
                  <label
                    style={{ alignSelf: 'center' }}
                    className="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-shrink MuiFormLabel-filled"
                  >
                    {idx === 0 ? 'Included' : 'Not Included'}
                  </label>
                  {options.map((item, idx2) => (
                    <Draggable
                      key={`${item.key}-draggable`}
                      draggableId={item.key}
                      index={idx2}
                    >
                      {(providedDrag) => (
                        <FilterChip
                          label={item.value}
                          clickable
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                          {...providedDrag.dragHandleProps}
                        />

                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </DragDropContext>
      </div>
      {
                sankeyData.length > 0
                  ? (
                    <Chart
                      width="1000px"
                      height="600px"
                      chartType="Sankey"
                      loader={<div>Loading Chart</div>}
                      data={sankeyData}
                      rootProps={{ 'data-testid': '1' }}
                    />
                  )
                  : null
            }

    </div>
  );
}

export default observer(WrapperSankey);
