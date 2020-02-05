import React, { FC } from 'react';
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
  Icon, Button, Tab, Container,Grid
} from 'semantic-ui-react'
import Store from './Interfaces/Store'

//import {provenance} from '.'
// import * as d3 from "d3";


import * as LineUpJS from "lineupjsx";
import { inject, observer } from 'mobx-react';
import { LayoutElement } from './Interfaces/ApplicationState';
import { action } from 'mobx';
import {actions} from './index'

//const ResponsiveReactGridLayout = WidthProvider(Responsive);





interface OwnProps{
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {
  const {
    layoutArray
  } = store!;

  const removeStyle = {
    position: "absolute" as "absolute",
    right: "2px",
    top: 0,
    cursor: "pointer"
  };

  const colData = {
      lg: 2,
      md: 2,
      sm: 2,
      xs: 2,
      xxs: 2
    };

  const createElement = (layout: LayoutElement,index:number) => {
    if (layout.x_axis_name === "HEMO_VALUE") {
      return (
        <div key={layout.i} className={"parent-node" + layout.i}>
          <Button
            icon
            floated={"right"}
            circular
            size="mini"
            onClick={
              actions.removeChart.bind(layout.i)}
          >
            <Icon key={layout.i} name="close" />
          </Button>
          <DumbbellChartVisualization
            yAxis={layout.y_axis_name}
            chartId={layout.i}
            chartIndex={index}
          />
        </div>
      );
    }
    return (
      <div
        //onClick={this.onClickBlock.bind(this, layoutE.i)}
        key={layout.i}
        className={"parent-node" + layout.i}
        // data-grid={layoutE}
      >
        <Button
          icon
          floated={"right"}
          circular
          size="mini"
          onClick={actions.removeChart.bind(layout.i)}
        >
          <Icon key={layout.i} name="close" />
        </Button>
        <BarChartVisualization
          xAxis={layout.x_axis_name}
          yAxis={layout.y_axis_name}
          // class_name={"parent-node" + layoutE.i}
          chartId={layout.i}
          chartIndex={index}
          // set_selection_handler={this.SetSelectionHandler}

          //plot_type={layoutE.plot_type}
        />

        {/* <span
        className="remove"
        style={removeStyle}
        onClick={actions.removeChart(layout.i)}
      >
        x
      </span> */}
      </div>
    );
  }

  return (
    <LayoutDiv>
      <Container fluid>
        <UserControl />
      </Container>
      <Grid padded>
        <Grid.Column width={3}>
          <SideBar></SideBar>
        </Grid.Column>
        <Grid.Column width={9}>
          <Container>
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
              {layoutArray.map((layoutE,i) => {
                return createElement(layoutE,i);
              })}
            </ResponsiveReactGridLayout>
          </Container>
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