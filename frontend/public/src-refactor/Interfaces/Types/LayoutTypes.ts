export type LayoutElement = {
    aggregatedBy: string,
    valueToVisualize: string,
    i: string,
    x: number,
    y: number,
    w: number,
    h: number,
    plotType: string,
    //  aggregation?: string,
    extraPair?: string,
    interventionDate?: number,
    comparisonChartType?: string,
    outcomeComparison?: string,
    notation: string
}