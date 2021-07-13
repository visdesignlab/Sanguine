import { max, scaleLinear } from "d3";
import { observer } from "mobx-react";
import { useCallback, useContext, useEffect } from "react";
import { FC, useLayoutEffect, useRef, useState } from "react";
import { Grid, Container, List, Header } from "semantic-ui-react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { ListSVG, SurgeryDiv, SurgeryForeignObj, SurgeryListComp, SurgeryRect, SurgeryText } from "../../../Presets/StyledComponents";

const SurgeryListViewer: FC = () => {
    const store = useContext(Store)
    const [width, setWidth] = useState(0);
    const [maxCaseCount, setMaxCaseCount] = useState(0);
    const [surgeryList, setSurgeryList] = useState<any[]>([]);
    const [itemSelected, setItemSelected] = useState<any[]>([]);
    const [itemUnselected, setItemUnselected] = useState<any[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    const caseScale = useCallback(() => {
        const caseScale = scaleLinear().domain([0, maxCaseCount]).range([0.6 * width, 0.92 * width])
        return caseScale;
    }, [maxCaseCount, width]);

    useLayoutEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth)
        }
    }, []);

    window.addEventListener("resize", () => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth)
        }
    });

    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}get_attributes`)
            .then(response => response.json())
            .then(function (data) {
                const result = data.result;
                let tempSurgeryList: any[] = result;
                //console.log(tempSurgeryList)
                let tempMaxCaseCount = (max(result as any, (d: any) => d.count) as any);
                tempMaxCaseCount = 10 ** (tempMaxCaseCount.toString().length);
                setMaxCaseCount(tempMaxCaseCount)
                let tempItemUnselected: any[] = [];
                let tempItemSelected: any[] = [];
                result.forEach((d: any) => {
                    if (store.state.proceduresSelection.includes(d.value)) {
                        tempItemSelected.push(d)
                    } else {
                        tempItemUnselected.push(d)
                    }
                })
                tempSurgeryList.sort((a: any, b: any) => b.count - a.count)
                tempItemSelected.sort((a: any, b: any) => b.count - a.count)
                tempItemUnselected.sort((a: any, b: any) => b.count - a.count)
                stateUpdateWrapperUseJSON(surgeryList, tempSurgeryList, setSurgeryList)
                stateUpdateWrapperUseJSON(itemUnselected, tempItemUnselected, setItemUnselected);
                stateUpdateWrapperUseJSON(itemSelected, tempItemSelected, setItemSelected);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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


    return <Grid.Row centered >
        <Container style={{ overflow: "overlay", height: "25vh" }} >
            <List relaxed divided >
                <List.Item key={"filter-header"}
                    content={
                        <Header>
                            <svg height={18} style={{ paddingLeft: "5px" }} width="95%" ref={svgRef}>
                                <text
                                    alignmentBaseline="hanging" x={0} y={0} fontSize="medium">
                                    {`Procedures(${surgeryList.length})`}
                                </text>

                                <g id="surgeryCaseScale" transform="translate(0 ,17)" />
                            </svg>
                        </Header>} />

                {itemSelected.map((listItem: any) => {
                    if (listItem.value) {
                        return (
                            <SurgeryListComp key={listItem.value} isSelected={true} onClick={() => { store.selectionStore.updateProcedureSelection(listItem.value, true) }}
                                content={<ListSVG >
                                    <SurgeryForeignObj width={0.6 * width} >
                                        <SurgeryDiv>
                                            {listItem.value}
                                        </SurgeryDiv>
                                    </SurgeryForeignObj>
                                    <SurgeryRect
                                        x={caseScale().range()[0]}
                                        width={caseScale()(listItem.count) - caseScale().range()[0]}
                                    />
                                    <SurgeryText y={9} x={caseScale().range()[1]}>{listItem.count}</SurgeryText>
                                </ListSVG>} />
                        )
                    } else { return (<></>) }
                })}

                {itemUnselected.map((listItem: any) => {
                    if (listItem.value) {
                        return (
                            <SurgeryListComp key={listItem.value} isSelected={false} content={
                                <ListSVG >
                                    <SurgeryForeignObj width={0.6 * width} >
                                        <SurgeryDiv>
                                            {listItem.value}
                                        </SurgeryDiv>
                                    </SurgeryForeignObj>

                                    <SurgeryRect
                                        x={caseScale().range()[0]}
                                        width={caseScale()(listItem.count) - caseScale().range()[0]} />
                                    <SurgeryText y={9} x={caseScale().range()[1]}>
                                        {listItem.count}
                                    </SurgeryText>
                                </ListSVG>}
                                onClick={() => { store.selectionStore.updateProcedureSelection(listItem.value, false) }} />
                        )
                    }
                    else { return (<></>) }
                })}
            </List>
        </Container>
    </Grid.Row>
}
export default observer(SurgeryListViewer)