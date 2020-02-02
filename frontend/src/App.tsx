import React, { FC } from 'react';
import styled from 'styled-components';
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './App.css';
import UserControl from './Components/UserControl'

// import ChartComponent from "./Components/BarChart";
// import Grid from "hedron";
// import  { Range } from "rc-slider";
// import "rc-slider/assets/index.css";
// import Select from 'react-select';
// import makeAnimated from 'react-select/animated'
// import ScatterPlot from './Components/ScatterPlot';
// import DumbbellPlot from './Components/DumbbellPlot'
// import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";
import {
  Button, Checkbox, Tab, Container
} from 'semantic-ui-react'
import Store from './Interfaces/Store'

//import {provenance} from '.'
// import * as d3 from "d3";


import * as LineUpJS from "lineupjsx";
import { inject, observer } from 'mobx-react';

//const ResponsiveReactGridLayout = WidthProvider(Responsive);





interface OwnProps{
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {
  return (<UserControl></UserControl>)
}

export default inject('store')(observer(App));

const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: min-content min-content 1fr;
`;