import { Component } from 'react';
import * as d3 from "d3";

interface DataPoint {
  x_axis: any,
  y_axis: number,
  visit_no:number
}



interface ScatterPlotState {
  // y_axis_name: string,
  // x_axis_name: string,
  data: DataPoint[],
  y_max: number,
//  year_range: string,
  //filter_selection: string,
  //class_name: string,
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
  ID_selection_handler:(id:number)=>void
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
      // y_axis_name: this.props.y_axis_name,
      // x_axis_name: this.props.x_axis_name,
      data: [],
      y_max: -1,
//      year_range: this.props.year_range.toString(),
  //    filter_selection: this.props.filter_selection.toString(),
   //   class_name: this.props.class_name,
     // per_case: this.props.per_case,
      // plot_type:"scatter"
      //data: this.fetch_data_with_year()
    };
  }

  componentDidMount() {
    //console.log(this.props);
    
    let svg = d3
      .select("." + this.props.class_name)
      .select("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("id", this.props.class_name + "-svg");
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

  componentDidUpdate(prevProps: ScatterPlotProps) {
    if (this.props.y_axis_name !== prevProps.y_axis_name ||
      this.props.x_axis_name !== prevProps.x_axis_name ||
      this.props.filter_selection !== prevProps.filter_selection ||
      this.props.year_range !== prevProps.year_range) {
      this.fetch_data_with_year();
    }
    
  }

  fetch_data_with_year() {
    // const year_max = this.state.year_range[1]
    // const year_min = this.state.year_range[0];
    const year_range = this.props.year_range;
    const x_axis = this.props.x_axis_name;
    const y_axis = this.props.y_axis_name;
    const filter_selection = this.props.filter_selection;
    
    fetch(`http://localhost:8000/api/hemoglobin?x_axis=${x_axis}&y_axis=${y_axis}&year_range=${year_range}&filter_selection=${filter_selection.toString()}`,
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
          data = data.result;
             console.log(data)
          // if (data) {
          //   let y_max = -1;
          //   let cast_data = (data as any).map(function (ob: any) {
          //     let y_val =  ob.y_axis;
          //     if (y_val > y_max) {
          //       y_max = y_val;
          //     }
          //     let visit_no=parseInt(ob.visit_no)
          //     let new_ob: DataPoint = {
          //       x_axis: ob.x_axis,
          //       y_axis: y_val,
          //       visit_no: visit_no
          //     };
          //     return new_ob;
          //   });
          //   this.setState({ data: cast_data, y_max: y_max },
          //     this.drawChart);
          // } else {
          //   console.log("something wrong");
          // }
        });
    }
    

  drawChart() {
    let data = this.state.data;
    const y_max = this.state.y_max;
    const that = this;
    const svg = d3.select("#" + this.props.class_name + "-svg");
    //  const div = (d3.select("."+this.state.class_name)as any).node()
    svg.attr("width", "100%").attr("height", "100%");
    // console.log(div.style.width, div.style.height)
    //   const width = window.getComputedStyle(div).width;
    //   const height = window.getComputedStyle(div).height;
    const width = (svg as any).node().getBoundingClientRect().width;
    const height = (svg as any).node().getBoundingClientRect().height;
    //    console.log(width, height);
    //const offset = 20;
    const offset = { left: 50, bottom: 25 };

    let y_scale = d3
      .scaleLinear()
      .domain([0, 1.1 * y_max])
      .range([height, offset.bottom]);
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
    x_scale = d3.scaleLinear().domain([0.9 * x_min, 1.1 * x_max]).range([offset.left, width])
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
          .attr("r", "1%")
          .classed("dots", true)
          .attr("fill", "#072F5F")
          .attr("opacity", "1")
          .attr("transform", "translate(0,-" + offset.bottom + ")")
          .on('click', function (d) {
            console.log(d.visit_no)
            that.props.ID_selection_handler(d.visit_no)
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
      .attr("transform", "translate(0," + (height - offset.bottom) + ")")
      .call(x_axis as any);

    svg
      .select("#y-axis")
      .attr(
        "transform",
        "translate(" + offset.left + ",-" + offset.bottom + ")"
      )
      .call(y_axis as any);

    svg
      .select(".x-label")
      .attr("x", width)
      .attr("y", height)
      .attr("font-size", "10px")
      .text(this.props.x_axis_name);

    svg
      .select(".y-label")
      .attr("dy", ".75em")
      .attr("y", 6)
      .attr("font-size", "10px")
      .attr("transform", "rotate(-90)")
      .text(this.props.y_axis_name);
  }



  render() {
    return [];
  }
}

export default ScatterPlot;