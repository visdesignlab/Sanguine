import { Component } from 'react';
import * as d3 from "d3";
import { scaleThreshold } from 'd3';

interface DataPoint {
  x_axis: any,
  y_axis: number,
  visit_no:number
}
interface ScatterPlotState {
  y_axis_name: string,
  x_axis_name: string,
  data: DataPoint[],
  y_max: number,
  year_range: string,
  filter_selection: string,
  class_name: string,
  //per_case: boolean,
  // plot_type:string
}
interface ScatterPlotProps {
  y_axis_name: string,
  x_axis_name: string,
  year_range: number[],
  filter_selection: string[]
  class_name: string,
  //per_case: boolean,
  chart_id: string,
  // plot_type:string

}
//TODO Pass down the width and height from the flexible grid layout
//Instead of retrieving from BoundingBox
//It doesn't align correctly

class ScatterPlot extends Component<
  ScatterPlotProps,
  ScatterPlotState
  > {
  constructor(props: Readonly<ScatterPlotProps>) {
    super(props);
    this.state = {
      y_axis_name: this.props.y_axis_name,
      x_axis_name: this.props.x_axis_name,
      data: [],
      y_max: -1,
      year_range: this.props.year_range.toString(),
      filter_selection: this.props.filter_selection.toString(),
      class_name: this.props.class_name,
     // per_case: this.props.per_case,
      // plot_type:"scatter"
      //data: this.fetch_data_with_year()
    };
  }

  componentDidMount() {
    //console.log(this.props);
    
    let svg = d3
      .select("." + this.state.class_name)
      .select("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("id", this.state.class_name + "-svg");
    svg.selectAll('rect').remove();
    svg.selectAll('circle').remove();
    svg.append("g").attr("id", "x-axis");
    svg.append("g").attr("id", "y-axis");
    svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "end");
    svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "end");
    
    svg.append("g").attr("id","all-dots");

    let circle_tooltip = svg
      .append("g")
      .attr("class", "circle-tooltip")
      .style("display", "none");
    circle_tooltip
      .append("rect")
      .attr("width", 30)
      .attr("height", 20)
      .attr("fill", "white")
      .style("opacity", 0.5);

    circle_tooltip
      .append("text")
      .attr("x", 15)
      .attr("dy", "1.2em")
      .style("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold");
    this.fetch_data_with_year();
  }
  componentWillReceiveProps(nextProps: ScatterPlotProps) {
    const filter_selection = nextProps.filter_selection.toString();
    const year_range = nextProps.year_range.toString();
    //give a single case where per_case change
    //no need to request all new data
    if (
      nextProps.y_axis_name !== this.state.y_axis_name ||
      nextProps.x_axis_name !== this.state.x_axis_name ||
      filter_selection !== this.state.filter_selection ||
      year_range !== this.state.year_range 
   ) {
      this.setState(
        {
          y_axis_name: nextProps.y_axis_name,
          x_axis_name: nextProps.x_axis_name,
          year_range: year_range,
          filter_selection: filter_selection,
          //per_case: nextProps.per_case,
          //  plot_type: nextProps.plot_type
        },
        this.fetch_data_with_year
      );

      console.log(this.state);

      // this.fetch_data_with_year()
      console.log("new props");
    } else {
      this.drawChart();
    }
  }

  fetch_individual(visit_no:number) {
    fetch(`http://localhost:5000/bloodvis/api/indvidual_record/?visit_no=${visit_no}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    ).then(res => res.json())
      .then(data => { 
        //data = JSON.parse(data.table[0])
        let array_of_table = Object.keys(data.table[0]).map(function (key) {
          return [key, data.table[0][key]];
        });
        d3.select('.individual-info').selectAll('table').remove();
        let table = d3.select('.individual-info').append('table');
        let tablebody = table.append('tbody')
        let rows = tablebody.selectAll('tr').data(array_of_table).enter().append('tr');
        rows.selectAll('td')
          .data(d=>d)
          .enter()
          .append('td')
          .text(d=>d)
        
     })
    
  }

  fetch_data_with_year() {
    // const year_max = this.state.year_range[1]
    // const year_min = this.state.year_range[0];
    const year_range = this.state.year_range;
    const x_axis = this.state.x_axis_name;
    const y_axis = this.state.y_axis_name;
    const filter_selection = this.state.filter_selection;

    //TODO if scatterplot, then this should be banded bar chart

    
      fetch(`http://localhost:5000/bloodvis/api/get_static/?x_axis=${x_axis}&y_axis=${y_axis}&year_range=${year_range}&filter_selection=${filter_selection.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          }
        }
      )
        .then(res => res.json())
        .then(data => {
          data = data.task;
          //   console.log(data)
          if (data) {
            let y_max = -1;
            let cast_data = (data as any).map(function (ob: any) {
              let y_val =  ob.y_axis;
              if (y_val > y_max) {
                y_max = y_val;
              }
              let visit_no=parseInt(ob.visit_no)
              let new_ob: DataPoint = {
                x_axis: ob.x_axis,
                y_axis: y_val,
                visit_no: visit_no
              };
              return new_ob;
            });
            this.setState({ data: cast_data, y_max: y_max },
              this.drawChart);
          } else {
            console.log("something wrong");
          }
        });
    }
    

  drawChart() {
    let data = this.state.data;
    const y_max = this.state.y_max;
    const that = this;
    const svg = d3.select("#" + this.state.class_name + "-svg");
    //  const div = (d3.select("."+this.state.class_name)as any).node()
    svg.attr("width", "100%").attr("height", "100%");
    // console.log(div.style.width, div.style.height)
    //   const width = window.getComputedStyle(div).width;
    //   const height = window.getComputedStyle(div).height;
    const width = (svg as any).node().getBoundingClientRect().width;
    const height = (svg as any).node().getBoundingClientRect().height;
    //    console.log(width, height);
    const offset = 20;

    let y_scale = d3
      .scaleLinear()
      .domain([0, 1.05 * y_max])
      .range([height, offset]);
    let x_scale: any;
    // if (this.state.plot_type === "scatter" && this.state.x_axis_name==="HEMO_VALUE") {
    let x_max = -1;
    let x_min = Infinity;
    data.map(d => {
      let x_val = d.x_axis;

      if (x_val > x_max) {
        x_max = x_val
      }
      if (x_val < x_min) {
        x_min = x_val
      }
    })
    x_scale = d3.scaleLinear().domain([0.95 * x_min, 1.05 * x_max]).range([35, width])
    const circle_tooltip = svg.select(".circle-tooltip")

    let dots = svg
          .select("#all-dots")
          .selectAll(".dots")
          .data(data);

        dots.exit().remove();
        dots = (dots as any)
          .enter()
          .append("circle")
          .merge(dots as any);
        dots
          // .attr("cx", (d: any) => x_scale(d.x_axis) as any + x_scale.bandwidth()*0.5)
          .attr("cx", (d: any) => x_scale(d.x_axis) as any )
          .attr("cy", (d: any) => y_scale(d.y_axis))
          .attr("r", "2px")
          .classed("dots", true)
          .attr("fill", "#072F5F")
          .attr("opacity", "1")
          .attr("transform", "translate(0,-" + offset + ")")
          .on('click', function (d) {
            console.log(d.visit_no)
            that.fetch_individual(d.visit_no)
            d3.event.stopPropagation();
            
          })
          .on("mouseover", function () {
            circle_tooltip.style("display", null);
          })
          .on("mouseout", function() {
            circle_tooltip.style("display", "none");
          })
          .on("mousemove", function(d) {
            var xPosition = d3.mouse(this as any)[0] - 20;
            var yPosition = d3.mouse(this as any)[1] - 40;
            circle_tooltip.attr(
              "transform",
              "translate(" + xPosition + "," + yPosition + ")"
             );
            circle_tooltip
              .select("text")
              .text(Math.round(d.y_axis * 100) / 100);
          });

    const x_axis = d3.axisBottom(x_scale);
    const y_axis = d3.axisLeft(y_scale);

    svg
      .select("#x-axis")
      .attr("transform", "translate(0," + (height - offset) + ")")
      .call(x_axis as any);

    svg
      .select("#y-axis")
      .attr("transform", "translate(35,-" + offset + ")")
      .call(y_axis as any);
  }



  render() {
    return [];
  }
}

export default ScatterPlot;