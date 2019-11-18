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
        console.log(this.props)
        let svg = d3.select(".canvas-2").append("svg").attr("width", '100%').attr("height", 950).attr('id', 'canvas-2-svg');
        svg.append('g').attr('id', 'x-axis').attr('transform', 'translate(0,900)');
        svg.append('g').attr('id', 'y-axis').attr('transform', 'translate(35,0)');
        //   this.drawChart(this.props);
    }
    componentWillReceiveProps(nextProps: StyledCardProps) {
        this.setState({
            y_axis: nextProps.y_axis_name,
            x_axis: nextProps.x_axis_name,
            // data: nextProps.data,
            //           y_max: nextProps.y_max
        })
        console.log(this.state)
        this.fetch_data(nextProps.x_axis_name, nextProps.y_axis_name)
        //   this.drawChart(this.props)
    }
    fetch_data(x_axis: string, y_axis: string) {
        fetch('http://localhost:5000/todo/api/v1.0/tasks', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                x_axis: x_axis,
                y_axis: y_axis,
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
                    this.setState({ x_axis: x_axis, y_axis: y_axis })
                    console.log(this.state)
                    this.drawChart(cast_data, y_max)
                }
                else {
                    console.log('something wrong')
                }
            })

    }

    drawChart(data: DataPoint[], y_max: number) {
        // const data = props.data
        //  const y_axis_name = props.y_axis;
        // const x_axis_name = props.x_axis;
        const x_vals = data.map(function (dp) {
            return dp.x_axis
        })
        const svg = d3.select('#canvas-2-svg')
        const width = (svg as any).node().getBoundingClientRect().width;
        
        const y_max_val = y_max;
        let y_scale = d3.scaleLinear().domain([0, y_max_val]).range([900, 0])
        let x_scale = d3.scaleBand().domain(x_vals).range([35, width]).paddingInner(0.1)
        //const data = this.props.data;
        console.log(data)

        let rects = svg.selectAll("rect")
            .data(data);
        rects.exit()
            .remove();
        rects = (rects as any).enter()
            .append("rect")
            .merge(rects as any);
        rects.attr("x", (d: any) => (x_scale(d.x_axis) as any))
            .attr("y", (d: any) => y_scale(d.y_axis))
            .attr("width", x_scale.bandwidth())
            .attr("height", (d: any) => 900 - y_scale(d.y_axis))
            .attr("fill", "green")
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