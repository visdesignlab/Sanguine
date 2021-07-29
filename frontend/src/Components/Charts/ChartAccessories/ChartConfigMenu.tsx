import { useContext, useState } from "react";
import { FC } from "react";

import Store from "../../../Interfaces/Store";
import { addOptions, BloodComponentOptions, OutcomeOptions, ScatterYOptions, typeDiction } from "../../../Presets/DataDict";
import SettingsIcon from '@material-ui/icons/Settings';
import NestedMenuItem from "material-ui-nested-menu-item";
import { IconButton, Menu, MenuItem } from "@material-ui/core";
import { observer } from "mobx-react";



type Props = {
    xAggregationOption: string;
    yValueOption: string;
    chartTypeIndexinArray: number;
    chartId: string;
    requireOutcome: boolean;
    requireSecondary: boolean
}

const ChartConfigMenu: FC<Props> = ({ xAggregationOption, yValueOption, chartTypeIndexinArray, requireOutcome, chartId, requireSecondary }: Props) => {
    const store = useContext(Store)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);


    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const changeXAxis = (value: string) => {
        store.chartStore.changeChart(value, yValueOption, chartId, typeDiction[chartTypeIndexinArray])
        handleClose()
    }

    const changeYAxis = (value: string) => {
        store.chartStore.changeChart(xAggregationOption, value, chartId, typeDiction[chartTypeIndexinArray])
        handleClose()
    }

    const changeOutcome = (value: string) => {

        if (value === "NONE") {
            store.chartStore.changeChart(xAggregationOption, yValueOption, chartId, "HEATMAP", value)
        } else {
            store.chartStore.changeChart(xAggregationOption, yValueOption, chartId, "COMPARISON", value)
        }
        handleClose()
    }

    const OutcomeDropdownOptions = OutcomeOptions.concat({ value: "NONE", key: "NONE", text: "None" })



    return (
        <div>
            <IconButton onClick={handleClick}>
                <SettingsIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open}
                onClose={handleClose}
            >
                <NestedMenuItem
                    label="Change Aggregation"
                    parentMenuOpen={open}
                >

                    {addOptions[chartTypeIndexinArray][1].map((option) => (
                        <MenuItem key={option.key} onClick={() => { changeXAxis(option.key) }}>{option.text}</MenuItem>
                    ))}
                </NestedMenuItem>
                {requireSecondary ? <NestedMenuItem
                    label="Change Value to Show"
                    parentMenuOpen={open}
                >
                    {addOptions[chartTypeIndexinArray][0].map((option) => (
                        <MenuItem key={option.key} onClick={() => { changeYAxis(option.key) }}>{option.text}</MenuItem>
                    ))}
                    {chartTypeIndexinArray === 0 ? <MenuItem key={"none"} onClick={() => { changeYAxis("") }}>None</MenuItem> : <></>}
                </NestedMenuItem> : <></>}
                {requireOutcome ? <NestedMenuItem
                    label="Change Outcome Comparison"
                    parentMenuOpen={open}
                >
                    {OutcomeDropdownOptions.map((option) => (
                        <MenuItem key={option.key} onClick={() => { changeOutcome(option.key) }}>{option.text}</MenuItem>
                    ))}
                </NestedMenuItem> : <></>}
            </Menu>
        </div>)
}

export default observer(ChartConfigMenu);