import React, { Component } from 'react';
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './App.css';
// import 'd3';
import ChartComponent from "./ChartComponent";
import Grid from "hedron";
import  { Range } from "rc-slider";
import "rc-slider/assets/index.css";
import Select from 'react-select';
import makeAnimated from 'react-select/animated'
import ScatterPlot from './ScatterPlot';
import DumbbellPlot from './DumbbellPlot'
import { Responsive as ResponsiveReactGridLayout } from "react-grid-layout";
import Toggle from "react-toggle";
import "react-toggle/style.css";
import * as ProvenanceLibrary from '@visdesignlab/provenance-lib-core/lib/src/index.js'
import * as d3 from "d3";

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
  h: number,
  plot_type: string
}

function CreateProvenance(provenance: ProvenanceLibrary.Provenance<NodeState>) {
  return {
    currentState: () => provenance.graph().current.state
  }
}


export interface NodeState {
  nodes: {
    layout_array: LayoutElement[]
    current_selected: string
    };//this is the grid ID number to the list of props for the 
  }

const initialState: NodeState = {
  nodes: {
    layout_array: [],
    current_selected: "-1"
    }
  }

export interface StyledCardState {
  surgery_type: [];
  layout: LayoutElement[];
  percase: boolean;
  chart_type_change: string;
  x_axis_change: string;
  y_axis_change: string;
  current_select_patient: number;
}

interface PropsCard{
    className?: string
}


class App extends Component<PropsCard, StyledCardState> {
  x_axis: string;

  //current_select_patient: number[];
  //current_select_patient: number;
  y_axis: string;
  year_range: number[];
  filter_selection: string[];
  current_id: number;
  col_data: { lg: number; md: number; sm: number; xs: number; xxs: number };
  current_select_id: string;

  provenance: ProvenanceLibrary.Provenance<NodeState>;
  provenanceApp: { currentState: () => NodeState };

  constructor(prop: Readonly<PropsCard>) {
    super(prop);
    this.current_id = 0;

    //this.current_select_patient = []
    // this.current_select_patient = NaN;

    this.x_axis = "YEAR";

    this.y_axis = "PRBC_UNITS";
    this.year_range = [2014, 2019];
    this.filter_selection = [];
    let currProv = this.setupProvenance();
    this.provenance = currProv[0] as ProvenanceLibrary.Provenance<NodeState>;
    this.provenanceApp = currProv[1] as { currentState: () => NodeState };

    this.state = {
      surgery_type: [],
      layout: [],
      percase: false,
      x_axis_change: "",
      y_axis_change: "",
      chart_type_change: "",
      current_select_patient: NaN
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
  /**
   * Set up the provenance tracking
   */
  setupProvenance() {
    const provenance = ProvenanceLibrary.initProvenance(initialState);
    const app = CreateProvenance(provenance);
    return [provenance, app];
  }
  /**
   * Populate the filter of all procedures, API call gets a list of procedures from the table
   */
  componentDidMount() {
    fetch("http://localhost:8000/api/get_attributes", {
      method: "GET"
    })
      .then(res => res.json())
      .then(data => {
        // console.log(data);
        this.setState({ surgery_type: data.result });
      })
      .catch(console.log);
  }
  /**
   * Event Handlers for x and y generator change
   */
  _handleChangeX = (event: any) => {
    this.x_axis = event.value;
  };

  _handleChangeY = (event: any) => {
    this.y_axis = event.value;
  };

  _handleChangeXChange = (event: any) => {
    this.setState({ x_axis_change: event.value });
    //this.x_axis_change = event.value;
  };

  _handleChangeYChange = (event: any) => {
    this.setState({ y_axis_change: event.value });
    //  this.y_axis_change = event.value;
  };

  _handleChartTypeChange = (event: any) => {
    this.setState({ chart_type_change: event.value });
    // this.chart_type_change = event.value;
  };

  _onHandleYear = (event: any) => {
    //console.log(event)
    this.year_range = event;
    const new_layout_array = this.state.layout.map(le => {
      le.year_range = event;
      return le;
    });
    this.setState({ layout: new_layout_array });
  };

  _onSelectFilter = (event: any) => {
    if (event != null) {
      this.filter_selection = event.map((d: any) => d.label);
    }

    const new_layout_array = this.state.layout.map(le => {
      le.filter_selection = this.filter_selection;
      return le;
    });
    this.setState({ layout: new_layout_array });
  };

  /**
   * Event handler for creating new graph
   * This add a new layoutelement to the state
   * it updates the provenance that there is update
   */
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
      h: 2,
      plot_type: this.x_axis === "HEMO_VALUE" ? "dumbbell" : "bar"
    };
    this.provenance.applyAction({
      label: this.current_id + "add",
      action: (id: any) => {
        let test = (this.provenanceApp.currentState() as any) as NodeState;
        test.nodes.layout_array = test.nodes.layout_array.concat(new_element);
        return test;
      },
      args: [this.current_id]
    });
    //  console.log(this.provenanceApp.currentState());
    this.current_id += 1;
    //round back to 0 when the current_id has exceeded 100
    if (this.current_id > 100) {
      this.current_id = 0;
    }
    this.setState({
      layout: this.state.layout.concat(new_element)
    });
    console.log(this.state.layout);
  };

  /**
   * When a graph is resized, we need to rerender the chart inside
   */
  _onLayoutChange = (event: any) => {
    this.forceUpdate();
    console.log(event);
    console.log(this.state.layout);
  };

  _onBreakpointChange = (event: any) => {};

  /**
   * Event Handler for redo and undo gesture.
   * Uses provenance to achieve
   *
   */
  undo = (event: any) => {
    console.log(this.state);
    this.provenance.goBackOneStep();
    this.setState({
      layout: this.provenanceApp.currentState().nodes.layout_array
    });
    this.current_select_id = this.provenanceApp.currentState().nodes.current_selected;
    console.log(this.state);
  };

  redo = (event: any) => {
    if (this.provenance.graph().current.children.length === 0) {
      return;
    }
    console.log(this.state);
    this.provenance.goToNode(
      this.provenance.graph().current.children[
        this.provenance.graph().current.children.length - 1
      ]
    );
    this.setState({
      layout: this.provenanceApp.currentState().nodes.layout_array
    });
    this.current_select_id = this.provenanceApp.currentState().nodes.current_selected;
    console.log(this.state);
  };

  onRemoveItem = (id: any, e: any) => {
    if (this.current_select_id === id) {
      this.current_select_id = "-1";
    }
    let new_layout_array = this.state.layout.filter(
      element => element.i !== id
    );
    this.provenance.applyAction({
      label: this.current_id + "remove",
      action: (id: any) => {
        let test = (this.provenanceApp.currentState() as any) as NodeState;
        test.nodes.layout_array = new_layout_array;
        return test;
      },
      args: [this.current_id]
    });

    this.setState({ layout: new_layout_array });
    e.stopPropagation();
  };

  onClickBlock = (event: any) => {
    console.log(event);

    this.current_select_id = event;

    const current_selected_layout = this.state.layout.filter(
      d => d.i === this.current_select_id
    )[0];

    //add provenence for select id
    this.provenance.applyAction({
      label: "change selected id",
      action: (id: any) => {
        let test = (this.provenanceApp.currentState() as any) as NodeState;
        test.nodes.current_selected = event;
        return test;
      },
      args: [this.current_id]
    });

    this.setState({
      x_axis_change: current_selected_layout.x_axis_name,
      y_axis_change: current_selected_layout.y_axis_name,
      chart_type_change: current_selected_layout.plot_type
    });

    console.log(this.current_select_id);
  };

  _change_selected = (eve: any) => {
    const that = this;
    console.log("called");

    let new_layout: LayoutElement[] = this.state.layout.map(layoutE => {
      if (layoutE.i === that.current_select_id) {
        layoutE = {
          x_axis_name: that.state.x_axis_change,
          y_axis_name: that.state.y_axis_change,
          year_range: layoutE.year_range,
          filter_selection: layoutE.filter_selection,
          i: layoutE.i,
          x: layoutE.x,
          w: layoutE.w,
          y: layoutE.y,
          h: layoutE.h,
          plot_type: that.state.chart_type_change
        };
      }
      return layoutE;
    });
    console.log(new_layout);

    // provenance implementation
    // let new_layout_array = this.state.layout.filter(element => element.i !== id);
    this.provenance.applyAction({
      label: this.current_id + "change",
      action: (id: any) => {
        let test = (this.provenanceApp.currentState() as any) as NodeState;
        test.nodes.layout_array = new_layout;
        return test;
      },
      args: [this.current_id]
    });

    this.setState(
      {
        layout: new_layout
      },
      this.forceUpdate
    );
    console.log(this.state.layout, new_layout);
  };

  handlePerCaseChange = (event: any) => {
    this.setState({ percase: event.target.checked });
    this.forceUpdate();
  };

  IDSelectionHandler = (id: number) => {
    //this.current_select_patient = id;
    this.setState({current_select_patient:id},this.fetch_individual);
    //console.log(this.current_select_patient);
   // this.fetch_individual(this.current_select_patient);
   // this.render();
  };

  fetch_individual() {
    console.log(this.state)
    const visit_no = this.state.current_select_patient
    fetch(`http://localhost:8000/api/fetch_individual?visit_no=${visit_no}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(data => {
        //data = JSON.parse(data.table[0])
        let array_of_table = Object.keys(data.table[0]).map(function(key) {
          return [key, data.table[0][key]];
        });
        console.log(array_of_table)
        d3.select(".individual-info")
          .selectAll("table")
          .remove();
        let table = d3.select(".individual-info").append("table");
        let tablebody = table.append("tbody");
        let rows = tablebody
          .selectAll("tr")
          .data(array_of_table)
          .enter()
          .append("tr");
        rows
          .selectAll("td")
          .data(d => d)
          .enter()
          .append("td")
          .text(d => d);
        
      });
  }

  createElement(layoutE: LayoutElement) {
    const removeStyle = {
      position: "absolute" as "absolute",
      right: "2px",
      top: 0,
      cursor: "pointer"
    };
    if (layoutE.y === null) {
      layoutE.y = Infinity;
    }
    //Change this eventually TODO
    //The ScatterPlot is specially designed for individual cases

    if (layoutE.x_axis_name !== "HEMO_VALUE") {
      //if (layoutE.plot_type === "bar") {
      return (
        <div
          onClick={this.onClickBlock.bind(this, layoutE.i)}
          key={layoutE.i}
          className={"parent-node" + layoutE.i}
          data-grid={layoutE}
        >
          <header>chart #{layoutE.i}</header>
          <svg>
            <ChartComponent
              x_axis_name={layoutE.x_axis_name}
              y_axis_name={layoutE.y_axis_name}
              year_range={layoutE.year_range}
              filter_selection={layoutE.filter_selection}
              class_name={"parent-node" + layoutE.i}
              chart_id={layoutE.i}
              per_case={this.state.percase}
              //plot_type={layoutE.plot_type}
            />
          </svg>
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

    //else if (layoutE.plot_type == "scatter") {
    else {
      if (layoutE.plot_type === "scatter") {
        return (
          <div
            onClick={this.onClickBlock.bind(this, layoutE.i)}
            key={layoutE.i}
            className={"parent-node" + layoutE.i}
            data-grid={layoutE}
          >
            <header>chart #{layoutE.i}</header>
            <svg>
              <ScatterPlot
                x_axis_name={layoutE.x_axis_name}
                y_axis_name={layoutE.y_axis_name}
                year_range={layoutE.year_range}
                filter_selection={layoutE.filter_selection}
                class_name={"parent-node" + layoutE.i}
                chart_id={layoutE.i}
                ID_selection_handler={this.IDSelectionHandler}
              />
            </svg>
            <span
              className="remove"
              style={removeStyle}
              onClick={this.onRemoveItem.bind(this, layoutE.i)}
            >
              x
            </span>
          </div>
        );
      } else if (layoutE.plot_type === "dumbbell") {
        return (
          <div
            onClick={this.onClickBlock.bind(this, layoutE.i)}
            key={layoutE.i}
            className={"parent-node" + layoutE.i}
            data-grid={layoutE}
          >
            <header>chart #{layoutE.i}</header>
            <svg>
              <DumbbellPlot
                x_axis_name={layoutE.x_axis_name}
                y_axis_name={layoutE.y_axis_name}
                year_range={layoutE.year_range}
                filter_selection={layoutE.filter_selection}
                class_name={"parent-node" + layoutE.i}
                chart_id={layoutE.i}
                ID_selection_handler={this.IDSelectionHandler}
                current_selected_patient = {this.state.current_select_patient}
              />
            </svg>
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
    }
  }

  render() {
    const y_axis_selection = [
      { value: "PRBC_UNITS", label: "PRBC_UNITS" },
      { value: "FFP_UNITS", label: "FFP_UNITS" },
      { value: "PLT_UNITS", label: "PLT_UNITS" },
      { value: "CRYO_UNITS", label: "CRYO_UNITS" },
      { value: "CELL_SAVER_ML", label: "CELL_SAVER_ML" }
    ];
    const x_axis_selection = [
      { value: "SURGEON_ID", label: "SURGEON_ID" },
      { value: "YEAR", label: "YEAR" },
      { value: "ANESTHOLOGIST_ID", label: "ANESTHOLOGIST_ID" },
      { value: "HEMO_VALUE", label: "HEMOGLOBIN" }
    ];
    const chart_types = [
      { value: "bar", label: "Barchart" },
      { value: "scatter", label: "Scatter Plot" },
      { value: "dumbbell", label: "Dumbbell Plot" }
    ];

    let style_sheet = null;
    //Generate the sheet if a chart is selected
    //TODO change the bind for _change_selected()
    if (this.current_select_id !== "-1") {
      try {
        const current_selected_type = chart_types.filter(
          d => d.value === this.state.chart_type_change
        )[0];
        const current_selected_x_axis = x_axis_selection.filter(
          d => d.value === this.state.x_axis_change
        )[0];
        const current_selected_y_axis = y_axis_selection.filter(
          d => d.value === this.state.y_axis_change
        )[0];

        //TODO change this
        //Problem: Scatter Plot with just bloodproduct vs surgeon is not really useful.
        //To Change: the plot type should change dynamicly based on the selected variables
        style_sheet = (
          <div>
            <p>
              Current Selected Chart{" "}
              {this.current_select_id === "-1" ? "" : this.current_select_id}
            </p>
            <Select
              options={chart_types}
              value={current_selected_type}
              onChange={this._handleChartTypeChange}
            />
            <Select
              options={x_axis_selection}
              value={current_selected_x_axis}
              onChange={this._handleChangeXChange}
            />
            <Select
              options={y_axis_selection}
              value={current_selected_y_axis}
              onChange={this._handleChangeYChange}
            />
            <button onClick={this._change_selected}>Change Selected</button>
          </div>
        );
      } catch (e) {}
    }

    const marks = {
      2014: 2014,
      2015: 2015,
      2016: 2016,
      2017: 2017,
      2018: 2018,
      2019: 2019
    } as any;
    return (
      <Grid.Bounds direction="horizontal">
        <Grid.Box width="18%" height="100%">
          <Grid.Bounds direction="vertical" valign="center">
            <Grid.Box margin="12px">
              <Toggle
                id="percase-status"
                defaultChecked={this.state.percase}
                onChange={this.handlePerCaseChange}
              />
              <label htmlFor="percase-status"> Per Case</label>
              <Range
                min={2014}
                max={2019}
                defaultValue={[2014, 2019]}
                marks={marks}
                onAfterChange={this._onHandleYear}
              />
              <p>Optional Filters</p>
              <Select
                closeMenuOnSelect={false}
                components={this.animatedComponents}
                isMulti
                options={this.state.surgery_type}
                onChange={this._onSelectFilter}
              />
              <p>x axis</p>
              <Select
                options={x_axis_selection}
                onChange={this._handleChangeX}
                defaultInputValue={"YEAR"}
              />
              <p>y axis</p>
              <Select
                options={y_axis_selection}
                onChange={this._handleChangeY}
                defaultInputValue={"PRBC_UNITS"}
              />
              <button onClick={this._generate_new_graph}>Generate New</button>
              <button onClick={this.redo}>Redo</button>
              <button onClick={this.undo}>Undo</button>
            </Grid.Box>
            <Grid.Box border="2px solid palevioletred" margin="12px">
              {style_sheet}
            </Grid.Box>
          </Grid.Bounds>
        </Grid.Box>
        <Grid.Box width="64%">
          <ResponsiveReactGridLayout
            onLayoutChange={this._onLayoutChange}
            onBreakpointChange={this._onBreakpointChange}
            className="layout"
            cols={this.col_data}
            // rowHeight={30}
            width={1200}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          >
            {this.state.layout.map(layoutE => {
              console.log(layoutE);
              return this.createElement(layoutE);
            })}
          </ResponsiveReactGridLayout>
        </Grid.Box>
        <Grid.Box width="18%">
          <div className="individual-info"></div>
        </Grid.Box>
      </Grid.Bounds>
    );
  }
}

export default App;
