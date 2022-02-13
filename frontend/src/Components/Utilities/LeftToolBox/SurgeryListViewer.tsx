import { Container, Grid } from "@material-ui/core";
import { axisTop, scaleLinear, select } from "d3";
import { observer } from "mobx-react";
import { useCallback, useContext, useEffect } from "react";
import { FC, useLayoutEffect, useRef, useState } from "react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { ProcedureEntry } from "../../../Interfaces/Types/DataTypes";
import { SurgeryDiv, SurgeryListComp, SurgeryNumText, useStyles } from "../../../Presets/StyledComponents";
import { ListSVG, SurgeryRect } from "../../../Presets/StyledSVGComponents";

type Props = {
    surgeryList: ProcedureEntry[];
    maxCaseCount: number;
};

const SurgeryListViewer: FC<Props> = ({ surgeryList, maxCaseCount }: Props) => {
    const store = useContext(Store);
    const [width, setWidth] = useState(0);
    const [itemSelected, setItemSelected] = useState<ProcedureEntry[]>([]);
    const [itemUnselected, setItemUnselected] = useState<ProcedureEntry[]>([]);

    const styles = useStyles();

    const caseScale = useCallback(() => {
        const caseScale = scaleLinear().domain([0, maxCaseCount]).range([2, 0.3 * width - 15]);
        return caseScale;
    }, [maxCaseCount, width]);


    const surgeryViewRef = useRef(null);

    useLayoutEffect(() => {
        if (surgeryViewRef.current) {
            setWidth((surgeryViewRef.current as any).offsetWidth);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [surgeryViewRef]);

    window.addEventListener("resize", () => {
        if (surgeryViewRef.current) {
            setWidth((surgeryViewRef.current as any).offsetWidth);
        }
    });

    select('#surgeryCaseScale').call(axisTop(caseScale()).ticks(3) as any);

    useEffect(() => {
        let newItemSelected: ProcedureEntry[] = [];
        let newItemUnselected: ProcedureEntry[] = [];
        surgeryList.forEach((item: ProcedureEntry) => {
            if (store.state.proceduresSelection.filter(d => d.procedureName === item.procedureName).length > 0) {
                newItemSelected.push(item);
            }
            else {
                newItemUnselected.push(item);
            }
        });
        stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected);
        stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.state.proceduresSelection, surgeryList]);

    const findIfSubProcedureSelected = (subProcedureName: string, parentProcedureName: string) => {
        if (store.state.proceduresSelection.filter(d => d.procedureName === parentProcedureName).length > 0) {
            const overlapList = store.state.proceduresSelection.filter(d => d.procedureName === parentProcedureName)[0].overlapList;
            if (overlapList) {
                return overlapList.filter(d => d.procedureName === subProcedureName).length > 0;
            }
        }
        return false;
    };


    const surgeryRow = (listItem: ProcedureEntry, isSelected: boolean, isSubSurgery: boolean, parentSurgery?: string) => {
        return (
            <SurgeryListComp key={`${isSubSurgery ? parentSurgery! + '-' : ''}${listItem.procedureName}`} isSelected={isSelected}
                onClick={() => {
                    if (!isSubSurgery) {
                        store.selectionStore.updateProcedureSelection(listItem, isSelected);
                    } else {
                        store.selectionStore.updateProcedureSelection(listItem, false, parentSurgery);
                    }
                }}>

                <SurgeryDiv >
                    {isSubSurgery ? <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{listItem.procedureName}</> : <>{isSelected ? `▼` : `►`}{listItem.procedureName}</>}
                </SurgeryDiv>
                <td>
                    <ListSVG widthInput={0.3 * width}>
                        <SurgeryRect
                            x={caseScale().range()[0]}
                            width={caseScale()(listItem.count) - caseScale().range()[0]}
                        />
                        <SurgeryNumText y={9} x={caseScale().range()[1]}>{listItem.count}</SurgeryNumText>
                    </ListSVG>
                </td>
            </SurgeryListComp>);
    };




    return <Grid item className={styles.gridWidth}>
        <Container ref={surgeryViewRef} style={{ height: "30vh" }} className={styles.containerWidth} >
            <table style={{ width: "100%", tableLayout: "fixed" }}>
                <colgroup>
                    <col span={1} style={{ width: "60%" }} />
                    <col span={1} style={{ width: "40%" }} />
                </colgroup>
                <tr>
                    <th>{`Procedures(${surgeryList.length})`}</th>
                    <th>
                        <svg height={18} style={{ paddingLeft: "5px" }} width="100%" >
                            <g id="surgeryCaseScale" transform="translate(0 ,17)" />
                        </svg>
                    </th>
                </tr>
                {itemSelected.flatMap((listItem: ProcedureEntry) => {
                    if (listItem.overlapList) {
                        return [surgeryRow(listItem, true, false)].concat(listItem.overlapList?.map((subItem: ProcedureEntry) => {
                            // Find if the surgery sub row is selected
                            return surgeryRow(subItem, findIfSubProcedureSelected(subItem.procedureName, listItem.procedureName), true, listItem.procedureName);
                        }));
                    } else {
                        return [surgeryRow(listItem, true, false)];
                    }

                })}
                {itemUnselected.map((listItem: ProcedureEntry) => {
                    return surgeryRow(listItem, false, false);
                })}

            </table>

        </Container>
    </Grid>;

};
export default observer(SurgeryListViewer);

