import React, { FC } from 'react';
import { inject, observer } from 'mobx-react';
import Store from './Interfaces/Store';
import { LayoutElement } from './Interfaces/ApplicationState';
import { Button, Tab, Grid, GridColumn, Container } from 'semantic-ui-react';
import { actions } from '.';
import DumbbellChartVisualization from './Components/DumbbellChart/DumbbellChartVisualization';
import BarChartVisualization from './Components/BarChart/BarChartVisualization';
import ScatterPlotVisualization from './Components/Scatterplot/ScatterPlotVisualization';
import HeatMapVisualization from './Components/HeatMapChart/HeatMapVisualization';
import InterventionPlotVisualization from './Components/InterventionPlot/InterventionPlotVisualization';
import DetailView from './Components/Utilities/DetailView';
import LineUpWrapper from './Components/LineUpWrapper';
import PatientComparisonWrapper from './Components/PatientComparisonWrapper';
import UserControl from './Components/Utilities/UserControl';
import SideBar from './Components/Utilities/SideBar';
import styled from 'styled-components';
import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";

interface OwnProps {
    hemoData: any;
    store?: Store
}
type Props = OwnProps;

const Dashboard: FC<Props> = ({ store, hemoData }: Props) => {

    const { layoutArray } = store!;
    const createElement = (layout: LayoutElement, index: number) => {
        switch (layout.plot_type) {
            case "DUMBBELL":
                return (
                    <div key={layout.i} className={"parent-node" + layout.i}>

                        <Button icon="close" floated="right" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
                        <DumbbellChartVisualization
                            yAxis={layout.aggregatedBy}
                            chartId={layout.i}
                            chartIndex={index}
                            hemoglobinDataSet={hemoData}
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
                            aggregatedBy={layout.aggregatedBy}
                            valueToVisualize={layout.valueToVisualize}
                            // class_name={"parent-node" + layoutE.i}
                            chartId={layout.i}
                            chartIndex={index}
                            extraPair={layout.extraPair}
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
                        yAxis={layout.valueToVisualize}
                        hemoglobinDataSet={hemoData}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}
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
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        // class_name={"parent-node" + layoutE.i}
                        chartId={layout.i}
                        chartIndex={index}
                        extraPair={layout.extraPair}
                    />
                </div>);

            case "INTERVENTION":
                return (<div key={layout.i}
                    className={"parent-node" + layout.i}>
                    <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
                    <InterventionPlotVisualization
                        extraPair={layout.extraPair}
                        hemoglobinDataSet={hemoData}
                        aggregatedBy={layout.aggregatedBy}
                        valueToVisualize={layout.valueToVisualize}
                        chartId={layout.i}
                        chartIndex={index}
                        interventionDate={layout.interventionDate!}
                        interventionPlotType={layout.interventionType!} />
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

    const panes = [{
        menuItem: 'Main', pane: <Tab.Pane key="Main">
            <Grid>
                <GridColumn width={13}>
                    <ResponsiveReactGridLayout
                        onResizeStop={actions.onLayoutchange}
                        onDragStop={actions.onLayoutchange}
                        // onBreakpointChange={this._onBreakpointChange}
                        className="layout"
                        cols={colData}
                        rowHeight={300}
                        width={1300}
                        //cols={2}
                        //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        layouts={{ md: layoutArray }}
                    >
                        {layoutArray.map((layoutE, i) => {
                            return createElement(layoutE, i);
                        })}
                    </ResponsiveReactGridLayout>
                </GridColumn>
                <Grid.Column width={3}>
                    <DetailView />
                </Grid.Column>
            </Grid>
        </Tab.Pane>
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

    return (
        <LayoutDiv>
            <Container fluid>
                <UserControl />
            </Container>
            <Grid padded>
                <SpecialPaddingColumn width={3} >
                    <SideBar></SideBar>
                </SpecialPaddingColumn>
                <Grid.Column width={13}>
                    <Tab panes={panes}
                        renderActiveOnly={false}
                    ></Tab>
                </Grid.Column>

            </Grid>
        </LayoutDiv>
    );

}

export default inject('store')(observer(Dashboard))
const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;

const SpecialPaddingColumn = styled(Grid.Column)`
  &&&&&{padding-left:5px;}
`;