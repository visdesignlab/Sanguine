import React, {
    FC
} from "react";
import { inject, observer } from "mobx-react";
import { Tab, Grid, GridColumn, Button } from "semantic-ui-react";
import { actions } from ".";
import DetailView from "./Components/Utilities/DetailView";
import LineUpWrapper from "./Components/LineUpWrapper";
import PatientComparisonWrapper from "./Components/PatientComparisonWrapper";
import Store from "./Interfaces/Store";
import { LayoutElement } from "./Interfaces/ApplicationState";
import DumbbellChartVisualization from "./Components/DumbbellChart/DumbbellChartVisualization";
import BarChartVisualization from "./Components/BarChart/BarChartVisualization";
import ScatterPlotVisualization from "./Components/Scatterplot/ScatterPlotVisualization";
import HeatMapVisualization from "./Components/HeatMapChart/HeatMapVisualization";
import InterventionPlotVisualization from "./Components/InterventionPlot/InterventionPlotVisualization";
import { Responsive, WidthProvider } from "react-grid-layout";
import 'react-grid-layout/css/styles.css'
interface OwnProps {
    hemoData: any;
    store?: Store
}



export type Props = OwnProps;



const LayoutGenerator: FC<Props> = ({ hemoData, store }: Props) => {
    const { layoutArray } = store!

    const createElement = (layout: LayoutElement, index: number) => {
        console.log(layout)
        switch (layout.plot_type) {
            case "DUMBBELL":
                return (
                    <div key={layout.i} className={"parent-node" + layout.i}>

                        <Button icon="close" floated="right" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
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
            case "VIOLIN":
                return (
                    <div
                        //onClick={this.onClickBlock.bind(this, layoutE.i)}
                        key={layout.i}
                        className={"parent-node" + layout.i}
                    // data-grid={layoutE}
                    >

                        <Button floated="right" icon="close" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
                        <BarChartVisualization
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
                    <ScatterPlotVisualization
                        xAxis={layout.aggregatedBy}
                        w={layout.w}
                        yAxis={layout.valueToVisualize}
                        hemoglobinDataSet={hemoData}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}

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
                    <InterventionPlotVisualization
                        extraPair={layout.extraPair}
                        w={layout.w}
                        hemoglobinDataSet={hemoData}
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        chartId={layout.i}
                        chartIndex={index}
                        interventionDate={layout.interventionDate!}
                        interventionPlotType={layout.interventionType!}
                        notation={layout.notation} />
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
        let output = layoutArray.map(d => ({ w: d.w, h: d.h, x: d.x, y: d.y, i: d.i }))
        const newStuff = output.map(d => ({ ...d }))
        return newStuff
    }
    const panes = [{
        menuItem: 'Main', pane: <Tab.Pane key="Main">
            <Grid>
                <GridColumn width={13}>
                    <Responsive
                        onResizeStop={actions.onLayoutchange}
                        onDragStop={actions.onLayoutchange}
                        // onLayoutChange={actions.onLayoutchange}
                        // onBreakpointChange={this._onBreakpointChange}
                        className="layout"
                        cols={colData}
                        rowHeight={600}
                        width={1300}
                        //cols={2}
                        //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}

                        layouts={{ md: generateGrid(), lg: generateGrid(), sm: generateGrid(), xs: generateGrid(), xxs: generateGrid() }}
                    >
                        {layoutArray.map((layoutE, i) => {
                            return createElement(layoutE, i);
                        })}
                    </Responsive>
                </GridColumn>
                <Grid.Column width={3}>
                    <DetailView />
                </Grid.Column>
            </Grid>
        </Tab.Pane >
    },
    {
        menuItem: 'LineUp', pane:
            <Tab.Pane key="LineUp">
                <div className={"lineup"}>
                    <LineUpWrapper hemoglobinDataSet={hemoData} /></div></Tab.Pane>
    }, {
        menuItem: 'Selected Patients',
        pane:
            <Tab.Pane key="Patients">
                <PatientComparisonWrapper></PatientComparisonWrapper>

            </Tab.Pane>
    }]
    return <Tab panes={panes}
        renderActiveOnly={false}
    ></Tab>
}


export default inject("store")(observer(LayoutGenerator));