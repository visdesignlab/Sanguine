import { Container, FormGroup, FormLabel, Grid, ListItem, ListItemText, Slider } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useState, useContext, useEffect } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import Store from "../../../Interfaces/Store";
import { AcronymDictionary } from "../../../Presets/DataDict";

type Props = {
    label: string
}

const RangePicker: FC<Props> = ({ label }: Props) => {

    const store = useContext(Store);
    const [rangeValue, setRangeValue] = useState<number[]>(
        [0, 0]);


    useDeepCompareEffect(() => {

        const smallerValue = ((store.state.bloodComponentFilter as any)[label][1]) > (store.configStore.bloodComponentRange[label]) ?
            ((store.configStore.bloodComponentRange as any)[label]) :
            ((store.state.bloodComponentFilter as any)[label][1]);
        setRangeValue([0, smallerValue])
    }, [store.configStore.bloodComponentRange])

    return (
        <ListItem>
            <ListItemText primary={AcronymDictionary[label] ? AcronymDictionary[label] : label} secondary={<Slider
                max={(store.configStore.bloodComponentRange as any)[label]}
                min={0}
                valueLabelDisplay="auto"
                aria-labelledby="range-slider"
                value={rangeValue}
                step={label === "CELL_SAVER_ML" ? 1000 : undefined}
                onChange={(e, nV) => {
                    setRangeValue((nV as number[]));
                    store.configStore.changeBloodFilter(label, (nV as number[]))
                }} />} />



        </ListItem>)
}

export default observer(RangePicker);