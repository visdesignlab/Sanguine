import React, { FC } from 'react';
import styled from 'styled-components';
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './App.css';
import UserControl from './Components/UserControl'

import BarChartVisualization from "./Components/BarChart/BarChartVisualization";
import DumbbellChart from "./Components/DumbbellChart/DumbbellChartVisualization";
// import Grid from "hedron";
// import  { Range } from "rc-slider";
// import "rc-slider/assets/index.css";
// import Select from 'react-select';
// import makeAnimated from 'react-select/animated'
// import ScatterPlot from './Components/ScatterPlot';
// import DumbbellPlot from './Components/DumbbellPlot'
import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";
import {
  Button, Checkbox, Tab, Container
} from 'semantic-ui-react'
import Store from './Interfaces/Store'

//import {provenance} from '.'
// import * as d3 from "d3";


import * as LineUpJS from "lineupjsx";
import { inject, observer } from 'mobx-react';
import { LayoutElement } from './Interfaces/ApplicationState';

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

  const createElement = (layout: LayoutElement) => {
    if (layout.x_axis_name === "HEMO_VALUE") {
      return (
        <div key={layout.i} className={"parent-node" + layout.i}>
          {/* <svg> */}
            <DumbbellChart yAxis={layout.y_axis_name} chartId={layout.i} />
          {/* </svg> */}
          <span
            className="remove"
            style={removeStyle}
            // onClick={this.onRemoveItem.bind(this, layoutE.i)}
          >
            x
          </span>
        </div>
      );
    }
    return (<div
      //onClick={this.onClickBlock.bind(this, layoutE.i)}
      key={layout.i}
      className={"parent-node" + layout.i}
      // data-grid={layoutE}
    >
      {/* <header>chart #{layout.i}</header> */}
      {/* <svg > */}
        <BarChartVisualization
          xAxis={layout.x_axis_name}
          yAxis={layout.y_axis_name}
          // class_name={"parent-node" + layoutE.i}
          chartId={layout.i}
          // set_selection_handler={this.SetSelectionHandler}

          //plot_type={layoutE.plot_type}
        />
      {/* </svg> */}
      <span
        className="remove"
        style={removeStyle}
       // onClick={this.onRemoveItem.bind(this, layoutE.i)}
      >
        x
      </span>
    </div>);
  }

  return (
    <LayoutDiv>
      <div >
        <UserControl />
      </div>
      <Container>
        <ResponsiveReactGridLayout
          // onLayoutChange={this._onLayoutChange}
          // onBreakpointChange={this._onBreakpointChange}
          className="layout"
          cols={colData}
          rowHeight={300}
          width={1200}
          //cols={2}
          //breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
         // layouts={{ lg: layoutArray }}
        >
          {layoutArray.map(layoutE => {
            return createElement(layoutE);
          })}
        </ResponsiveReactGridLayout>
      </Container>
    </LayoutDiv>
  );
}

export default inject('store')(observer(App));

const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;