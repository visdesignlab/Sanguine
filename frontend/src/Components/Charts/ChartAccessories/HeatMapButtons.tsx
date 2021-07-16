import { useContext } from "react";
import { FC } from "react";
import { Dropdown, Menu } from "semantic-ui-react";
import Store from "../../../Interfaces/Store";
import { addOptions, OutcomeOptions } from "../../../Presets/DataDict";


type Props = {
    xAggregationOption: string;
    yValueOption: string;
    chartTypeIndexinArray: number;
    chartId: string;
}

const HeatMapButtons: FC<Props> = ({ xAggregationOption, yValueOption, chartTypeIndexinArray, chartId }: Props) => {
    const store = useContext(Store)
    const changeAggregation = (e: any, value: any) => {
        store.chartStore.changeChart(value.value, yValueOption, chartId, "COMPARISON")
    }
    const changeValue = (e: any, value: any) => {
        store.chartStore.changeChart(xAggregationOption, value.value, chartId, "COMPARISON")
    }

    const changeOutcome = (e: any, value: any) => {
        console.log(value)
        if (value.value === "NONE") {
            store.chartStore.changeChart(xAggregationOption, yValueOption, chartId, "HEATMAP", value.value)
        } else {
            store.chartStore.changeChart(xAggregationOption, yValueOption, chartId, "COMPARISON", value.value)
        }
    }

    const OutcomeDropdownOptions = OutcomeOptions.concat({ value: "NONE", key: "NONE", text: "None" })

    return (
        <Menu.Item fitted>
            <Dropdown selectOnBlur={false} basic item icon="settings" compact >
                <Dropdown.Menu>
                    <Dropdown text="Change Aggregation" pointing basic item compact options={addOptions[chartTypeIndexinArray][0]} onChange={changeAggregation} />
                    <Dropdown text="Change Value" pointing basic item compact options={addOptions[chartTypeIndexinArray][1]} onChange={changeValue} />
                    <Dropdown text="Add Outcome Comparison" pointing basic item compact options={OutcomeDropdownOptions} onChange={(e, v) => { changeOutcome(e, v) }} />
                </Dropdown.Menu>
            </Dropdown>
        </Menu.Item>)
}

export default HeatMapButtons;