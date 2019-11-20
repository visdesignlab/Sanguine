import React, { Component } from 'react';
//import Dropdown from 'react-dropdown'
import 'react-dropdown/style.css'
import './App.css';
import 'd3';
import BarChart from './BarChart';
//import ScatterPlot from './ScatterPlot';
import * as Space from 'react-spaces'
import  { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import Select from 'react-select';
import makeAnimated from 'react-select/animated'



export interface StyledCardState{
  y_axis?: string
  x_axis?: string
  year_range?:[]
  filter_selection?:[]
  surgery_type?: []
  // data?: DataPoint[]
  // y_max?:number
  // y_axis_2?: string
  // x_axis_2?: string
}
class App extends Component<StyledCardState> {
  x_axis:string;
  y_axis:string;
  year_range:Number[];
  filter_selection:String[]
  constructor(prop: Readonly<StyledCardState>){
    super(prop)
    this.x_axis="YEAR"
    this.y_axis='PRBC_UNITS'
    this.year_range=[2014,2019]
    this.filter_selection=[]
  }
  state = {
    x_axis: "YEAR",
    y_axis: "PRBC_UNITS",
    year_range:[2014,2019],
    filter_selection:[],
    surgery_type: []
  };
  animatedComponents = makeAnimated();
  

  componentDidMount() {
    fetch('http://localhost:5000/todo/api/v1.0/get_attributes', {
      method:'GET'
    })
      .then(res => res.json())
      .then((data) => {
        console.log(data)
        this.setState({surgery_type:data.result})
      })
      .catch(console.log)
  }

  // fetch_data(x_axis: string, y_axis: string) {
  //   fetch('http://localhost:5000/todo/api/v1.0/tasks', {
  //     method: 'POST',
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       x_axis: x_axis,
  //       y_axis: y_axis,
  //     })
  //   })
  //     .then(res => res.json())
  //     .then((data) => {
  //       data=data.task
  //       if (data) {
  //         let y_max = -1;
  //         let cast_data = (data as any).map(function (ob: any) {
  //           if (ob.y_axis > y_max) {
  //             y_max = ob.y_axis
  //           }
  //           let new_ob: DataPoint = {
  //             x_axis: ob.x_axis,
  //             y_axis: ob.y_axis
  //           }
  //           return new_ob
  //         })
  //         this.setState({ x_axis: x_axis, y_axis: y_axis, data: cast_data, y_max:y_max})
  //         console.log(this.state)
  //       }
  //       else {
  //         console.log('something wrong')
  //       }
  //     })

  // }
  _handleChangeX = (event: any) => {
    //this.setState({ x_axis: event.value });
    this.x_axis = event.value
  };
  _handleChangeY1 = (event: any) => {
    this.y_axis = event.value
    //this.setState({ y_axis: event.value });
  };
  _onHandleYear = (event: any) => {
    this.year_range=event
  };
  _onSelectFilter = (event: any) => {
    if (event != null) {
      this.filter_selection = event.map((d: any) => d.label)
      console.log(this.filter_selection)
    }
  }
  _renderOnFirst=(event:any)=>{
    this.setState({x_axis:this.x_axis,
      y_axis:this.y_axis,
      year_range:this.year_range,
      filter_selection:this.filter_selection})
  }
  _renderOnSecond=(event:any)=>{
    this.setState({x_axis:this.x_axis,y_axis:this.y_axis})
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
              onChange={this._handleChangeY1}
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
              <p>confirm</p>
              <button onClick={this._renderOnFirst}>Render on 1</button>
              <button onClick={this._renderOnSecond}>Render on 2</button>
            </Space.Fill>
          </Space.Fill>

        </Space.Left>
        <Space.Fill>
          <Space.Left size="50%">
            <Space.Top size="50%" className="canvas-1">
              <BarChart
                y_axis_name={this.state.y_axis}
                x_axis_name={this.state.x_axis}
                year_range={this.state.year_range}
                filter_selection = {this.state.filter_selection}
              />
            </Space.Top>
            <Space.Fill></Space.Fill>
          </Space.Left>
          <Space.Fill>
            <Space.Top size="50%"></Space.Top>
            <Space.Fill></Space.Fill>
          </Space.Fill>
        </Space.Fill>
      </Space.Fixed>
    );
  }
}

export default App;
