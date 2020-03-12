import React, {FC, useEffect, useMemo} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import {inject, observer} from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal } from "d3";
import {extraPairWidth} from "../../Interfaces/ApplicationState"

interface OwnProps{
    dataSet:any[];
    aggregatedScale:ScaleBand<string>;
    store?:Store;
}

export type Props = OwnProps;

const ExtraPairDumbbell:FC<Props> = ({dataSet, aggregatedScale, store}:Props)=>{
    const [valueScale]=useMemo(()=>{
        
        let maxIndices = 0;
        Object.values(dataSet).map((array)=>{
            maxIndices = array.length>maxIndices? array.length:maxIndices
        })
        const indices = range(0, maxIndices) as number[]
       
        const valueScale = scaleLinear().domain([0,18]).range([0,aggregatedScale.bandwidth()])
        
        return [valueScale];
    },[dataSet,aggregatedScale])

    return (
        <>
        {Object.entries(dataSet).map(([val,dataArray])=>{
            const sortedArray=dataArray.sort((a:any, b:any) =>
                Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
            
            return ([<line x1={0} x2={extraPairWidth} y1={aggregatedScale(val)!+valueScale(11)} y2={aggregatedScale(val)!+valueScale(11)}
                stroke={"#d98532"} opacity={0.5}/>].concat(
                sortedArray.map((dumbbellPair:any,index:number)=>{
                
                    const indices = range(0, dataArray.length) as number[]

                    const pairScale= scaleOrdinal().domain(indices as any).range(range(0,extraPairWidth,extraPairWidth/dataArray.length))

                    const start = valueScale(dumbbellPair[0]);
                    const end = valueScale(dumbbellPair[1]);
                    const returning = start > end ? end : start;
                    const rectDifference = Math.abs(end - start)
                    
                    return([
                        
                        <rect
                            x={(pairScale as ScaleOrdinal<any,number>)(index)-0.5}
                            y={returning+aggregatedScale(val)!}
                            height={rectDifference}
                            width={0.5}
                            fill={"#404040"}
                            opacity={0.8}
                        />,
                        <circle
                            cx={(pairScale as ScaleOrdinal<any,number>)(index)}
                            cy={valueScale(dumbbellPair[0])+aggregatedScale(val)!}
                            r = {1}
                            fill={"#404040"}
                            opacity={0.8}
                        />,
                        <circle
                            cx={(pairScale as ScaleOrdinal<any,number>)(index)}
                            cy={valueScale(dumbbellPair[1])+aggregatedScale(val)!}
                            r={1}
                            fill={"#404040"}
                            opacity={0.8}
                        />])
            })
            )
        )})}
        </>
    )
}

export default inject("store")(observer(ExtraPairDumbbell));
