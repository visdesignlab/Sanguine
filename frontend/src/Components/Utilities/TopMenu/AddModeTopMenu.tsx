import { observer } from "mobx-react";
import { FC, useState } from "react"
// import { Button, Dropdown, Menu } from "semantic-ui-react"
// import SemanticDatePicker from 'react-semantic-ui-datepickers';
import { addOptions, OutcomeOptions, typeDiction } from "../../../Presets/DataDict";
import {
    KeyboardDatePicker,
} from '@material-ui/pickers';
import { useContext } from "react";
import Store from "../../../Interfaces/Store";
import { LayoutElement } from "../../../Interfaces/Types/LayoutTypes";
import Grid from "@material-ui/core/Grid";
import { useStyles } from "../../../Presets/StyledComponents";
import Divider from "@material-ui/core/Divider";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import { DropdownGenerator } from "../../../HelperFunctions/DropdownGenerator";
import { FormControl, InputLabel } from "@material-ui/core";
// import { RequirementP } from "../../../Presets/StyledComponents";


type Props = { addingChartType: number }

const AddModeTopMenu: FC<Props> = ({ addingChartType }: Props) => {

    const store = useContext(Store)

    const styles = useStyles();
    const [xAggreSelection, setXAggreSelection] = useState<string>("")
    const [yValueSelection, setYValueSelection] = useState<string>("")
    const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<string>("")
    const [interventionDate, setInterventionDate] = useState<number | undefined>(undefined)

    const cancelChartAddHandler = () => {
        store.configStore.topMenuBarAddMode = false;
        setXAggreSelection("");
        setYValueSelection("");
    }

    const interventionHandler = (date: Date | null) => {
        if (date) {
            setInterventionDate(date.getTime())

        }
        else {
            setInterventionDate(undefined)
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


    const outputRegularOptions = (titleOne: string, titleTwo: string) => {
        return <>
            <Grid item xs>
                <div className={styles.centerAlignment}>
                    <FormControl required className={styles.formControl}>
                        <InputLabel>{titleOne}</InputLabel>
                        <Select
                            onChange={(e) => { setYValueSelection(e.target.value as string) }}>
                            {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][0] : [])}
                        </Select>
                    </FormControl>

                </div>
            </Grid>
            <Divider orientation="vertical" flexItem />

            <Grid item xs>
                <div className={styles.centerAlignment}>
                    <FormControl required className={styles.formControl}>
                        <InputLabel>{titleTwo}</InputLabel>
                        <Select

                            onChange={(e) => { setXAggreSelection(e.target.value as string) }}>
                            {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][1] : [])}
                        </Select>
                    </FormControl>

                </div>
            </Grid>
        </>
    }

    const addBarChartMenuRewrite: any[] = [
        //For #0 Cost and Saving Chart
        [<Grid item xs>
            <FormControl required className={styles.formControl}>
                <Select onChange={(e) => { setXAggreSelection(e.target.value as string) }}>
                    {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][1] : [])}
                </Select>
            </FormControl>
        </Grid>],

        //For #1 Dumbbell Chart

        outputRegularOptions("Select Value to Show", "Arranged by"),

        //for #2 Scatter Plot

        outputRegularOptions("Select Value to Show", "Arranged by"),

        //for #3 Heat Map

        [outputRegularOptions("Select Value to Show", "Aggregated by"),

        <Grid item xs>
            <div className={styles.centerAlignment}>
                <FormControl className={styles.formControl}>
                    <Select displayEmpty onChange={(e) => { setOutcomeComparisonSelection(e.target.value as string) }}>
                        {DropdownGenerator((addingChartType > -1 ? addOptions[addingChartType][1] : []), true)}
                    </Select>
                </FormControl>
            </div>
        </Grid>
        ],

        //For #4 Intervention Plot

        [outputRegularOptions("Select Value to Show", "Aggregated by"),

        <Grid item xs>
            {/* <SemanticDatePicker
                placeholder={"Intervention"}
                minDate={store.state.rawDateRange[0] as any}
                maxDate={store.state.rawDateRange[1] as any}
                onChange={interventionHandler} /> */}
            <div className={styles.centerAlignment}>
                BUG
                {/* <KeyboardDatePicker
                    disableToolbar
                    variant="inline"
                    format="MM/dd/yyyy"
                    margin="normal"
                    id="date-picker-inline"
                    label="Date picker inline"
                    value={interventionDate}
                    onChange={interventionHandler}

                /> */}
            </div>
        </Grid>
        ],

        //for #5 Compare Cost Chart

        outputRegularOptions("Select Value to Compare", "Aggregated by")
    ]

    return <div className={styles.root}>
        <Grid container direction="row" justifyContent="space-around" alignItems="center">
            {addBarChartMenuRewrite[addingChartType]}
            <Divider orientation="vertical" flexItem />
            <Grid item xs>
                <div className={styles.centerAlignment}>
                    <ButtonGroup>
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={!checkValidInput()}
                            onClick={confirmChartAddHandler}>
                            Confirm
                        </Button>
                        <Button
                            variant="contained"
                            onClick={cancelChartAddHandler} >
                            Cancel
                        </Button>
                    </ButtonGroup>
                </div>
            </Grid>
        </Grid>
    </div>
}

export default observer(AddModeTopMenu)