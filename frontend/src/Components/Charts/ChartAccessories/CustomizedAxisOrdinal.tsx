import { FC, useCallback, useContext } from "react";
import { observer } from "mobx-react";
import {
    ScaleOrdinal,
    scaleOrdinal
} from "d3";
import { Basic_Gray, Secondary_Gray } from "../../../Presets/Constants";
import { AxisText, CustomAxisLine, CustomAxisLineBox } from "../../../Presets/StyledSVGComponents";
import Store from "../../../Interfaces/Store";

interface OwnProps {
    scaleDomain: string;
    scaleRange: string;
    numberList: { num: number, indexEnding: number }[]
}
export type Props = OwnProps;

const CustomizedAxisOrdinal: FC<Props> = ({ numberList, scaleDomain, scaleRange }) => {
    const store = useContext(Store);
    const scale = useCallback(() => {
        const domain = JSON.parse(scaleDomain);
        const range = JSON.parse(scaleRange)
        let scale = scaleOrdinal()
            .domain(domain as any)
            .range(range);

        return scale;
    }, [scaleDomain, scaleRange])

    return <>

        {numberList.map((numberOb, ind) => {
            let x1 = ind === 0 ? (scale() as ScaleOrdinal<any, number>)(0) : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[ind - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)))
            let x2 = ind === numberList.length - 1 ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)))
            if (x1 && x2) {
                return (
                    <g>
                        <CustomAxisLine x1={x1} x2={x2} />
                        <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? Secondary_Gray : Basic_Gray} />
                        <AxisText biggerFont={store.configStore.largeFont} x={x1 + 0.5 * (x2 - x1)}>{numberOb.num}</AxisText>
                    </g>)
            } else { return <></> }
        })}
    </>
}
export default observer(CustomizedAxisOrdinal);

