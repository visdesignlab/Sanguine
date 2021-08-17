import { Container, FormGroup, FormLabel, Grid, ListItem, ListItemText, Slider } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useState, useContext, useEffect } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import Store from "../../../Interfaces/Store";
import { ManualInfinity } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";

type Props = {
    label: string
}

const RangePicker: FC<Props> = ({ label }: Props) => {

    const store = useContext(Store);
    const { bloodComponentFilter } = store.state;
    const [rangeValue, setRangeValue] = useState<number[]>(
        [0, 0]);


    useDeepCompareEffect(() => {

        if (bloodComponentFilter[label][1] === ManualInfinity) {
            setRangeValue([bloodComponentFilter[label][0], store.configStore.filterRange[label]])
        } else {
            setRangeValue([bloodComponentFilter[label][0], bloodComponentFilter[label][1]])
        }
    }, [store.configStore.filterRange, bloodComponentFilter])

    return (
        <ListItem>
            <ListItemText primary={AcronymDictionary[label] ? AcronymDictionary[label] : label} secondary={<Slider
                max={(store.configStore.filterRange as any)[label]}
                min={0}
                valueLabelDisplay="auto"
                aria-labelledby="range-slider"
                value={rangeValue}
                step={label === "CELL_SAVER_ML" ? 1000 : undefined}
                onChangeCommitted={(e, nV) => {

                    store.configStore.changeBloodFilter(label, (nV as number[]))
                }}
                onChange={(e, nV) => {
                    setRangeValue((nV as number[]));

                }} />} />



        </ListItem>)
}

export default observer(RangePicker);