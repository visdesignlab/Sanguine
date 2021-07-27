import { Container, Grid, Box } from "@material-ui/core";
import { axisTop, max, scaleLinear, select } from "d3";
import { observer } from "mobx-react";
import { useCallback, useContext, useEffect } from "react";
import { FC, useLayoutEffect, useRef, useState } from "react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { SurgeryDiv, SurgeryListComp, SurgeryNumText, useStyles } from "../../../Presets/StyledComponents";
import { ListSVG, SurgeryRect } from "../../../Presets/StyledSVGComponents";

type Props = {
    surgeryList: any[];
    maxCaseCount: number
}

const SurgeryListViewer: FC<Props> = ({ surgeryList, maxCaseCount }: Props) => {
    const store = useContext(Store)
    const [width, setWidth] = useState(0);
    const [itemSelected, setItemSelected] = useState<any[]>([]);
    const [itemUnselected, setItemUnselected] = useState<any[]>([]);

    const styles = useStyles()

    const caseScale = useCallback(() => {
        const caseScale = scaleLinear().domain([0, maxCaseCount]).range([2, 0.3 * width - 15])
        return caseScale;
    }, [maxCaseCount, width]);


    const surgeryViewRef = useRef(null)

    useLayoutEffect(() => {
        console.log(surgeryViewRef)
        if (surgeryViewRef.current) {
            setWidth((surgeryViewRef.current as any).offsetWidth)
            console.log(width)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [surgeryViewRef])

    window.addEventListener("resize", () => {
        if (surgeryViewRef.current) {
            setWidth((surgeryViewRef.current as any).offsetWidth)
        }
    })

    select('#surgeryCaseScale').call(axisTop(caseScale()).ticks(3) as any)



    useEffect(() => {
        let newItemSelected: any[] = []
        let newItemUnselected: any[] = []
        surgeryList.forEach((d: any) => {
            if (store.state.proceduresSelection.includes(d.value)) {
                newItemSelected.push(d)
            }
            else {
                newItemUnselected.push(d)
            }
        })
        stateUpdateWrapperUseJSON(itemSelected, newItemSelected, setItemSelected)
        stateUpdateWrapperUseJSON(itemUnselected, newItemUnselected, setItemUnselected)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.state.proceduresSelection, surgeryList])

    const surgeryRow = (listItem: any, isSelected: boolean) => {
        return (
            <SurgeryListComp key={listItem.value} isSelected={isSelected} onClick={() => { store.selectionStore.updateProcedureSelection(listItem.value, isSelected) }}>
                {/* <td> */}
                <SurgeryDiv >
                    {listItem.value}
                </SurgeryDiv>
                {/* </td> */}
                <td>
                    <ListSVG widthInput={0.3 * width}>
                        <SurgeryRect
                            x={caseScale().range()[0]}
                            width={caseScale()(listItem.count) - caseScale().range()[0]}
                        />
                        <SurgeryNumText y={9} x={caseScale().range()[1]}>{listItem.count}</SurgeryNumText>
                    </ListSVG>
                </td>
            </SurgeryListComp>)
    }


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
                {itemSelected.map((listItem: any) => {
                    return surgeryRow(listItem, true)
                })}
                {itemUnselected.map((listItem: any) => {
                    return surgeryRow(listItem, false)
                })}

            </table>

        </Container>
    </Grid>

}
export default observer(SurgeryListViewer)

