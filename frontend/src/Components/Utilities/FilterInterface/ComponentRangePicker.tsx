import { ListItem, ListItemText, Slider } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useState, useContext } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import Store from "../../../Interfaces/Store";
import { ManualInfinity } from "../../../Presets/Constants";
import { AcronymDictionary } from "../../../Presets/DataDict";

type Props = {
    label: string;
    isTestValue?: boolean;
};

const ComponentRangePicker: FC<Props> = ({ label, isTestValue }: Props) => {

    const store = useContext(Store);
    const { bloodComponentFilter, testValueFilter } = store.state;
    const [rangeValue, setRangeValue] = useState<number[]>(
        [0, 0]);


    useDeepCompareEffect(() => {
        if (isTestValue) {
            if (testValueFilter[label][1] === ManualInfinity) {
                setRangeValue([testValueFilter[label][0], store.configStore.filterRange[label]]);
            } else {
                setRangeValue([testValueFilter[label][0], testValueFilter[label][1]]);
            }
        } else {
            if (bloodComponentFilter[label][1] === ManualInfinity) {
                setRangeValue([bloodComponentFilter[label][0], store.configStore.filterRange[label]]);
            } else {
                setRangeValue([bloodComponentFilter[label][0], bloodComponentFilter[label][1]]);
            }
        }
    }, [store.configStore.filterRange, bloodComponentFilter, testValueFilter]);

    return (
        <ListItem>
            <ListItemText primary={AcronymDictionary[label] ? AcronymDictionary[label] : label} secondary={<Slider
                max={store.configStore.filterRange[label]}
                min={0}
                marks={[
                    {
                        value: 0,
                        label: 0,
                    },
                    {
                        value: store.configStore.filterRange[label],
                        label: store.configStore.filterRange[label],
                    }
                ]}
                valueLabelDisplay="auto"
                aria-labelledby="range-slider"
                value={rangeValue}
                step={isTestValue ? 0.1 : (label === "CELL_SAVER_ML" ? 1000 : undefined)}
                onChangeCommitted={(e, nV) => {
                    if (isTestValue) {
                        store.configStore.changeTestValueFilter(label, (nV as number[]));
                    } else {
                        store.configStore.changeBloodFilter(label, (nV as number[]));
                    }
                }}
                onChange={(e, nV) => {
                    setRangeValue((nV as number[]));
                }} />} />



        </ListItem>);
};

export default observer(ComponentRangePicker);