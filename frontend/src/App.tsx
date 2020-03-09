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
  Icon, Button, Tab, Container, Grid
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
import ScatterPlotVisualization from './Components/Scatterplot/ScatterPlotVisualization';
import DetailView from './Components/DetailView';

//const ResponsiveReactGridLayout = WidthProvider(Responsive);





interface OwnProps {
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {
  const {
    layoutArray,
    hemoglobinDataSet
  } = store!;

  async function cacheHemoData() {
    const res = await fetch("http://localhost:8000/api/hemoglobin");
    const data = await res.json();
    const result = data.result;
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
          <Button
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
          </Button>
          <DumbbellChartVisualization
            yAxis={layout.aggregatedBy}
            chartId={layout.i}
            chartIndex={index}
            aggregatedOption={layout.aggregation}
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
          <Button
            icon='close'
            floated={"right"}
            circular
            compact
            size="mini"
            onClick={actions.removeChart}
          >
          <Icon key={layout.i} name="close" /> 
          </Button>
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
        <Button
          icon='close'
          compact
          floated={"right"}
          circular
          size="mini"
          onClick={actions.removeChart}
        >
        <Icon key={layout.i} name="close" />
        </Button>
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
  const arr: { a: number; d: string; cat: string; cat2: string; }[] = [];
  const cats = ['c1', 'c2', 'c3'];
  for (let i = 0; i < 100; ++i) {
    arr.push({
      a: Math.random() * 10,
      d: 'Row ' + i,
      cat: cats[Math.floor(Math.random() * 3)],
      cat2: cats[Math.floor(Math.random() * 3)]
    })
  }
  const panes = [{
    menuItem: 'Tab 1', render: () => <Container>
      <ResponsiveReactGridLayout
        onResizeStop={actions.onLayoutchange}
        onDragStop={actions.onLayoutchange}
        // onBreakpointChange={this._onBreakpointChange}
        className="layout"
        cols={colData}
        rowHeight={300}
        width={1200}
        //cols={2}
        //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        layouts={{ md: layoutArray }}
      >
        {layoutArray.map((layoutE, i) => {
          return createElement(layoutE, i);
        })}
      </ResponsiveReactGridLayout>
    </Container>
  },
  {
    menuItem: 'Tab 2', render: () =>
      <div className={"okok"}>
        <LineUpJS.LineUp data={arr} /></div>
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
        <Grid.Column width={10}>
          <Tab panes={panes}
          //  renderActiveOnly={false}
          ></Tab>
        </Grid.Column>
        <Grid.Column width={3}>
          <DetailView/>
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