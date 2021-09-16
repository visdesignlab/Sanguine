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
import WrapperCostBar from "./Charts/CostBarChart/WrapperCostBar";
import WrapperDumbbell from "./Charts/DumbbellChart/WrapperDumbbell";
import WrapperHeatMap from "./Charts/HeatMap/WrapperHeatMap";
import WrapperScatter from "./Charts/ScatterPlot/WrapperScatter";
import FilterBoard from "./Utilities/FilterInterface/FilterBoard";


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
                        <WrapperDumbbell

                            layoutW={layout.w}
                            chartId={layout.i}
                            layoutH={layout.h}
                            xAggregationOption={layout.aggregatedBy}

                            annotationText={layout.notation}
                        />
                    </div>
                );
            case "COST":
                return (
                    <div
                        key={layout.i}
                        className={"parent-node" + layout.i}
                    >
                        <ChartStandardButtons chartID={layout.i} />
                        <WrapperCostBar
                            extraPairArrayString={layout.extraPair || ""}
                            layoutW={layout.w}
                            layoutH={layout.h}
                            xAggregatedOption={layout.aggregatedBy}
                            chartId={layout.i}
                            comparisonOption={layout.valueToVisualize}
                            annotationText={layout.notation}
                        />
                    </div>
                );
            case "SCATTER":
                return (<div
                    key={layout.i}
                    className={"parent-node" + layout.i}
                >
                    <ChartStandardButtons chartID={layout.i} />
                    <WrapperScatter
                        xAggregationOption={layout.aggregatedBy}
                        layoutW={layout.w}
                        yValueOption={layout.valueToVisualize}
                        layoutH={layout.h}
                        chartId={layout.i}
                        annotationText={layout.notation}
                    />
                </div>);

            case "HEATMAP":
                return (<div
                    key={layout.i}
                    className={"parent-node" + layout.i}>



                    <WrapperHeatMap
                        annotationText={layout.notation}
                        chartId={layout.i}
                        layoutW={layout.w}
                        layoutH={layout.h}
                        extraPairArrayString={layout.extraPair || ""}
                        xAggregationOption={layout.aggregatedBy}
                        yValueOption={layout.valueToVisualize}
                        chartTypeIndexinArray={typeDiction.indexOf(layout.plotType)}
                        comparisonDate={layout.outcomeComparison ? undefined : layout.interventionDate}
                        outcomeComparison={layout.outcomeComparison}
                    />
                </div>);

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



    return (
        <Container className={styles.containerWidth}>
            {/* <Tabs
                value={tabValue}
                onChange={handleChange}
                indicatorColor="primary"
                textColor="primary"
                centered>
                <Tab label="Main" />
                <Tab label="filter" />
            </Tabs> */}
            <Container ref={tabRef} style={{ height: "90vh", overflow: "auto", maxWidth: "none" }}>

                <WelcomeText show={store.state.layoutArray.length > 0}>Click "Add" above to start.</WelcomeText>
                <Responsive
                    onResizeStop={(e, v) => { store.chartStore.onLayoutChange(e) }}
                    onDragStop={(e, v) => { store.chartStore.onLayoutChange(e) }}
                    draggableHandle={".move-icon"}
                    className="layout"
                    cols={colData}
                    rowHeight={500}
                    width={0.95 * store.mainCompWidth}
                    layouts={{ md: generateGrid(), lg: generateGrid(), sm: generateGrid(), xs: generateGrid(), xxs: generateGrid() }}
                >
                    {store.state.layoutArray.map((layoutE, i) => {
                        return createElement(layoutE, i);
                    })}
                </Responsive>

            </Container>
        </Container>
    )
}

export default observer(LayoutGenerator);
