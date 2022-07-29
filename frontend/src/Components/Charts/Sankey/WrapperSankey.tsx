import { Chip, Typography } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import Chart from 'react-google-charts';
import { DragDropContext, Draggable, DraggableLocation, Droppable, DropResult } from 'react-beautiful-dnd';
import { DropdownInputTypes } from "../../../Interfaces/Types/DropdownInputType";
import { useStyles } from "../../../Presets/StyledComponents";
import { DataContext } from "../../../App";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { BloodProductGroup, ManualInfinity } from "../../../Presets/Constants";
import { min, max } from "d3";

type Props = {

};



const WrapperSankey: FC<Props> = () => {

  const styles = useStyles();
  const hemoData = useContext(DataContext);

  const [sankeyData, updateSankeyData] = useState<(string | number)[][]>([]);

  /**
* Moves an item from one list to another list.
*/
  const move = (source: DropdownInputTypes[], destination: DropdownInputTypes[], droppableSource: DraggableLocation, droppableDestination: DraggableLocation) => {
    const sourceClone = Array.from(source);
    const destClone = Array.from(destination);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result: any = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
  };

  const PRESET = [
    { value: "B12", key: "B12", text: "B12" },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "PRBC_UNITS", key: "PRBC_UNITS", text: "Intraoperative RBCs Transfused" },
    { value: "FFP_UNITS", key: "FFP_UNITS", text: "Intraoperative FFP Transfused" },
    { value: "VENT", key: "VENT", text: "Ventilator Over 24hr" },
    { value: "DEATH", key: "DEATH", text: "Death" },
    { value: "CELL_SAVER_ML", key: "CELL_SAVER_ML", text: "Cell Salvage Volume" },
  ];

  const PRESET_NONSELECTED = [
    { value: "STROKE", key: "STROKE", text: "Stroke" },
    { value: "ECMO", key: "ECMO", text: "ECMO" },
    { value: "AMICAR", key: "AMICAR", text: "Amicar" },
    { value: "PLT_UNITS", key: "PLT_UNITS", text: "Intraoperative Platelets Transfused" },
    { value: "CRYO_UNITS", key: "CRYO_UNITS", text: "Intraoperative Cryo Transfused" }
  ];


  // with the first element being the attribute selected, and second element not selected
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
      const result = move(attributeOptions[sInd], attributeOptions[dInd], source, destination);
      newState[sInd] = result[sInd];
      newState[dInd] = result[dInd];
    }
    stateUpdateWrapperUseJSON(attributeOptions, newState, setAttributeOptions);
  };


  useEffect(() => {

    //construct data

    let newSankeyData: (string | number)[][] = [['From', 'To', 'Weight']];

    const sankeyObj: any = {};

    const allOptions = attributeOptions[0].map(({ key }) => {
      if (!BloodProductGroup[key]) {
        return [key, ['true', 'false']];
      } else {
        return [key, BloodProductGroup[key].map((d, i) => {
          if (i === 0) {
            return `${d}`;
          } else {
            if (BloodProductGroup[key][i - 1] + 1 === d) {
              return `${d}`;
            }
            return `${BloodProductGroup[key][i - 1] + 1}-${d}`;
          }
        }).concat([`${BloodProductGroup[key][BloodProductGroup[key].length - 1] + 1}+`])];
      }
    });



    allOptions.forEach((attributePair, index) => {
      if (index < allOptions.length - 1) {
        const attributeOneOptions = attributePair[1] as string[];
        const nextAttributeOptions = allOptions[index + 1][1] as string[];
        attributeOneOptions.forEach((optionOne) => {
          sankeyObj[`${attributePair[0]}-${optionOne}`] = {};
          nextAttributeOptions.forEach((optionTwo) => {
            sankeyObj[`${attributePair[0]}-${optionOne}`][`${allOptions[index + 1][0]}-${optionTwo}`] = 0;
            // newSankeyData.push([`${attributePair[0]}-${optionOne}`, `${allOptions[index + 1][0]}-${optionTwo}`, 0]);
          });
        });
      }
    });


    hemoData.forEach((singleCase) => {
      attributeOptions[0].forEach(({ key }, index) => {
        if (index < attributeOptions[0].length - 1) {
          let from = '';
          let to = '';

          const nextKey = attributeOptions[0][index + 1]['key'];

          if (BloodProductGroup[key]) {
            // Add grouping of units
            // easiest case: the units is bigger than all grouping

            // from = singleCase[key] < BloodProductGroup[key] ? `${key}-${singleCase[key]}` : `${key}-${BloodProductGroup[key]}+`;
            from = findBloodGroup(singleCase[key] as number, key);
          } else {
            from = singleCase[key] ? `${key}-true` : `${key}-false`;
          }
          if (BloodProductGroup[nextKey]) {
            // Add grouping of units
            // to = singleCase[nextKey] < BloodProductGroup[nextKey] ? `${nextKey}-${singleCase[nextKey]}` : `${nextKey}-${BloodProductGroup[nextKey]}+`;
            to = findBloodGroup(singleCase[nextKey] as number, nextKey);
          } else {
            to = singleCase[nextKey] ? `${nextKey}-true` : `${nextKey}-false`;
          }
          sankeyObj[from][to] += 1;
        }
      });
    });

    allOptions.forEach(([attributeName, options], index) => {
      if (index < allOptions.length - 1) {
        const [nextKey, nextOptions] = allOptions[index + 1];

        (options as string[]).forEach((option) => {
          (nextOptions as string[]).forEach((nextOption) => {
            const from = `${attributeName}-${option}`;
            const to = `${nextKey}-${nextOption}`;
            newSankeyData.push([from, to, sankeyObj[from][to]]);
          });

        });
      }
    });

    //filter out empty entries
    //COMMENTED this out to ensure the ordering of the entries
    // newSankeyData = newSankeyData.filter(d => d[2] !== 0);
    // console.log(newSankeyData);
    stateUpdateWrapperUseJSON(sankeyData, newSankeyData, updateSankeyData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeOptions, hemoData]);



  return (
    <div style={{ minHeight: 800, width: "100%", padding: 10 }}>
      <Typography className={`${styles.centerAlignment}`} variant="h6">
        Outcome, Transfusion, and Result Distribution
      </Typography>
      <div style={{ paddingTop: 5 }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {attributeOptions.map((options, ind) => (
            <Droppable
              direction="horizontal"
              key={`${ind}-droppable`}
              droppableId={`${ind}`}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef}
                  className={styles.root}
                  style={{ display: "flex", minHeight: '40px' }}
                  {...provided.droppableProps}
                >
                  <label className="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-shrink MuiFormLabel-filled">{ind === 0 ? "Included" : "Not Included"}</label>
                  {options.map((item, index) => (
                    <Draggable
                      key={`${item.key}-draggable`}
                      draggableId={item.key}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Chip
                          label={item.text}
                          clickable
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps} />


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
      {sankeyData.length > 0 ?
        <Chart
          width={'1000px'}
          height={'600px'}
          chartType="Sankey"
          options={{ sankey: { iterations: 0 } }}
          loader={<div>Loading Chart</div>}
          data={sankeyData}
          rootProps={{ 'data-testid': '1' }}
        />
        : <></>}

    </div>
  );
};

export default observer(WrapperSankey);

const reorder = (list: { value: string, key: string, text: string; }[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const findBloodGroup = (inputValue: number, bloodName: string) => {
  const largestInGroup = BloodProductGroup[bloodName][BloodProductGroup[bloodName].length - 1];
  // the result is bigger than the grouping
  if (inputValue > largestInGroup) {
    return `${bloodName}-${largestInGroup + 1}+`;
  }
  // the result is the first value, normally 0
  if (inputValue === BloodProductGroup[bloodName][0]) {
    return `${bloodName}-${BloodProductGroup[bloodName][0]}`;
  }
  // the value lands
  const ender = min(BloodProductGroup[bloodName].filter(d => d >= inputValue)) || ManualInfinity;
  const begin = (max(BloodProductGroup[bloodName].filter(d => d < inputValue)) || 0) + 1;
  if (ender === begin) {
    return `${bloodName}-${ender}`;
  } else {
    return `${bloodName}-${begin}-${ender}`;
  }

};