import { observer } from "mobx-react";
import { FC, useState } from "react"
import { Button, Dropdown, Menu } from "semantic-ui-react"
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import { AggregationOptions, BloodComponentOptions, OutcomeOptions, scatterYOptions } from "../../Presets/DataDict"
import { useContext } from "react";
import Store from "../../Interfaces/Store";
import { typeDiction } from "../../Presets/Constants";
import { LayoutElement } from "../../Interfaces/Types/LayoutTypes";
import { RequirementP } from "../../Presets/StyledComponents";


type Props = { addingChartType: number }

const AddModeTopMenu: FC<Props> = ({ addingChartType }: Props) => {

    const store = useContext(Store)

    const dumbbellFacetOptions = BloodComponentOptions.slice(0, 4).concat(AggregationOptions).concat([{ value: "QUARTER", key: "QUARTER", text: "Quarter" }])

    const dumbbellValueOptions = [{ value: "HGB_VALUE", key: "HGB_VALUE", text: "Hemoglobin Value" }]

    const addOptions = [
        [BloodComponentOptions, AggregationOptions],
        [dumbbellValueOptions, dumbbellFacetOptions],
        [scatterYOptions, BloodComponentOptions],
        [BloodComponentOptions, AggregationOptions],
        [BloodComponentOptions, [AggregationOptions[0], AggregationOptions[2]]],
        [OutcomeOptions.slice(4, 7), AggregationOptions]
    ]

    const [xAggreSelection, setXAggreSelection] = useState<string>("")
    const [yValueSelection, setYValueSelection] = useState<string>("")
    const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<string>("")
    const [interventionDate, setInterventionDate] = useState<number | undefined>(undefined)

    const xAggreSelectionChangeHandler = (e: any, value: any) => {
        setXAggreSelection(value.value)
    }
    const yValueSelectionChangeHandler = (e: any, value: any) => {
        setYValueSelection(value.value)
    }

    const outcomeComparisonHandler = (e: any, value: any) => {
        setOutcomeComparisonSelection(value.value)
    }

    const cancelChartAddHandler = () => {
        store.configStore.topMenuBarAddMode = false;
        setXAggreSelection("");
        setYValueSelection("");
    }

    const interventionHandler = (e: any, value: any) => {
        if (value.value === "None" || !value.value) {
            setInterventionDate(undefined)
        }
        else {
            setInterventionDate(value.value.getTime())
        }
    }

    const checkValidInput = () => {

        return (xAggreSelection.length > 0 && yValueSelection.length > 0 && addingChartType > 0) || (xAggreSelection.length > 0 && addingChartType === 0)
    }

    const confirmChartAddHandler = () => {
        if (checkValidInput()) {
            if (!(addingChartType === 4 && (!interventionDate))) {
                //  console.log(addingChartType, typeDiction)
                const newChart: LayoutElement = {
                    aggregatedBy: xAggreSelection, valueToVisualize: yValueSelection,
                    i: store.configStore.nextAddingIndex,
                    w: 1,
                    h: 1,
                    x: 0,
                    y: Infinity,
                    plotType: typeDiction[addingChartType],
                    notation: ""
                }
                if (
                    // plotType === "COST"|| 
                    typeDiction[addingChartType] === "HEATMAP" || typeDiction[addingChartType] === "INTERVENTION") {
                    newChart.extraPair = JSON.stringify([]);
                }
                if (outcomeComparisonSelection) {
                    newChart.plotType = "COMPARISON";
                    newChart.outcomeComparison = outcomeComparisonSelection;
                }
                store.chartStore.addNewChart(newChart)
                store.configStore.topMenuBarAddMode = false;
                setInterventionDate(undefined);
                //setInterventionPlotType(undefined);
                setXAggreSelection("")
                setYValueSelection("")
                setOutcomeComparisonSelection("")
                console.log(store.state)
            }
        }
    }

    const addBarChartMenuRewrite: any[] = [
        //For #0 Cost and Saving Chart
        [<Menu.Item>
            <Dropdown
                placeholder={"Select Aggregation"}
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={(xAggreSelectionChangeHandler)}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>],

        //For #1 Dumbbell Chart

        [<Menu.Item>
            <Dropdown
                placeholder="Select Value to Show"
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yValueSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Facet by"
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAggreSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>],

        //for #2 Scatter Plot

        [<Menu.Item>
            <Dropdown
                placeholder="Select Y-axis Attribute"
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yValueSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAggreSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>],

        //for #3 Heat Map

        [< Menu.Item >
            <Dropdown
                placeholder="Select Value to Show"
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yValueSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item >,
        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAggreSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Outcome/Intervention Comparison (Optional)"
                clearable
                options={OutcomeOptions}
                onChange={outcomeComparisonHandler}
            />
        </Menu.Item>],

        //For #4 Intervention Plot

        [<Menu.Item>
            <Dropdown
                placeholder="Select Value to Show"
                options={addingChartType > -1 ? addOptions[addingChartType][0] : []}
                onChange={yValueSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <Dropdown
                placeholder="Select X-axis Attribute"
                options={addingChartType > -1 ? addOptions[addingChartType][1] : []}
                onChange={xAggreSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <SemanticDatePicker
                placeholder={"Intervention"}
                minDate={store.state.rawDateRange[0] as any}
                maxDate={store.state.rawDateRange[1] as any}
                onChange={interventionHandler} />
            <RequirementP>*</RequirementP>
        </Menu.Item>],

        //for #5 Compare Cost Chart

        [<Menu.Item>
            <Dropdown placeholder="Select Value to Compare"
                options={addOptions[5][0]}
                onChange={yValueSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>,
        <Menu.Item>
            <Dropdown placeholder="Select Aggregation"
                options={addOptions[5][1]}
                onChange={xAggreSelectionChangeHandler}
            />
            <RequirementP>*</RequirementP>
        </Menu.Item>]
    ]

    return <Menu widths={5}>
        {addBarChartMenuRewrite[addingChartType]}
        <Menu.Item>
            <Button.Group>
                <Button
                    positive
                    disabled={!checkValidInput()}
                    onClick={confirmChartAddHandler}
                    content={"Confirm"}
                />
                <Button content={"Cancel"} onClick={cancelChartAddHandler} />
            </Button.Group>
        </Menu.Item>
    </Menu>
}

export default observer(AddModeTopMenu)