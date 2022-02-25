import { observer } from "mobx-react";
import { FC, useState } from "react";
import { addOptions, OutcomeOptions, typeDiction } from "../../../Presets/DataDict";
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import { useContext } from "react";
import DateFnsUtils from '@date-io/date-fns';
import Store from "../../../Interfaces/Store";
import { LayoutElement } from "../../../Interfaces/Types/LayoutTypes";
import { useStyles } from "../../../Presets/StyledComponents";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import { DropdownGenerator } from "../../../HelperFunctions/DropdownGenerator";
import { FormControl, InputLabel, Toolbar } from "@material-ui/core";
import { ManualInfinity } from "../../../Presets/Constants";


type Props = { addingChartType: number; };

const AddModeTopMenu: FC<Props> = ({ addingChartType }: Props) => {

    const store = useContext(Store);

    const styles = useStyles();
    const [xAggreSelection, setXAggreSelection] = useState<string>("");
    const [yValueSelection, setYValueSelection] = useState<string>("");
    const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<string>("");
    const [interventionDate, setInterventionDate] = useState<number | null>(null);

    const cancelChartAddHandler = () => {
        store.configStore.topMenuBarAddMode = false;
        setXAggreSelection("");
        setYValueSelection("");
    };

    const interventionHandler = (date: Date | null) => {
        if (date) {
            setInterventionDate(date.getTime());

        }
        else {
            setInterventionDate(null);
        }

    };

    const checkValidInput = () => {
        return (xAggreSelection.length > 0 && yValueSelection.length > 0 && addingChartType > 0) || (xAggreSelection.length > 0 && addingChartType === 0);
    };

    const confirmChartAddHandler = () => {
        if (checkValidInput()) {
            if (!(addingChartType === 4 && (!interventionDate))) {
                const newChart: LayoutElement = {
                    aggregatedBy: xAggreSelection, valueToVisualize: yValueSelection,
                    i: store.state.nextAddingIndex.toString(),
                    w: 1,
                    h: 1,
                    x: 0,
                    y: ManualInfinity,
                    plotType: typeDiction[addingChartType],
                    notation: "",
                    outcomeComparison: outcomeComparisonSelection,
                    interventionDate: interventionDate ? interventionDate : undefined
                };
                if (
                    typeDiction[addingChartType] === "HEATMAP" || typeDiction[addingChartType] === "COST") {
                    newChart.extraPair = JSON.stringify([]);
                }

                store.chartStore.addNewChart(newChart);
                store.configStore.topMenuBarAddMode = false;
                setInterventionDate(null);
                setXAggreSelection("");
                setYValueSelection("");
                setOutcomeComparisonSelection("");
            }
        }
    };


    const outputRegularOptions = (titleOne: string, titleTwo: string, titleOneRequied: boolean) => {
        return <>

            <div className={styles.centerAlignment}>
                <FormControl required={titleOneRequied} className={styles.formControl}>
                    <InputLabel style={{ whiteSpace: "nowrap" }}>{titleOne}{titleOneRequied ? "" : " (Optional)"}</InputLabel>
                    <Select
                        onChange={(e) => { setYValueSelection(e.target.value as string); }}>
                        {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][0] : [], !titleOneRequied)}
                    </Select>
                </FormControl>

            </div>

            {/* <Divider orientation="vertical" flexItem /> */}


            <div className={styles.centerAlignment}>
                <FormControl required className={styles.formControl}>
                    <InputLabel>{titleTwo}</InputLabel>
                    <Select
                        onChange={(e) => { setXAggreSelection(e.target.value as string); }}>
                        {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][1] : [])}
                    </Select>
                </FormControl>

            </div>

        </>;
    };

    const addBarChartMenuRewrite: any[] = [
        //For #0 Cost and Saving Chart

        outputRegularOptions("Select Comparison", "Aggregated by", false)
        ,

        //For #1 Dumbbell Chart

        outputRegularOptions("Select Value to Show", "Arranged by", true),

        //for #2 Scatter Plot

        outputRegularOptions("Select Value to Show", "Arranged by", true),

        //for #3 Heat Map

        [outputRegularOptions("Select Value to Show", "Aggregated by", true),
        <>

            <div className={styles.centerAlignment}>
                <FormControl disabled={interventionDate ? true : false} className={styles.formControl}>
                    <InputLabel>Outcome (Optional)</InputLabel>
                    <Select onChange={(e) => { setOutcomeComparisonSelection(e.target.value as string); }}
                    >
                        {DropdownGenerator(OutcomeOptions, true)}
                    </Select>
                </FormControl>
            </div>


            <div className={styles.centerAlignment}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                        disableToolbar
                        variant="inline"
                        format="MM/dd/yyyy"

                        id="date-picker-inline"
                        label="Comparison Date (Optional)"
                        minDate={store.state.rawDateRange[0]}
                        maxDate={store.state.rawDateRange[1]}
                        disabled={outcomeComparisonSelection ? true : false}
                        value={interventionDate}
                        onChange={interventionHandler} />
                </MuiPickersUtilsProvider>

            </div>
        </>
        ],
    ];

    return <Toolbar className={styles.toolbarPaddingControl} style={{ justifyContent: "space-evenly" }}>
        {addBarChartMenuRewrite[addingChartType]}
        {/* <Divider orientation="vertical" flexItem /> */}

        <div className={styles.centerAlignment}>
            <ButtonGroup>
                <Button
                    disableElevation
                    variant="contained"
                    color="primary"
                    disabled={!checkValidInput()}
                    onClick={confirmChartAddHandler}>
                    Confirm
                </Button>
                <Button
                    disableElevation
                    variant="contained"
                    onClick={cancelChartAddHandler} >
                    Cancel
                </Button>
            </ButtonGroup>
        </div>

    </Toolbar>;
};

export default observer(AddModeTopMenu);