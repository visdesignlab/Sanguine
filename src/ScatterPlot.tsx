import React, { Component } from 'react';
import * as d3 from "d3";
interface DataPoint {
    x_axis: any,
    y_axis: number
}
interface StyledCardProps {
    y_axis_name: string
    x_axis_name: string
    //  data: DataPoint[]
    // y_max: number
}
class ScatterPlot extends Component<StyledCardProps> {
    state = {
        y_axis: this.props.y_axis_name,
        x_axis: this.props.x_axis_name,
        data: [],
        y_max: -1
    }
    constructor(props: StyledCardProps) {
        super(props)
        
    }
    componentDidMount() {
        let svg = d3
            .select(".canvas-2")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("id", "canvas-2-svg");
        svg.append("g").attr("id", "x-axis");
        svg.append("g").attr("id", "y-axis");
        svg.append("g").attr("id", "all-dots");

        let tooltip = svg
            .append("g")
            .attr("class", "tooltip")
            .style("display", "none");
        tooltip
            .append("rect")
            .attr("width", 30)
            .attr("height", 20)
            .attr("fill", "white")
            .style("opacity", 0.5);

        tooltip
            .append("text")
            .attr("x", 15)
            .attr("dy", "1.2em")
            .style("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold");
    }
    componentWillReceiveProps(nextProps: StyledCardProps) {
        this.setState({
            x_axis: nextProps.x_axis_name,
            y_axis: nextProps.y_axis_name
            
        })
        console.log(this.state)
        this.fetch_data(nextProps.x_axis_name, nextProps.y_axis_name)
        //   this.drawChart(this.props)
    }
    fetch_data(x_axis:string, y_axis: string) {
        fetch("http://localhost:5000/bloodvis/api/v1.0/get_static", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
            body: JSON.stringify({
                x_axis: x_axis,
                y_axis: y_axis
          })
        })
          .then(res => res.json())
          .then(data => {
              data = data.result;
            if (data) {
                let y_max = -1;
                let x_max = -1;
            
              let cast_data = (data as any).map(function(ob: any) {
                if (ob.y_axis > y_max) {
                  y_max = ob.y_axis;
                }
                  if (ob.x_axis > x_max) {
                      x_max = ob.x_axis;
                  }
                let new_ob: DataPoint = {
                  x_axis: ob.x_axis,
                  y_axis: ob.y_axis
                };
                return new_ob;
              });
              this.drawChart(cast_data, x_max, y_max);
            } else {
              console.log("something wrong");
            }
          });

    }

    drawChart(data: DataPoint[], x_max : number, y_max: number) {
        // const data = props.data
        //  const y_axis_name = props.y_axis;
        // const x_axis_name = props.x_axis;
        
        const svg = d3.select('#canvas-2-svg')
        const width = (svg as any).node().getBoundingClientRect().width;
        const height = (svg as any).node().getBoundingClientRect().height;
        const offset = 15;
        svg
            .select("#x-axis")
            .attr("transform", "translate(0," + (height - offset) + ")");

        svg
          .select("#y-axis")
          .attr("transform", "translate(35,-" + offset + ")");
        const tooltip = svg.select(".tooltip");
        const y_max_val = y_max;
        const x_max_val = x_max;
        let y_scale = d3
          .scaleLinear()
          .domain([0, y_max_val+10])
          .range([height, offset]);
        let x_scale = d3
            .scaleLinear()
            .domain([0,x_max_val+10])
            .range([35, width]);
        //const data = this.props.data;
        
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
          .attr("cx", (d: any) => x_scale(d.x_axis) as any)
          .attr("cy", (d: any) => y_scale(d.y_axis))
          .attr("r", "2.5px")
          .classed("dots", true)
          .attr("fill", "lightblue")
         // .attr("opacity", "1")
          .attr("transform", "translate(0,-" + offset + ")")
          .on("mouseover", function() {
            tooltip.style("display", null);
          })
          .on("mouseout", function() {
            tooltip.style("display", "none");
          })
          .on("mousemove", function(d) {
            var xPosition = d3.mouse(this as any)[0] - 20;
            var yPosition = d3.mouse(this as any)[1] - 40;
            tooltip.attr(
              "transform",
              "translate(" + xPosition + "," + yPosition + ")"
            );
            tooltip.select("text").text("Hemo-" + d.x_axis + ", " + d.y_axis);
          });


        const x_axis = d3.axisBottom(x_scale)
        const y_axis = d3.axisLeft(y_scale)
        svg.select('#x-axis').call(x_axis as any);
        svg.select('#y-axis').call(y_axis as any);



    }
    render() {
        //  console.log(this.props) 
        return <div id={"ScatterPlot"}></div>
    }
}

export default ScatterPlot;