import { Container, Tab, Tabs } from "@material-ui/core";
import { observer } from "mobx-react";
import { ChangeEvent, useContext, useState } from "react";
import { FC, useRef, useLayoutEffect } from "react";
import { Responsive } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import Store from "../Interfaces/Store";
import { LayoutElement } from "../Interfaces/Types/LayoutTypes";
import { typeDiction } from "../Presets/DataDict";
import { useStyles, WelcomeText } from "../Presets/StyledComponents";
import ChartStandardButtons from "./Charts/ChartStandardButtons";
import WrapperHeatMap from "./Charts/HeatMap/WrapperHeatMap";

//type Props = { hemoData: SingleCasePoint[]; };

const LayoutGenerator: FC = () => {
    const store = useContext(Store)
    const [tabValue, setTabValue] = useState(0);
    const styles = useStyles();
    const handleChange = (event: ChangeEvent<{}>, newValue: any) => {
        setTabValue(newValue);
    };

    const createElement = (layout: LayoutElement, index: number) => {
        switch (layout.plotType) {
            case "DUMBBELL":
                return (
                    <div key={layout.i} className={"parent-node" + layout.i}>

                        <ChartStandardButtons chartID={layout.i} />
                        {/* <DumbbellChartVisualization
                            yAxis={layout.aggregatedBy}
                            w={layout.w}
                            chartId={layout.i}
                            chartIndex={index}
                            hemoglobinDataSet={hemoData}
                            notation={layout.notation}
                        //     interventionDate={layout.interventionDate}
                        // aggregatedOption={layout.aggregation}
                        /> */}
                    </div>
                );
            case "COST":
                return (
                    <div
                        key={layout.i}
                        className={"parent-node" + layout.i}
                    >
                        <ChartStandardButtons chartID={layout.i} />
                        {/* <CostBarChartVisualization
                            hemoglobinDataSet={hemoData}
                            w={layout.w}
                            aggregatedBy={layout.aggregatedBy}
                            // valueToVisualize={layout.valueToVisualize}
                            // class_name={"parent-node" + layoutE.i}
                            chartId={layout.i}
                            chartIndex={index}
                            // extraPair={layout.extraPair}
                            notation={layout.notation}
                        /> */}
                    </div>
                );
            case "SCATTER":
                return (<div
                    //onClick={this.onClickBlock.bind(this, layoutE.i)}
                    key={layout.i}
                    className={"parent-node" + layout.i}
                // data-grid={layoutE}
                >
                    <ChartStandardButtons chartID={layout.i} />
                    {/* <ScatterPlotVisualization
                        xAxis={layout.aggregatedBy}
                        w={layout.w}
                        yAxis={layout.valueToVisualize}
                        hemoglobinDataSet={hemoData}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}
                        //  proceduresSelection={proceduresSelection}
                        notation={layout.notation}
                    /> */}
                </div>);

            case "HEATMAP":
                return (<div
                    key={layout.i}
                    className={"parent-node" + layout.i}>
                    <ChartStandardButtons chartID={layout.i} />
                    <WrapperHeatMap
                        chartId={layout.i}
                        layoutW={layout.w}
                        layoutH={layout.h}
                        extraPairArrayString={layout.extraPair || ""}
                        xAggregationOption={layout.aggregatedBy}
                        yValueOption={layout.valueToVisualize}
                        chartTypeIndexinArray={typeDiction.indexOf(layout.plotType)}
                    />
                </div>);

            case "INTERVENTION":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <ChartStandardButtons chartID={layout.i} />
                    {/* <InterventionPlotVisualization
                        extraPair={layout.extraPair}
                        w={layout.w}
                        hemoglobinDataSet={hemoData}
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        chartId={layout.i}
                        chartIndex={index}
                        interventionDate={layout.interventionDate!}
                        interventionPlotType={layout.comparisonChartType!}
                        notation={layout.notation} /> */}
                </div>);
            case "COMPARISON":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <ChartStandardButtons chartID={layout.i} />
                    {/* <ComparisonPlotVisualization
                        aggregatedBy={layout.aggregatedBy}
                        chartId={layout.i}
                        chartIndex={index}
                        hemoglobinDataSet={hemoData}
                        extraPair={layout.extraPair}
                        notation={layout.notation}
                        valueToVisualize={layout.valueToVisualize}
                        outcomeComparison={layout.outcomeComparison!}
                        w={layout.w}
                    /> */}
                </div>);
            case "COMPARESAVING":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <ChartStandardButtons chartID={layout.i} />
                    {/* <CompareSavingChartVisualization
                        aggregatedBy={layout.aggregatedBy}
                        chartId={layout.i}
                        chartIndex={index}
                        hemoglobinDataSet={hemoData}
                        notation={layout.notation}
                        valueToCompare={layout.valueToVisualize}
                        w={layout.w}
                    /> */}

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
        let output = store.state.layoutArray.map(d => ({ w: d.w, h: d.h, x: d.x, y: d.y, i: d.i }))
        const newStuff = output.map(d => ({ ...d }))
        return newStuff
    }

    const tabRef = useRef(null)

    useLayoutEffect(() => {
        if (tabRef.current) {
            store.mainCompWidth = ((tabRef.current as any).clientWidth)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabRef])

    window.addEventListener("resize", () => {
        if (tabRef.current) {
            store.mainCompWidth = ((tabRef.current as any).clientWidth)
        }
    })

    const panes = [

        <div id="main-tab" className={styles.containerWidth}>
            <WelcomeText show={store.state.layoutArray.length > 0}>Click "Add" above to start.</WelcomeText>
            <Responsive
                onResizeStop={(e, v) => { store.chartStore.onLayoutChange(e) }}
                onDragStop={(e, v) => { store.chartStore.onLayoutChange(e) }}
                draggableHandle={".move-icon"}
                className="layout"
                cols={colData}
                rowHeight={600}
                width={0.95 * store.mainCompWidth}
                //cols={2}
                //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                layouts={{ md: generateGrid(), lg: generateGrid(), sm: generateGrid(), xs: generateGrid(), xxs: generateGrid() }}
            >
                {store.state.layoutArray.map((layoutE, i) => {
                    return createElement(layoutE, i);
                })}
            </Responsive>
        </div >,
        <div id="filter-tab">
            <div className={"lineup"} id={"lineup-wrapper"}>
                {/* <LineUpWrapper hemoglobinDataSet={hemoData} /> */}
            </div>
        </div>
    ]

    return (
        <Container className={styles.containerWidth}>
            <Tabs
                value={tabValue}
                onChange={handleChange}
                indicatorColor="primary"
                textColor="primary"
                centered>
                <Tab label="Main" />
                <Tab label="filter" />
            </Tabs>
            <Container ref={tabRef} className={styles.containerWidth}>
                {panes[tabValue]}
            </Container>
        </Container>
    )
}

export default observer(LayoutGenerator);
