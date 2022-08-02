import { ListItem, ListItemText, Slider } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useState, useContext } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import Store from "../../../Interfaces/Store";
import { ManualInfinity } from "../../../Presets/Constants";
import { AcronymDictionary, CaseAttributeValueStringArray, TestOptionStringArray } from "../../../Presets/DataDict";

type Props = {
    label: string;
};

const ComponentRangePicker: FC<Props> = ({ label }: Props) => {

    const store = useContext(Store);
    const { allFilters } = store.state;
    const [rangeValue, setRangeValue] = useState<number[]>(
        [0, 0]);


    useDeepCompareEffect(() => {
        if (allFilters[label][1] === ManualInfinity) {
            setRangeValue(store.configStore.filterRange[label]);
        } else {
            setRangeValue([allFilters[label][0], allFilters[label][1]]);
        }
    }, [store.configStore.filterRange, allFilters]);

    return (
        <ListItem>
            <ListItemText
                style={{ marginRight: '10px' }}
                primary={AcronymDictionary[label] ? AcronymDictionary[label] : label}
                secondary={
                    <Slider
                        max={store.configStore.filterRange[label][1]}
                        min={0}

                        valueLabelDisplay="auto"
                        aria-labelledby="range-slider"
                        value={rangeValue}
                        step={[...TestOptionStringArray, ...CaseAttributeValueStringArray].includes(label) ? 0.1 : (label === "CELL_SAVER_ML" ? 1000 : undefined)}
                        onChangeCommitted={(e, nV) => {
                            store.configStore.changeFilter(label, (nV as [number, number]));
                        }}
                        onChange={(e, nV) => {
                            setRangeValue((nV as number[]));
                        }} />} />
        </ListItem>);
};

export default observer(ComponentRangePicker);