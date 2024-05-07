import { timeFormat } from "d3";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";
import Store from "../../../Interfaces/Store";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { InheritWidthGrid, Title, UtilityContainer } from "../../../Presets/StyledComponents";
import { ListItem, List, ListItemSecondaryAction, ListItemText, Switch, IconButton, Tooltip } from "@mui/material";
import ErrorIcon from '@mui/icons-material/Error';
import { ProcedureStringGenerator } from "../../../HelperFunctions/ProcedureStringGenerator";

const CurrentView: FC = () => {
    const store = useContext(Store);
    const { allCases } = store;


    const generateSurgery = () => {
        let output: any[] = [];
        if (store.provenanceState.proceduresSelection.length === 0) {
            output.push(<span key={`all`}>All</span>);
        } else {
            const procedureString = ProcedureStringGenerator(store.provenanceState.proceduresSelection).replace(/%20/g, " ");
            const stringArray = procedureString.split(" ");

            stringArray.forEach((word, index) => {
                const wordWithoutSymbol = word.replace(/[^a-zA-Z ]/g, "");
                if ((AcronymDictionary as any)[wordWithoutSymbol]) {
                    output.push((
                        <Tooltip key={`${index}-${word}`} title={<div key={`${index}-${word}`}>{(AcronymDictionary as any)[wordWithoutSymbol]}</div>}>
                            <div className="tooltip" key={`${index}-${word}`} style={{ cursor: "help" }}>
                                {word}
                            </div>
                        </Tooltip>));
                } else {
                    output.push((<span style={{ color: `${word === 'AND' || word === 'OR' ? 'lightcoral' : undefined}` }} key={`${index}-${word}`}>{`${index !== 0 ? " " : ""}${word}${index !== stringArray.length - 1 ? " " : ""}`}</span>));
                }
            });
        }
        return output;
    };

    return (
        <InheritWidthGrid item >
            <UtilityContainer style={{ height: "30vh" }}>
                <List dense >
                    <ListItem style={{ textAlign: "left" }}>
                        <Title>Current View</Title>
                    </ListItem>

                    <ListItem alignItems="flex-start" style={{ width: "100%" }} key="Date">
                        <ListItemText primary="Date Range"
                            secondary={`${timeFormat("%b %d, %Y")(new Date(store.provenanceState.rawDateRange[0]))} - ${timeFormat("%b %d, %Y")(new Date(store.provenanceState.rawDateRange[1]))}`} />

                    </ListItem>


                    {/* TODO change this into "toggle axis" instead of "show zero" */}
                    <ListItem key="Show Zero">
                        <ListItemText primary="Show Zero Transfused"
                        ></ListItemText>
                        <ListItemSecondaryAction>
                            <Switch
                                checked={store.provenanceState.showZero}
                                color="primary"
                                onChange={(e) => { store.configStore.toggleShowZero(e.target.checked); }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem key="AggreCaseCount">
                        <ListItemText primary="Aggregated Cases"
                            secondary={`${store.chartStore.totalAggregatedCaseCount}/${allCases.length}`} />

                    </ListItem>

                    <ListItem key="IndiCaseCount">
                        <ListItemText primary="Individual Cases"
                            secondary={`${store.chartStore.totalIndividualCaseCount}/${allCases.length}`} />
                        <ListItemSecondaryAction>
                            <Tooltip title='Case count can be reduced by both filter and missing data.'>
                                <IconButton size="small" disableRipple >
                                    <ErrorIcon />
                                </IconButton>

                            </Tooltip>
                        </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem key="SurgeryList">
                        <ListItemText primary="Procedure" secondary={generateSurgery()} />
                    </ListItem>

                </List>
            </UtilityContainer>
        </InheritWidthGrid >
    );




};

export default observer(CurrentView);