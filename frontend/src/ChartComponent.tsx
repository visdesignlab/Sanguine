import { Component } from 'react';
import * as d3 from "d3";

interface DataPoint {
    x_axis: any,
    y_axis: number
}
interface ChartComponentState {
  y_axis_name: string,
  x_axis_name: string,
  data: DataPoint[],
  y_max: number,
  year_range: string,
  filter_selection: string,
  class_name: string,
  per_case: boolean,
 // plot_type:string
}
interface ChartComponentProps{
    y_axis_name: string,
    x_axis_name: string,
    year_range:number[],
    filter_selection: string[]
    class_name: string,
  per_case: boolean,
  chart_id: string,
 // plot_type:string
    
}
//TODO Pass down the width and height from the flexible grid layout
//Instead of retrieving from BoundingBox
//It doesn't align correctly

class ChartComponent extends Component<
  ChartComponentProps,
  ChartComponentState
> {
  constructor(props: Readonly<ChartComponentProps>) {
    super(props);
    this.state = {
      y_axis_name: this.props.y_axis_name,
      x_axis_name: this.props.x_axis_name,
      data: [],
      y_max: -1,
      year_range: this.props.year_range.toString(),
      filter_selection: this.props.filter_selection.toString(),
      class_name: this.props.class_name,
      per_case: this.props.per_case,
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
    
    svg.append("g").attr("id", "all-rects");
    //svg.append("g").attr("id","all-dots");

    let rect_tooltip = svg
      .append("g")
      .attr("class", "rect-tooltip")
      .style("display", "none");
    rect_tooltip
      .append("rect")
      .attr("width", 30)
      .attr("height", 20)
      .attr("fill", "white")
      .style("opacity", 0.5);

    rect_tooltip
      .append("text")
      .attr("x", 15)
      .attr("dy", "1.2em")
      .style("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold");
    
    this.fetch_data_with_year();
  }
  componentWillReceiveProps(nextProps: ChartComponentProps) {
    const filter_selection = nextProps.filter_selection.toString();
    const year_range = nextProps.year_range.toString();
    //give a single case where per_case change
    //no need to request all new data
    if (
      nextProps.y_axis_name !== this.state.y_axis_name ||
      nextProps.x_axis_name !== this.state.x_axis_name ||
      filter_selection !== this.state.filter_selection ||
      year_range !== this.state.year_range ||
      nextProps.per_case !== this.state.per_case 
      //nextProps.plot_type !== this.state.plot_type
    ) {
      this.setState(
        {
          y_axis_name: nextProps.y_axis_name,
          x_axis_name: nextProps.x_axis_name,
          year_range: year_range,
          filter_selection: filter_selection,
          per_case: nextProps.per_case,
        //  plot_type: nextProps.plot_type
        },
        this.fetch_data_with_year
      );

      console.log(this.state);

      // this.fetch_data_with_year()
      console.log("new props");
    } else {
      this.drawChart(this.state.data, this.state.y_max);
    }
  }

  fetch_data_with_year() {
    // const year_max = this.state.year_range[1]
    // const year_min = this.state.year_range[0];
    const year_range = this.state.year_range;
    const x_axis = this.state.x_axis_name;
    const y_axis = this.state.y_axis_name;
    const filter_selection = this.state.filter_selection;

    //TODO if scatterplot, then this should be banded bar chart
    
    // if (x_axis === "HEMO_VALUE") {
    //   fetch(`http://localhost:5000/bloodvis/api/get_static/?x_axis=${x_axis}&y_axis=${y_axis}&year_range=${year_range}&filter_selection=${filter_selection.toString()}`,
    //     {
    //       method: "GET",
    //       headers: {
    //         Accept: "application/json",
    //         "Content-Type": "application/json"
    //       }
    //     }
    //   )
    //     .then(res => res.json())
    //     .then(data => {
    //       data = data.task;
    //       //   console.log(data)
    //       const that = this;
    //       if (data) {
    //         let y_max = -1;
    //         let cast_data = (data as any).map(function (ob: any) {
    //           let y_val = that.state.per_case
    //             ? ob.y_axis / ob.case_count
    //             : ob.y_axis;
    //           if (y_val > y_max) {
    //             y_max = y_val;
    //           }
    //           let new_ob: DataPoint = {
    //             x_axis: ob.x_axis,
    //             y_axis: y_val
    //           };
    //           return new_ob;
    //         });
    //         this.setState({ data: cast_data, y_max: y_max });
    //         this.drawChart(cast_data, y_max);
    //       } else {
    //         console.log("something wrong");
    //       }
    //     });
    // }
    // else
    // {
      fetch(
      `http://localhost:8000/api/summarize_with_year?x_axis=${x_axis}&y_axis=${y_axis}&year_range=${year_range}&filter_selection=${filter_selection.toString()}`,
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
        const that = this;
        if (data) {
          let y_max = -1;
          let cast_data = (data as any).map(function(ob: any) {
            let y_val = that.state.per_case
              ? ob.y_axis / ob.case_count
              : ob.y_axis;
            if (y_val > y_max) {
              y_max = y_val;
            }
            let new_ob: DataPoint = {
              x_axis: ob.x_axis,
              y_axis: y_val
            };
            return new_ob;
          });
          this.setState({ data: cast_data, y_max: y_max });
          this.drawChart(cast_data, y_max);
        } else {
          console.log("something wrong");
        }
      });}
//  }

  drawChart(data: DataPoint[], y_max: number) {
    const x_vals = data
      .map(function(dp) {
        return dp.x_axis;
      })
      .sort();
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
      .domain([0, 1.05*y_max])
      .range([height, offset]);
    let x_scale:any;
    // if (this.state.plot_type === "scatter" && this.state.x_axis_name==="HEMO_VALUE") {
    //   let x_max = -1;
    //   let x_min = Infinity;
    //   data.map(d => {
    //     let x_val = d.x_axis;
        
    //     if (x_val > x_max) {
    //       x_max = x_val
    //     }
    //     if (x_val < x_min) {
    //       x_min = x_val
    //     }
    //   })
    //   x_scale = d3.scaleLinear().domain([0.95*x_min, 1.05*x_max]).range([35, width])
      
    // } else {
      x_scale = d3
        .scaleBand()
        .domain(x_vals)
        .range([35, width])
        .paddingInner(0.1);
   // }
    const rect_tooltip = svg.select(".rect-tooltip");
    //const circle_tooltip = svg.select(".circle-tooltip")

    
    let rects = svg
      .select("#all-rects")
      .selectAll(".bars")
      .data(data);

    rects.exit().remove();
    rects = (rects as any)
      .enter()
      .append("rect")
      .merge(rects as any);
    rects
      .attr("x", (d: any) => x_scale(d.x_axis) as any)
      .attr("y", (d: any) => y_scale(d.y_axis))
      .classed("bars", true)
      .attr("width", (d) => { try { return x_scale.bandwidth() } catch{ }})
      .attr("height", (d: any) => height - y_scale(d.y_axis))
      .attr("fill", "#072F5F")
      .attr("opacity", "1")
      .attr("transform", "translate(0,-" + offset + ")")
      .on("mouseover", function() {
        rect_tooltip.style("display", null);
      })
      .on("mouseout", function() {
        rect_tooltip.style("display", "none");
      })
      .on("mousemove", function(d) {
        var xPosition = d3.mouse(this as any)[0] - 20;
        var yPosition = d3.mouse(this as any)[1] - 40;
        rect_tooltip.attr(
          "transform",
          "translate(" + xPosition + "," + yPosition + ")"
        );

        rect_tooltip.select("text").text(Math.round(d.y_axis * 100) / 100);
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
    
    // svg.select(".x-label")
    //   .attr("x", width)
    //   .attr("y", height - 6)
    //   .text(this.state.x_axis_name);
    
    // svg
    //   .select(".y-label")
    //   .attr("dy", ".75em")
    //   .attr("y", 6)
    //   .attr("transform", "rotate(-90)")
    //   .text(this.state.y_axis_name);
    // if (this.state.plot_type === "bar") {
    //   dots.attr('opacity',0)
    //   circle_tooltip.attr('opacity',0)
    //   rect_tooltip.attr('opacity',1)
    // }

    // if (this.state.plot_type === "scatter") {
    //   rects.attr('opacity', 0)
    //   rect_tooltip.attr('opacity',0)
    //   circle_tooltip.attr('opacity',1)
    // }
  }
  render() {
    return [];
  }
}

export default ChartComponent;