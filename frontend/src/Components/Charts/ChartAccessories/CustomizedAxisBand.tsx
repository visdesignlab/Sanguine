import { FC, useCallback, useContext } from "react";
import { observer } from "mobx-react";
import {
    scaleBand
} from "d3";
import { Basic_Gray, Secondary_Gray } from "../../../Presets/Constants";
import { AxisText, CustomAxisLine, CustomAxisLineBox } from "../../../Presets/StyledSVGComponents";
import Store from "../../../Interfaces/Store";


interface OwnProps {
    scaleDomain: string;
    scaleRange: string;
    scalePadding: number;

}
export type Props = OwnProps;

const CustomizedAxisBand: FC<Props> = ({ scaleDomain, scaleRange, scalePadding }) => {

    const store = useContext(Store);

    const scale = useCallback(() => {
        const domain = JSON.parse(scaleDomain);
        const range = JSON.parse(scaleRange);

        let scale = scaleBand()
            .domain(domain as any)
            .range(range)
            .padding(scalePadding);

        return scale;
    }, [scaleDomain, scaleRange, scalePadding]);

    return <>
        {scale().domain().map((number, ind) => {
            let x1 = scale()(number) || 0;
            let x2 = x1 + scale().bandwidth();
            return (
                <g>
                    <CustomAxisLine x1={x1} x2={x2} />
                    <CustomAxisLineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? Secondary_Gray : Basic_Gray} />
                    <AxisText biggerFont={store.configStore.largeFont} x={x1 + 0.5 * (x2 - x1)}>{number}</AxisText>
                </g>
            );

        })}
    </>;
};
export default observer(CustomizedAxisBand);