import { Component } from 'react';
import * as d3 from "d3";

interface DataPoint {
    x_axis: any,
    y_axis: number
}
interface ChartComponentState {

  data: DataPoint[],
  y_max: number,
  value_to_highlight: number,
 

}
interface ChartComponentProps{
  y_axis_name: string,
  x_axis_name: string,
  year_range:number[],
  filter_selection: string[]
  class_name: string,
  per_case: boolean,
  chart_id: string,
  current_select_case: number
    
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
      data: [],
      y_max: -1,
      value_to_highlight: NaN
    };
  }

  componentDidMount() {
    
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
      .text("chart #" + this.props.chart_id)
      .attr("alignment-baseline", "hanging")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-size", "10px");

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

  componentDidUpdate(prevProps: ChartComponentProps) {
    
    if (this.props.filter_selection !== prevProps.filter_selection ||
      this.props.x_axis_name !== prevProps.x_axis_name ||
      this.props.y_axis_name !== prevProps.y_axis_name ||
      this.props.year_range !== prevProps.year_range ||
      this.props.per_case !== prevProps.per_case) {
      this.fetch_data_with_year();
    }
    else if (this.props.current_select_case !== prevProps.current_select_case) {
      this.fetch_select_patient_info();
    }
      else {
        this.subdrawChart();
      }
    }
  

  fetch_data_with_year() {
    const year_range = this.props.year_range;
    const x_axis = this.props.x_axis_name;
    const y_axis = this.props.y_axis_name;
    const filter_selection = this.props.filter_selection;
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
          let cast_data = (data as any).map(function (ob: any) {
            
            let y_val = that.props.per_case
              ? ob.y_axis / ob.case_count
              : ob.y_axis;
            
            y_max = y_val > y_max ? y_val : y_max;

            let new_ob: DataPoint = {
              x_axis: ob.x_axis,
              y_axis: y_val
            };
            return new_ob;
          });
          this.setState({ data: cast_data, y_max: y_max },
            this.drawChart);
        } else {
          console.log("something wrong");
        }
      });}

  fetch_select_patient_info() {
    fetch(`http://localhost:8000/api/request_individual_specific?case_id=${this.props.current_select_case}&attribute=${this.props.x_axis_name}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
    ).then(res => res.json())
      .then(data => {
        this.setState({ value_to_highlight: data.result[0].result },
        this.subdrawChart)
        
      })
      ;
  
  }


  drawChart() {
    if (this.props.current_select_case) {
      this.fetch_select_patient_info();
    } else {
      this.subdrawChart();
    }
  }
  
  subdrawChart() {
    
    const data = this.state.data;
    const y_max = this.state.y_max
    const x_vals = data
      .map(function(dp) {
        return dp.x_axis;
      })
      .sort();
    const svg = d3.select("#" + this.props.class_name + "-svg");
    svg.attr("width", "100%").attr("height", "100%");
    const width = (svg as any).node().getBoundingClientRect().width;
    const height = (svg as any).node().getBoundingClientRect().height;
    
    const offset = {left:70, bottom:40,right:10, top:20}
    let y_scale = d3
      .scaleLinear()
      .domain([0, 1.1*y_max])
      .range([height-offset.top, offset.bottom]);
    let x_scale:any;
    
      x_scale = d3
        .scaleBand()
        .domain(x_vals)
        .range([offset.left, width-offset.right])
        .paddingInner(0.1);
    const rect_tooltip = svg.select(".rect-tooltip");

    
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
      .attr("height", (d: any) => height - y_scale(d.y_axis)-offset.top)
      .attr("fill", "#072F5F")
      .attr("opacity", d => {
        if (this.state.value_to_highlight) {
          return d.x_axis===this.state.value_to_highlight?1:0.5
        }
        return 1
      })
      .attr("transform", "translate(0,-" + (offset.bottom-offset.top) + ")")
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
      .attr("transform", "translate(0," + (height - offset.bottom) + ")")
      .call(x_axis as any);

    svg
      .select("#y-axis")
      .attr("transform", "translate("+offset.left+",-" + (offset.bottom-offset.top) + ")")
      .call(y_axis as any);
    
     svg
       .select(".x-label")
       .attr("x", width-10)
       .attr("y", height-10)
       .attr("alignment-baseline", "baseline")
       .attr("font-size", "10px")
       .attr('text-anchor','end')
       .text(this.props.x_axis_name);
    
    svg
      .select(".y-label")
     // .attr("dy", ".75em")
      .attr("y", offset.top+5)
      .attr('x',-offset.top-5)
      .attr("font-size", "10px")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .text(this.props.y_axis_name);

 
  }
  render() {
    return [];
  }
}

export default ChartComponent;