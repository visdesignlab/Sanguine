import { Chip } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useCallback, useState } from "react";
import Chart from 'react-google-charts';
import { DragDropContext, Draggable, DraggableLocation, Droppable, DropResult } from 'react-beautiful-dnd';

import { OutcomeOptions } from "../../../Presets/DataDict";
import { DropdownInputTypes } from "../../../Interfaces/Types/DropdownInputType";
import { useStyles } from "../../../Presets/StyledComponents";



type Props = {

};



const WrapperSankey: FC<Props> = () => {

    const sankeyData = [
        ['From', 'To', 'Weight'],
        ['A', 'X', 5],
        ['A', 'Y', 7],
        ['A', 'Z', 6],
        ['B', 'X', 2],
        ['B', 'Y', 9],
        ['B', 'Z', 4],
    ];

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


    // with the first element being the attribute selected, and second element not selected
    const [attributeOptions, setAttributeOptions] = useState([[], OutcomeOptions]);

    function onDragEnd(result: DropResult) {
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
        setAttributeOptions(newState);
    }
    const styles = useStyles();



    return (
        <div className="container mt-5">
            <div>
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
                                                <Chip label={item.text} ref={provided.innerRef}
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
            <Chart
                width={700}
                height={'350px'}
                chartType="Sankey"
                loader={<div>Loading Chart</div>}
                data={sankeyData}
                rootProps={{ 'data-testid': '1' }}
            />
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