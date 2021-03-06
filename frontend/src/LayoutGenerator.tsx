import React, {
    FC, useRef, useLayoutEffect,
} from "react";
import { inject, observer } from "mobx-react";
import { Tab, Button, Ref } from "semantic-ui-react";
import { actions } from ".";
import LineUpWrapper from "./LineUpWrapper";
//import PatientComparisonWrapper from "./Components/PatientComparisonWrapper";
import Store from "./Interfaces/Store";
import { LayoutElement } from "./Interfaces/ApplicationState";
import DumbbellChartVisualization from "./Components/DumbbellChart/DumbbellChartVisualization";
import ScatterPlotVisualization from "./Components/Scatterplot/ScatterPlotVisualization";
import HeatMapVisualization from "./Components/HeatMapChart/HeatMapVisualization";
import InterventionPlotVisualization from "./Components/InterventionPlot/InterventionPlotVisualization";
import ComparisonPlotVisualization from "./Components/ComparisonPlot/ComparisonPlotVisualization";
import { Responsive } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import CostBarChartVisualization from "./Components/CostBarChart/CostBarChartVisualization";
import CompareSavingChartVisualization from "./Components/SavingChart/CompareSavingChartVisualization";
import { third_gray } from "./PresetsProfile";
import styled from "styled-components";

interface OwnProps {
    hemoData: any[];
    store?: Store
}



export type Props = OwnProps;



const LayoutGenerator: FC<Props> = ({ hemoData, store }: Props) => {
    const { layoutArray, mainCompWidth } = store!
    //  const [tabWidth, setTabWidth] = useState(mainCompWidth);


    const createElement = (layout: LayoutElement, index: number) => {
        switch (layout.plotType) {
            case "DUMBBELL":
                return (
                    <div key={layout.i} className={"parent-node" + layout.i}>

                        <Button icon="close" floated="right" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
                        <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                        <DumbbellChartVisualization
                            yAxis={layout.aggregatedBy}
                            w={layout.w}
                            chartId={layout.i}
                            chartIndex={index}
                            hemoglobinDataSet={hemoData}
                            notation={layout.notation}
                        //     interventionDate={layout.interventionDate}
                        // aggregatedOption={layout.aggregation}
                        />
                    </div>
                );
            case "COST":
                return (
                    <div
                        //onClick={this.onClickBlock.bind(this, layoutE.i)}
                        key={layout.i}
                        className={"parent-node" + layout.i}
                    // data-grid={layoutE}
                    >

                        <Button floated="right" icon="close" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
                        <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                        <CostBarChartVisualization
                            hemoglobinDataSet={hemoData}
                            w={layout.w}
                            aggregatedBy={layout.aggregatedBy}
                            // valueToVisualize={layout.valueToVisualize}
                            // class_name={"parent-node" + layoutE.i}
                            chartId={layout.i}
                            chartIndex={index}
                            // extraPair={layout.extraPair}
                            notation={layout.notation}
                        />
                    </div>
                );
            case "SCATTER":
                return (<div
                    //onClick={this.onClickBlock.bind(this, layoutE.i)}
                    key={layout.i}
                    className={"parent-node" + layout.i}
                // data-grid={layoutE}
                >

                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                    <ScatterPlotVisualization
                        xAxis={layout.aggregatedBy}
                        w={layout.w}
                        yAxis={layout.valueToVisualize}
                        hemoglobinDataSet={hemoData}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}
                        //  proceduresSelection={proceduresSelection}
                        notation={layout.notation}
                    />
                </div>);

            case "HEATMAP":
                return (<div
                    //onClick={this.onClickBlock.bind(this, layoutE.i)}
                    key={layout.i}
                    className={"parent-node" + layout.i}
                // data-grid={layoutE}
                >

                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                    <HeatMapVisualization
                        hemoglobinDataSet={hemoData}
                        w={layout.w}
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}
                        extraPair={layout.extraPair}
                        notation={layout.notation}
                    />
                </div>);

            case "INTERVENTION":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                    <InterventionPlotVisualization
                        extraPair={layout.extraPair}
                        w={layout.w}
                        hemoglobinDataSet={hemoData}
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        chartId={layout.i}
                        chartIndex={index}
                        interventionDate={layout.interventionDate!}
                        interventionPlotType={layout.comparisonChartType!}
                        notation={layout.notation} />
                </div>);
            case "COMPARISON":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                    <ComparisonPlotVisualization
                        aggregatedBy={layout.aggregatedBy}
                        chartId={layout.i}
                        chartIndex={index}
                        hemoglobinDataSet={hemoData}
                        extraPair={layout.extraPair}
                        notation={layout.notation}
                        valueToVisualize={layout.valueToVisualize}
                        outcomeComparison={layout.outcomeComparison!}
                        w={layout.w}
                    />
                </div>);
            case "COMPARESAVING":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <Button floated="right" icon="move" size="mini" circular compact basic className="move-icon" />
                    <CompareSavingChartVisualization
                        aggregatedBy={layout.aggregatedBy}
                        chartId={layout.i}
                        chartIndex={index}
                        hemoglobinDataSet={hemoData}
                        notation={layout.notation}
                        valueToCompare={layout.valueToVisualize}
                        w={layout.w}
                    />

                </div>)



        }

    }

    const colData = {
        lg: 2,
        md: 2,
        sm: 2,
        xs: 2,
        xxs: 2
    };
    const generateGrid = () => {
        let output = layoutArray.map(d => ({ w: d.w, h: d.h, x: d.x, y: d.y, i: d.i }))
        const newStuff = output.map(d => ({ ...d }))
        return newStuff
    }

    const tabRef = useRef(undefined)

    useLayoutEffect(() => {
        if (tabRef.current) {
            store!.mainCompWidth = ((tabRef.current as any).clientWidth)
            // console.log(tabRef)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabRef])

    window.addEventListener("resize", () => {
        if (tabRef.current) {
            store!.mainCompWidth = ((tabRef.current as any).clientWidth)
        }
    })



    const panes = [{
        menuItem: 'Main', pane:

            <Tab.Pane key="Main" >
                <WelcomeText show={layoutArray.length > 0}>Click "Add" above to start.</WelcomeText>
                <Responsive
                    onResizeStop={actions.onLayoutchange}
                    onDragStop={actions.onLayoutchange}
                    draggableHandle={".move-icon"}
                    // onLayoutChange={actions.onLayoutchange}
                    // onBreakpointChange={this._onBreakpointChange}
                    className="layout"
                    cols={colData}
                    rowHeight={600}
                    width={0.95 * mainCompWidth}
                    //cols={2}
                    //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}

                    layouts={{ md: generateGrid(), lg: generateGrid(), sm: generateGrid(), xs: generateGrid(), xxs: generateGrid() }}
                >
                    {layoutArray.map((layoutE, i) => {

                        return createElement(layoutE, i);

                    })}
                </Responsive>

            </Tab.Pane >

    },
    {
        menuItem: 'LineUp', pane:
            <Tab.Pane key="LineUp">
                <div className={"lineup"} id={"lineup-wrapper"}>
                    <LineUpWrapper hemoglobinDataSet={hemoData} /></div></Tab.Pane>
    },
        // {
        //     menuItem: 'Selected Patients',
        //     pane:
        //         <Tab.Pane key="Patients">
        //             <PatientComparisonWrapper></PatientComparisonWrapper>

        //         </Tab.Pane>
        // }
    ]
    return <Ref innerRef={tabRef}>
        <Tab panes={panes}
            renderActiveOnly={false} />
    </Ref>
}
interface TextProps {
    show: boolean
}
const WelcomeText = styled(`text`) <TextProps>`
    display:${props => props.show ? "none" : "block"}
    font-size:xxx-large
    fill:${third_gray}
    opacity:0.25
    margin:20px
`

export default inject("store")(observer(LayoutGenerator));
