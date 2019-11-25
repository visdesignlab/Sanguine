import React, { Component } from 'react';
//import Dropdown from 'react-dropdown'
import 'react-dropdown/style.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './App.css';
import 'd3';
import BarChart from './BarChart';
//import ScatterPlot from './ScatterPlot';
import * as Space from 'react-spaces'
import  { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import Select from 'react-select';
import makeAnimated from 'react-select/animated'
import ScatterPlot from './ScatterPlot';
import Headroom from 'react-headroom';
import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";
import { element } from 'prop-types';

//const ResponsiveReactGridLayout = WidthProvider(Responsive);
interface LayoutElement{
  x_axis_name: string,
  y_axis_name: string,
  year_range: number[],
  filter_selection: string[]
  i: string,
  x: number,
  y: number,
  w: number,
  h: number
}
export interface StyledCardState{
  surgery_type: []
  layout: LayoutElement[]
}

interface PropsCard{
    className?: string
}


class App extends Component<PropsCard, StyledCardState> {
  x_axis: string;
  y_axis: string;
  year_range: number[];
  filter_selection: string[];
  current_id: number;
  col_data: { lg: number; md: number; sm: number; xs: number; xxs: number };
  current_select_id: string;

  constructor(prop: Readonly<PropsCard>) {
    super(prop);
    this.current_id = 0;
    this.x_axis = "YEAR";
    this.y_axis = "PRBC_UNITS";
    this.year_range = [2014, 2019];
    this.filter_selection = [];
    this.state = {
      surgery_type: [],
      layout: []
    };
    this.col_data = {
      lg: 12,
      md: 10,
      sm: 6,
      xs: 4,
      xxs: 2
    };
    this.current_select_id = "-1";
  }
  animatedComponents = makeAnimated();

  componentDidMount() {
    //Populate the filter of all procedures, API call gets a list of procedures from the table

    fetch("http://localhost:5000/bloodvis/api/get_attributes", {
      method: "GET"
    })
      .then(res => res.json())
      .then(data => {
        console.log(data);
        this.setState({ surgery_type: data.result });
      })
      .catch(console.log);
  }

  _handleChangeX = (event: any) => {
    this.x_axis = event.value;
  };
  _handleChangeY = (event: any) => {
    this.y_axis = event.value;
  };
  _onHandleYear = (event: any) => {
    this.year_range = event;
  };
  _onSelectFilter = (event: any) => {
    if (event != null) {
      this.filter_selection = event.map((d: any) => d.label);
    }
  };

  _generate_new_graph = (event: any) => {
    let new_element: LayoutElement = {
      x_axis_name: this.x_axis,
      y_axis_name: this.y_axis,
      year_range: this.year_range,
      filter_selection: this.filter_selection,
      i: this.current_id.toString(),
      x: (this.state.layout.length * 2) % (this.col_data.sm || 12),
      y: Infinity,
      w: 2,
      h: 2
    };
    this.current_id += 1;
    this.setState({
      layout: this.state.layout.concat(new_element)
    });
    console.log(this.state.layout);
  };

  _onLayoutChange = (event: any) => {
    this.forceUpdate();
    console.log(event);
    console.log(this.state.layout);
  };

  _onBreakpointChange = (event: any) => {};

  onRemoveItem = (event: any) => {
    let new_layout_array = this.state.layout.filter(
      element => element.i != event
    );
    this.setState({ layout: new_layout_array });
  };

  onClickBlock = (event: any) => {
    //  console.log(event)
    if (this.current_select_id === event) {
      this.current_select_id = "-1"
    }
    else {
      this.current_select_id = event;
    }
    
    this.forceUpdate();
    console.log(this.current_select_id);
  };

  _change_selected = (eve: any) => {
    const that = this
    
    let new_layout: LayoutElement[] = this.state.layout.map((layoutE) => {
      if (layoutE.i === that.current_select_id) {
        layoutE = {
          x_axis_name: that.x_axis,
          y_axis_name: that.y_axis,
          year_range: that.year_range,
          filter_selection: that.filter_selection,
          i: layoutE.i,
          x: layoutE.x,
          w: layoutE.w,
          y: layoutE.y,
          h: layoutE.h
        };
      }
      return layoutE
    })
    this.current_select_id = '-1'
    
    this.setState({
      layout: new_layout
    })
    // this.forceUpdate()
    console.log(this.state.layout, new_layout)

  }

  createElement(layoutE: LayoutElement) {
    const removeStyle = {
      position: "absolute" as "absolute",
      right: "2px",
      top: 0,
      cursor: "pointer"
    };
    //console.log(layoutE)

    return (
      <div
        key={layoutE.i}
        className={"parent-node" + layoutE.i}
        data-grid={layoutE}
        onClick={this.onClickBlock.bind(this, layoutE.i)}
      >
        {/* <span className="text">{"wowowowow" + layoutE.i}</span> */}
        <div>
          <BarChart
            x_axis_name={layoutE.x_axis_name}
            y_axis_name={layoutE.y_axis_name}
            year_range={layoutE.year_range}
            filter_selection={layoutE.filter_selection}
            class_name={"parent-node" + layoutE.i}
            is_selected={this.current_select_id === layoutE.i}
          ></BarChart>
        </div>
        <span
          className="remove"
          style={removeStyle}
          onClick={this.onRemoveItem.bind(this, layoutE.i)}
        >
          x
        </span>
      </div>
    );
  }

  render() {
    let blood_options = [
      { value: "PRBC_UNITS", label: "PRBC_UNITS" },
      { value: "FFP_UNITS", label: "FFP_UNITS" },
      { value: "PLT_UNITS", label: "PLT_UNITS" },
      { value: "CRYO_UNITS", label: "CRYO_UNITS" }
    ];
    let x_axis_selection = [
      { value: "SURGEON_ID", label: "SURGEON_ID" },
      { value: "YEAR", label: "YEAR" },
      { value: "ANESTHOLOGIST_ID", label: "ANESTHOLOGIST_ID" }
    ];
    return (
      // <Headroom>
      //   <h1>Add New Graph</h1>
      // </Headroom>
      <Space.Fixed height={950}>
        <Space.Left size="20%" className="sidebar">
          <Space.Top size="25%" className="sidebar">
            <p>x axis</p>
            <Select
              options={x_axis_selection}
              onChange={this._handleChangeX}
              defaultInputValue={"YEAR"}
              //value={this.state.x_axis_1}
              //placeholder="x_axis"
            />
            <p>y axis</p>
            <Select
              options={blood_options}
              onChange={this._handleChangeY}
              defaultInputValue={"PRBC_UNITS"}
              // value={this.state.y_axis_1}
              // placeholder="y_axis"
            />
          </Space.Top>
          <Space.Fill className="sidebar">
            <Space.Top size="20%" className="sidebar">
              <Range
                min={2014}
                max={2019}
                defaultValue={[2014, 2019]}
                marks={
                  {
                    2014: 2014,
                    2015: 2015,
                    2016: 2016,
                    2017: 2017,
                    2018: 2018,
                    2019: 2019
                  } as any
                }
                onAfterChange={this._onHandleYear}
              />
            </Space.Top>
            <Space.Fill className="sidebar">
              <p>Optional Filters</p>
              <Select
                closeMenuOnSelect={false}
                components={this.animatedComponents}
                isMulti
                options={this.state.surgery_type}
                onChange={this._onSelectFilter}
              />
              <button onClick={this._generate_new_graph}>Generate New</button>
              <button onClick={this._change_selected}>Change Selected</button>
              {/* <p>confirm</p>
              <button onClick={this._renderOnFirst}>Render on 1</button>
              <button onClick={this._renderOnSecond}>Render on 2</button> */}
            </Space.Fill>
          </Space.Fill>
        </Space.Left>
        <Space.Fill>
          <ResponsiveReactGridLayout
            onLayoutChange={this._onLayoutChange}
            onBreakpointChange={this._onBreakpointChange}
            className="layout"
            cols={this.col_data}
            // rowHeight={30}
            width={1200}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          >
            {this.state.layout.map(layoutE => this.createElement(layoutE))}
          </ResponsiveReactGridLayout>
        </Space.Fill>
      </Space.Fixed>
    );
  }
}

export default App;
