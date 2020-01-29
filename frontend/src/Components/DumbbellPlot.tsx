import { Component } from 'react';
import * as d3 from "d3";
import { SelectSet } from '../App';

interface DataPoint {
  start_x_axis: number,
  end_x_axis:number,
  y_axis: number,
  visit_no: number,
  case_id: number,
  YEAR: number,
  SURGEON_ID: number,
  ANESTHOLOGIST_ID: number
}
interface DumbbellPlotState {
    
    data: DataPoint[],
    y_max: number,
    x_max: number,
    x_min:number,
   
}
interface DumbbellPlotProps {
    y_axis_name: string,
    x_axis_name: string,
    year_range: number[],
    filter_selection: string[]
    class_name: string,
    //per_case: boolean,
    chart_id: string,
    // plot_type:string
    ID_selection_handler: (id: number) => void,
  current_select_case: number,
  current_select_set:SelectSet|null

}

//TODO Pass down the width and height from the flexible grid layout
//Instead of retrieving from BoundingBox
//It doesn't align correctly

class DumbbellPlot extends Component<DumbbellPlotProps, DumbbellPlotState> {
  constructor(props: Readonly<DumbbellPlotProps>) {
    super(props);
    this.state = {
      data: [],
      y_max: -1,
      x_max: -1,
      x_min: 100,
     
    };
  }

  componentDidMount() {
    let svg = d3
      .select("." + this.props.class_name)
      .select("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("id", this.props.class_name + "-svg");
    svg.selectAll("rect").remove();
    svg.selectAll("circle").remove();
    svg.append("g").attr("id", "x-axis");
    svg.append("g").attr("id", "y-axis");
     svg
       .append("text")
       .text("chart #" + this.props.chart_id)
       .attr("alignment-baseline", "hanging")
       .attr("x", 0)
       .attr("font-size", "10px")
       .attr("y", 0);
    svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "end");
    svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "end");

    svg.append("g").attr("id", "all-dots");

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


  componentDidUpdate(prevProps: DumbbellPlotProps) {
        if (!(this.props.current_select_case=== prevProps.current_select_case)){
          this.drawChart();
        } else if (this.props.y_axis_name !== prevProps.y_axis_name ||
          this.props.year_range !== prevProps.year_range ||
          this.props.filter_selection !== prevProps.filter_selection 
        ) {
          this.fetch_data_with_year()
          
        }
  }
  
  fetch_data_with_year() {
    const year_range = this.props.year_range;
    const y_axis = this.props.y_axis_name;
    const filter_selection = this.props.filter_selection;
    let transfused_dict = {} as any;
    fetch(
      `http://localhost:8000/api/request_transfused?transfusion_type=${y_axis}&year_range=${year_range}&filter_selection=${filter_selection.toString()}`,
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
        let transfused_result = data.result;

        transfused_result.forEach((element: any) => {
          transfused_dict[element.case_id] = {
            transfused: element.transfused,
            year: element.YEAR,
            surgeon_id: element.SURGEON_ID,
            anesth_id: element.ANESTHOLOGIST_ID
          };
        });
      });
    fetch(`http://localhost:8000/api/hemoglobin`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(data => {
        data = data.result;
        let y_max = 0;
        let x_min = Infinity;
        let x_max = 0;
        console.log(data);
        if (data) {
          let cast_data = data.map((ob: any) => {
            const begin_x = +ob.hemo[0];
            const end_x = +ob.hemo[1];
            let y_axis_val
            if (transfused_dict[ob.case_id]) {
               y_axis_val = transfused_dict[ob.case_id].transfused;
            }
            //This filter out anything that has empty value
            if (y_axis_val) {
              y_max = y_axis_val > y_max ? y_axis_val : y_max;
              x_min = begin_x < x_min ? begin_x : x_min;
              x_min = end_x < x_min ? end_x : x_min;
              x_max = begin_x > x_max ? begin_x : x_max;
              x_max = end_x > x_max ? end_x : x_max;

              let new_ob: DataPoint = {
                start_x_axis: begin_x,
                end_x_axis: end_x,
                visit_no: ob.visit_id,
                y_axis: y_axis_val,
                case_id: ob.case_id,
                YEAR: transfused_dict[ob.case_id].year,
                ANESTHOLOGIST_ID: transfused_dict[ob.case_id].anesth_id,
                SURGEON_ID: transfused_dict[ob.case_id].surgeon_id
              };
              return new_ob;
            }
          });
          cast_data = cast_data.filter((d: any) => d);
          console.log(cast_data);
          this.setState(
            {
              data: cast_data,
              y_max: y_max,
              x_max: x_max,
              x_min: x_min
            },
            this.drawChart
          );
        }
      });
  }

  drawChart() {
    let data = this.state.data;
    const y_max = this.state.y_max;
    console.log(data);
    const that = this;
    const svg = d3.select("#" + this.props.class_name + "-svg");
    svg.attr("width", "100%").attr("height", "100%");
    const width = (svg as any).node().getBoundingClientRect().width;
    const height = (svg as any).node().getBoundingClientRect().height;
    //const offset = 20;
    const offset = { left: 70, bottom: 40, right: 10, top: 20 };

    let y_scale = d3
      .scaleLinear()
      .domain([0, 1.1 * y_max])
      .range([height-offset.top, offset.bottom]);
    let x_scale: any;
    x_scale = d3
      .scaleLinear()
      .domain([0.9 * this.state.x_min, 1.1 * this.state.x_max])
      .range([offset.left, width-offset.right]);
    const circle_tooltip = svg.select(".circle-tooltip");
    let components = svg
      .select("#all-dots")
      .selectAll("g")
      .data(data);
    components.exit().remove();
    components = (components as any)
      .enter()
      .append("g")
      .merge(components as any);
    components.selectAll("circle").remove();
    components.selectAll("rect").remove();
    components
      .append("circle")
      .attr("cx", (d: any) => x_scale(d.start_x_axis) as any)
      .attr("cy", (d: any) => y_scale(d.y_axis))
      .attr("r", "1%")
      .attr("fill", "#ba9407")
      .attr("opacity", d => {
        if (d.start_x_axis === 0) {
          return 0;
        }
        if (that.props.current_select_case) {
          return d.case_id === that.props.current_select_case ? 1 : 0.5;
        } else if (that.props.current_select_set) {
          switch (that.props.current_select_set.set_name) {
            case "YEAR":
              return d.YEAR === that.props.current_select_set.set_value
                ? 1
                : 0.5;
            case "SURGEON_ID":
              return d.SURGEON_ID === that.props.current_select_set.set_value
                ? 1
                : 0.5;
            case "ANESTHOLOGIST_ID":
              return d.ANESTHOLOGIST_ID ===
                that.props.current_select_set.set_value
                ? 1
                : 0.5;
            default:
              return d.y_axis ? 1 : 0;
          }
        } else {
          return d.y_axis ? 1 : 0;
        }
      });
    components
      .append("circle")
      .attr("cx", (d: any) => x_scale(d.end_x_axis) as any)
      .attr("cy", (d: any) => y_scale(d.y_axis))
      .attr("r", "1%")
      .attr("fill", "#20639B")
      .attr("opacity", d => {
        if (d.end_x_axis=== 0) {
          return 0;
        }
        if (that.props.current_select_case) {
          return d.case_id === that.props.current_select_case ? 1 : 0.5;
        } else if (that.props.current_select_set) {
          switch (that.props.current_select_set.set_name) {
            case "YEAR":
              return d.YEAR === that.props.current_select_set.set_value
                ? 1
                : 0.5;
            case "SURGEON_ID":
              return d.SURGEON_ID === that.props.current_select_set.set_value
                ? 1
                : 0.5;
            case "ANESTHOLOGIST_ID":
              return d.ANESTHOLOGIST_ID ===
                that.props.current_select_set.set_value
                ? 1
                : 0.5;
            default:
              return d.y_axis ? 1 : 0;
          }
        }
        return d.y_axis ? 1 : 0;
        
      });
    components
      .append("rect")
      .attr("x", (d: any) => {
        const start = x_scale(d.start_x_axis);
        const end = x_scale(d.end_x_axis);
        const returning = start > end ? end : start;
        return returning;
      })
      .attr("y", (d: any) => y_scale(d.y_axis) - 1)
      .attr("height", "2px")
      .attr("opacity", d => {
        if (d.start_x_axis === 0 || d.end_x_axis === 0) {
          return 0
        }
        return d.y_axis ? 0.5 : 0
      })
      .attr("width", (d: any) =>
        Math.abs(x_scale(d.end_x_axis) - x_scale(d.start_x_axis))
    );
    
    components
      .attr("transform", "translate(0,-" + (offset.bottom-offset.top) + ")")
      .on("mouseover", function() {
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
          .text(
            "start " +
              d.start_x_axis +
              " end " +
              d.end_x_axis +
              " transfused " +
              d.y_axis
          );
      })
      .on("click", function(d) {
        // console.log(d.visit_no);
        // that.props.ID_selection_handler(d.visit_no);
        console.log(d.case_id)
        that.props.ID_selection_handler(d.case_id)
        d3.event.stopPropagation();
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
        "translate(" + offset.left + ",-" + (offset.bottom-offset.top) + ")"
      )
      .call(y_axis as any);
    svg
      .select(".x-label")
      .attr("x", width-10)
      .attr("y", height-10)
       .attr("alignment-baseline", "baseline")
       .attr("font-size", "10px")
       .attr('text-anchor','end')
      .text("hemoglobin");

    svg
      .select(".y-label")
      .attr("y", offset.top + 5)
      .attr("x", -offset.top - 5)
      .attr("font-size", "10px")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .text(this.props.y_axis_name);
  }

  render() {
    return [];
  }
}

export default DumbbellPlot;