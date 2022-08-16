import { observer } from "mobx-react";
import { FC, useState } from "react";
import { addOptions, OutcomeOptions, typeDiction } from "../../../Presets/DataDict";
import { useContext } from "react";
import Store from "../../../Interfaces/Store";
import { LayoutElement } from "../../../Interfaces/Types/LayoutTypes";
import { DropdownGenerator } from "../../../HelperFunctions/DropdownGenerator";
import { Button, ButtonGroup, FormControl, InputLabel, Select, TextField } from "@mui/material";
import { ManualInfinity } from "../../../Presets/Constants";
import styled from "@emotion/styled";
import { PaddedToolBar, CenterAlignedDiv } from "../../../Presets/StyledComponents";
import { DesktopDatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";


type Props = { addingChartType: number; };

const AddModeTopMenu: FC<Props> = ({ addingChartType }: Props) => {

    const store = useContext(Store);

    const [xAggreSelection, setXAggreSelection] = useState<string>("");
    const [yValueSelection, setYValueSelection] = useState<string>("");
    const [outcomeComparisonSelection, setOutcomeComparisonSelection] = useState<string>("");
    const [interventionDate, setInterventionDate] = useState<number | null>(null);

    const cancelChartAddHandler = () => {
        store.configStore.topMenuBarAddMode = false;
        setXAggreSelection("");
        setYValueSelection("");
    };

    const interventionHandler = (date: number | null) => {
        if (date) {
            setInterventionDate(date);

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

            <CenterAlignedDiv>
                <StyledFormControl variant="standard" required={titleOneRequied} >
                    <InputLabel
                    // style={{ whiteSpace: "nowrap" }}
                    >{titleOne}{titleOneRequied ? "" : " (Optional)"}</InputLabel>
                    <Select
                        value={yValueSelection}
                        label={`${titleOne}${titleOneRequied ? "" : " (Optional)"}`}
                        onChange={(e) => { setYValueSelection(e.target.value as string); }}>
                        {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][0] : [], !titleOneRequied)}
                    </Select>
                </StyledFormControl>
            </CenterAlignedDiv>


            <CenterAlignedDiv>
                <StyledFormControl required variant="standard" >
                    <InputLabel>{titleTwo}</InputLabel>
                    <Select
                        label={titleTwo}
                        value={xAggreSelection}
                        onChange={(e) => { setXAggreSelection(e.target.value as string); }}>
                        {DropdownGenerator(addingChartType > -1 ? addOptions[addingChartType][1] : [])}
                    </Select>
                </StyledFormControl>

            </CenterAlignedDiv>

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

            <CenterAlignedDiv>
                <StyledFormControl variant="standard" disabled={interventionDate ? true : false} >
                    <InputLabel>Outcome (Optional)</InputLabel>
                    <Select
                        value={outcomeComparisonSelection}
                        label='Outcome (Optional)'
                        onChange={(e) => { setOutcomeComparisonSelection(e.target.value as string); }}
                    >
                        {DropdownGenerator(OutcomeOptions, true)}
                    </Select>
                </StyledFormControl>
            </CenterAlignedDiv>


            <CenterAlignedDiv>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DesktopDatePicker
                        inputFormat="MM/dd/yyyy"
                        renderInput={(params) => <TextField style={{ minWidth: '250px' }} variant="standard" {...params} />}
                        label="Comparison Date (Optional)"
                        minDate={store.state.rawDateRange[0]}
                        maxDate={store.state.rawDateRange[1]}
                        disabled={outcomeComparisonSelection ? true : false}
                        value={interventionDate}
                        onChange={interventionHandler} />
                </LocalizationProvider>

            </CenterAlignedDiv>
        </>
        ],
    ];

    return <PaddedToolBar style={{ justifyContent: "space-evenly" }}>
        {addBarChartMenuRewrite[addingChartType]}
        {/* <Divider orientation="vertical" flexItem /> */}

        <CenterAlignedDiv>
            <ButtonGroup disableElevation variant="contained" color="primary">
                <Button

                    disabled={!checkValidInput()}
                    onClick={confirmChartAddHandler}>
                    Confirm
                </Button>
                <Button
                    onClick={cancelChartAddHandler} >
                    Cancel
                </Button>
            </ButtonGroup>
        </CenterAlignedDiv>

    </PaddedToolBar>;
};

export default observer(AddModeTopMenu);

const StyledFormControl = styled(FormControl)({
    // margin: '1rem',
    minWidth: "200px!important",
});
