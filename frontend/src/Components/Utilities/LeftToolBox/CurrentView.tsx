import { timeFormat } from "d3";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";
import Store from "../../../Interfaces/Store";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { Title, useStyles } from "../../../Presets/StyledComponents";
import Container from "@material-ui/core/Container";

import List from "@material-ui/core/List";
import { ListItem, ListItemSecondaryAction, ListItemText, Switch, Grid, IconButton, Tooltip } from "@material-ui/core";

import ErrorIcon from '@material-ui/icons/Error';
import { ProcedureStringGenerator } from "../../../HelperFunctions/ProcedureStringGenerator";

type Props = { totalCaseNum: number; };

const CurrentView: FC<Props> = ({ totalCaseNum }: Props) => {
    const store = useContext(Store);
    const styles = useStyles();

    const generateSurgery = () => {
        let output: any[] = [];
        if (store.state.proceduresSelection.length === 0) {
            output.push(<span key={`all`}>All</span>);
        } else {
            const procedureString = ProcedureStringGenerator(store.state.proceduresSelection).replace(/%20/g, " ");
            const stringArray = procedureString.split(" ");

            stringArray.forEach((word, index) => {
                const wordWithoutSymbol = word.replace(/[^a-zA-Z ]/g, "");
                if ((AcronymDictionary as any)[wordWithoutSymbol]) {
                    output.push((
                        <Tooltip key={`${index}-${word}`} title={<div key={`${index}-${word}`} className={styles.tooltipFont}>{(AcronymDictionary as any)[wordWithoutSymbol]}</div>}>
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
        <Grid item className={styles.gridWidth} >
            <Container className={styles.containerWidth} style={{ height: "35vh" }}>
                <List dense >
                    <ListItem style={{ textAlign: "left" }}>
                        <Title>Current View</Title>
                    </ListItem>

                    <ListItem alignItems="flex-start" style={{ width: "100%" }} key="Date">
                        <ListItemText primary="Date Range"
                            secondary={`${timeFormat("%b %d, %Y")(new Date(store.state.rawDateRange[0]))} - ${timeFormat("%b %d, %Y")(new Date(store.state.rawDateRange[1]))}`} />

                    </ListItem>


                    {/* TODO change this into "toggle axis" instead of "show zero" */}
                    <ListItem key="Show Zero">
                        <ListItemText primary="Show Zero Transfused"
                        ></ListItemText>
                        <ListItemSecondaryAction>
                            <Switch
                                checked={store.state.showZero}
                                color="primary"
                                onChange={(e) => { store.configStore.toggleShowZero(e.target.checked); }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>

                    <ListItem key="AggreCaseCount">
                        <ListItemText primary="Aggregated Cases"
                            secondary={`${store.chartStore.totalAggregatedCaseCount}/${totalCaseNum}`} />

                    </ListItem>

                    <ListItem key="IndiCaseCount">
                        <ListItemText primary="Individual Cases"
                            secondary={`${store.chartStore.totalIndividualCaseCount}/${totalCaseNum}`} />
                        <ListItemSecondaryAction>
                            <Tooltip title={<div className={styles.tooltipFont}>Case count can be reduced by both filter and missing data.</div>}>
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
            </Container>
        </Grid >
    );




};

export default observer(CurrentView);