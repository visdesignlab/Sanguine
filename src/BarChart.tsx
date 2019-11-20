import { Component } from 'react';
import * as d3 from "d3";

import 'rc-slider/assets/index.css';

interface DataPoint {
    x_axis: any,
    y_axis: number
}
interface BarchartState {
    y_axis_name: string,
    x_axis_name: string,
    data?: DataPoint[],
    y_max?: number,
    year_range?: number[],
    filter_selection?:string[]
}
interface BarchartProps{
    y_axis_name: string,
    x_axis_name: string,
    year_range:number[],
    filter_selection:string[]
}

class BarChart extends Component<BarchartState> {
    state = {
        y_axis_name: this.props.y_axis_name,
        x_axis_name: this.props.x_axis_name,
      //  data: [],
        y_max: -1,
        year_range: [],
        filter_selection:[]
    } 
    // constructor(props: BarchartProps) {
    //      super(props)
    //  }
    componentDidMount() {
        console.log(this.props)
        
        let svg= d3.select(".canvas-1").append("svg").attr("width", '100%').attr("height", "100%").attr('id', 'canvas-1-svg');
        svg
            .append("g")
            .attr("id", "x-axis");
        svg
            .append("g")
            .attr("id", "y-axis");
        svg.append('g').attr('id','all-rects')
        
        let tooltip = svg.append('g').attr('class', 'tooltip').style('display', 'none')
        tooltip.append("rect")
            .attr("width", 30)
            .attr("height", 20)
            .attr("fill", "white")
            .style("opacity", 0.5);

        tooltip.append("text")
            .attr("x", 15)
            .attr("dy", "1.2em")
            .style("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold");
    }
    componentWillReceiveProps(nextProps: BarchartProps) {
        this.setState({
            y_axis_name: nextProps.y_axis_name,
            x_axis_name: nextProps.x_axis_name,
            year_range:nextProps.year_range,
            filter_selection:nextProps.filter_selection

        })
        console.log(this.state)
        this.fetch_data_with_year(nextProps.x_axis_name,nextProps.y_axis_name,nextProps.year_range[0],nextProps.year_range[1],nextProps.filter_selection)

    }
    
    fetch_data_with_year(x_axis: string, y_axis: string,year_min:number,year_max:number, filter_selection:string[]) {
        fetch('http://localhost:5000/todo/api/v1.0/requestwithyear', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                x_axis: x_axis,
                y_axis: y_axis,
                year_min: year_min.toString(),
                year_max: year_max.toString(),
                filter_selection:filter_selection.toString()
            })
        })
            .then(res => res.json())
            .then((data) => {
                data = data.task
                if (data) {
                    let y_max = -1;
                    let cast_data = (data as any).map(function (ob: any) {
                        if (ob.y_axis > y_max) {
                            y_max = ob.y_axis
                        }
                        let new_ob: DataPoint = {
                            x_axis: ob.x_axis,
                            y_axis: ob.y_axis
                        }
                        return new_ob
                    })
                    //this.setState({ x_axis: x_axis, y_axis: y_axis })
                    console.log(this.state)
                    this.drawChart(cast_data, y_max)
                }
                else {
                    console.log('something wrong')
                }
            })
    }

    drawChart(data: DataPoint[],y_max: number) {
       
        let that = this;
       console.log(data)
        const x_vals = data.map(function (dp) {
            return dp.x_axis
        }).sort()
        const svg = d3.select('#canvas-1-svg')
        const width = (svg as any).node().getBoundingClientRect().width;
        const height = (svg as any).node().getBoundingClientRect().height;
        const offset = 15
        
        svg.select('#x-axis').attr("transform", "translate(0," + (height-offset) + ")");
        
        svg.select('#y-axis').attr("transform", "translate(35,-" + offset + ")");

        const y_max_val = y_max;
        let y_scale = d3.scaleLinear().domain([0, y_max_val+10]).range([height, offset])
        let x_scale = d3.scaleBand().domain(x_vals).range([35, width]).paddingInner(0.1)
        const tooltip=svg.select('.tooltip')
        
        
        let rects = svg.select('#all-rects').selectAll(".bars")
            .data(data);
    
        rects.exit()
            .remove();
        rects = (rects as any).enter()
            .append("rect")
            .merge(rects as any);
        rects
          .attr("x", (d: any) => x_scale(d.x_axis) as any)
          .attr("y", (d: any) => y_scale(d.y_axis))
          .classed("bars", true)
          .attr("width", x_scale.bandwidth())
          .attr("height", (d: any) => height - y_scale(d.y_axis))
          .attr("fill", "lightblue")
          //.attr("opacity", "1")
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
            tooltip.select("text").text(d.y_axis);
          });
        const x_axis = d3.axisBottom(x_scale)
        const y_axis = d3.axisLeft(y_scale)
        svg.select('#x-axis').call(x_axis as any);
        svg.select('#y-axis').call(y_axis as any);

    }
    render() {return []

    }
}

export default BarChart;