import React, { FC, useEffect } from 'react';
import styled from 'styled-components';
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './App.css';
import UserControl from './Components/UserControl'
import SideBar from './Components/SideBar'

import BarChartVisualization from "./Components/BarChart/BarChartVisualization";
import DumbbellChartVisualization from "./Components/DumbbellChart/DumbbellChartVisualization";
// import Grid from "hedron";
// import  { Range } from "rc-slider";
// import "rc-slider/assets/index.css";
// import Select from 'react-select';
// import makeAnimated from 'react-select/animated'
// import ScatterPlot from './Components/ScatterPlot';
// import DumbbellPlot from './Components/DumbbellPlot'
import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";
import {
  Icon, Button, Tab, Container, Grid, GridColumn
} from 'semantic-ui-react'
import Store from './Interfaces/Store'
// import LineUp from 'lineupjsx'

//import {provenance} from '.'
// import * as d3 from "d3";


import * as LineUpJS from "lineupjsx";
import { inject, observer } from 'mobx-react';
import { LayoutElement } from './Interfaces/ApplicationState';
import { action } from 'mobx';
import { actions } from './index'
import { LineUpStringColumnDesc, LineUpCategoricalColumnDesc, LineUpNumberColumnDesc, LineUpSupportColumn, LineUpColumn } from 'lineupjsx';
// import ScatterPlotVisualization from './Components/Scatterplot/ScatterPlotVisualization';
import DetailView from './Components/DetailView';
import ScatterPlotVisualization from './Components/Scatterplot/ScatterPlotVisualization';
import LineUpWrapper from './Components/LineUpWrapper';

//const ResponsiveReactGridLayout = WidthProvider(Responsive);





interface OwnProps {
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {
  const {
    layoutArray,
    // hemoglobinDataSet
  } = store!;

  async function cacheHemoData() {
    const resHemo = await fetch("http://localhost:8000/api/hemoglobin");
    const dataHemo = await resHemo.json();
    const resultHemo = dataHemo.result;
    const resTrans = await fetch(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&year_range=${[2014, 2019]}`)
    const dataTrans = await resTrans.json();
    const resultTrans = dataTrans.result;

    let transfused_dict = {} as any;
    let result: {
      CASE_ID: number,
      VISIT_ID: number,
      PATIENT_ID: number,
      ANESTHOLOGIST_ID: number,
      SURGEON_ID: number,
      YEAR: number,
      QUARTER: string,
      PRBC_UNITS: number,
      FFP_UNITS: number,
      PLT_UNITS: number,
      CRYO_UNITS: number,
      CELL_SAVER_ML: number,
      HEMO: number[]
    }[] = [];



    resultTrans.forEach((element: any) => {
      transfused_dict[element.case_id] = {
        PRBC_UNITS: element.PRBC_UNITS,
        FFP_UNITS: element.FFP_UNITS,
        PLT_UNITS: element.PLT_UNITS,
        CRYO_UNITS: element.CRYO_UNITS,
        CELL_SAVER_ML: element.CELL_SAVER_ML
      };
    });


    resultHemo.map((ob: any) => {
      if (transfused_dict[ob.CASE_ID]) {
        const transfusedResult = transfused_dict[ob.CASE_ID]
        result.push({
          CASE_ID: ob.CASE_ID,
          VISIT_ID: ob.VISIT_ID,
          PATIENT_ID: ob.PATIENT_ID,
          ANESTHOLOGIST_ID: ob.ANESTHOLOGIST_ID,
          SURGEON_ID: ob.SURGEON_ID,
          YEAR: ob.YEAR,
          PRBC_UNITS: transfusedResult.PRBC_UNITS,
          FFP_UNITS: transfusedResult.FFP_UNITS,
          PLT_UNITS: transfusedResult.PLT_UNITS,
          CRYO_UNITS: transfusedResult.CRYO_UNITS,
          CELL_SAVER_ML: transfusedResult.CELL_SAVER_ML,
          HEMO: ob.HEMO,
          QUARTER: ob.QUARTER
        })
      }
    })

    result = result.filter((d: any) => d);

    actions.storeHemoData(result);
    //   let tempMaxCaseCount = 0
    // data.result.forEach((d: any) => {
    //   tempMaxCaseCount = d.count > tempMaxCaseCount ? d.count : tempMaxCaseCount;
    // })
    // setMaxCaseCount(tempMaxCaseCount)
  }

  useEffect(() => {
    cacheHemoData();
  }, []);

  const colData = {
    lg: 2,
    md: 2,
    sm: 2,
    xs: 2,
    xxs: 2
  };

  const createElement = (layout: LayoutElement, index: number) => {
    if (layout.plot_type === "DUMBBELL") {
      return (
        <div key={layout.i} className={"parent-node" + layout.i}>
          {/* <Button
            icon="close"
            floated={"right"}
            circular
            compact
            size="mini"
            key={layout.i}
            onClick={
              actions.removeChart}
          >
            <Icon key={layout.i} name="close" />
          </Button> */}
          <Button icon="close" floated="right" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
          <DumbbellChartVisualization
            yAxis={layout.aggregatedBy}
            chartId={layout.i}
            chartIndex={index}
          // aggregatedOption={layout.aggregation}
          />
        </div>
      );
    }
    else if (layout.plot_type === "BAR") {
      return (
        <div
          //onClick={this.onClickBlock.bind(this, layoutE.i)}
          key={layout.i}
          className={"parent-node" + layout.i}
        // data-grid={layoutE}
        >
          {/* <Button
            icon='close'
            floated={"right"}
            circular
            compact
            size="mini"
            onClick={actions.removeChart}
          >
            <Icon key={layout.i} name="close" />
          </Button> */}
          <Button floated="right" icon="close" circular compact size="mini" basic onClick={() => { actions.removeChart(layout.i) }} />
          <BarChartVisualization
            aggregatedBy={layout.aggregatedBy}
            valueToVisualize={layout.valueToVisualize}
            // class_name={"parent-node" + layoutE.i}
            chartId={layout.i}
            chartIndex={index}
            extraPair={layout.extraPair}
          />
        </div>
      );
    }
    else {
      return (<div
        //onClick={this.onClickBlock.bind(this, layoutE.i)}
        key={layout.i}
        className={"parent-node" + layout.i}
      // data-grid={layoutE}
      >
        {/* <Button
          icon='close'
          compact
          floated={"right"}
          circular
          size="mini"
          onClick={actions.removeChart}
        >
          <Icon key={layout.i} name="close" />
        </Button> */}
        <Button floated="right" icon="close" size="mini" circular compact basic onClick={() => { actions.removeChart(layout.i) }} />
        <ScatterPlotVisualization
          xAxis={layout.aggregatedBy}
          yAxis={layout.valueToVisualize}
          // class_name={"parent-node" + layoutE.i}
          chartId={layout.i}
          chartIndex={index}
        />
      </div>)
    }
  }

  const panes = [{
    menuItem: 'Main', pane: <Tab.Pane>
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
      <Tab.Pane>
        <div className={"lineup"}>
          <LineUpWrapper /></div></Tab.Pane>
  }]

  return (
    <LayoutDiv>
      <Container fluid>
        <UserControl />
      </Container>
      <Grid padded>
        <Grid.Column width={3}>
          <SideBar></SideBar>
        </Grid.Column>
        <Grid.Column width={13}>
          <Tab panes={panes}
            renderActiveOnly={false}
          ></Tab>
        </Grid.Column>

      </Grid>
    </LayoutDiv>
  );
}

export default inject('store')(observer(App));

const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;