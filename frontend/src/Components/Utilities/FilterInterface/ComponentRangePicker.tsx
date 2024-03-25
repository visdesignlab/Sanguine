import { ListItem, ListItemText, Slider } from "@mui/material";
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
  const { bloodFilter } = store.provenanceState;
  const [rangeValue, setRangeValue] = useState<number[]>([0, 0]);



  useDeepCompareEffect(() => {
    if (bloodFilter[label][1] === ManualInfinity) {
      setRangeValue([bloodFilter[label][0], store.filterRange[label][1]]);
    } else {
      setRangeValue([bloodFilter[label][0], bloodFilter[label][1]]);
    }
  }, [store.filterRange, bloodFilter]);

  return (
    <ListItem>
      <ListItemText primary={AcronymDictionary[label] ? AcronymDictionary[label] : label} secondary={<Slider
        max={store.filterRange[label][1]}
        min={store.filterRange[label][0]}
        marks={[
          {
            value: store.filterRange[label][0],
            label: store.filterRange[label][0],
          },
          {
            value: store.filterRange[label][1],
            label: store.filterRange[label][1],
          }
        ]}
        valueLabelDisplay="auto"
        aria-labelledby="range-slider"
        value={rangeValue}
        step={isTestValue ? 0.1 : (label === "CELL_SAVER_ML" ? 1000 : undefined)}
        onChangeCommitted={(e, nV) => {
          if (isTestValue) {
            store.configStore.changeBloodFilter(label, (nV as [number, number]));
          } else {
            store.configStore.changeBloodFilter(label, (nV as [number, number]));
          }
        }}
        onChange={(e, nV) => {
          setRangeValue((nV as number[]));
        }} />} />



    </ListItem>);
};

export default observer(ComponentRangePicker);