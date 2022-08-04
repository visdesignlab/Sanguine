import { IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import CloseIcon from '@mui/icons-material/Close';
import { observer } from "mobx-react";
import styled from '@emotion/styled';
import { CaseListSubheader, UtilityContainer } from "../../../Presets/StyledComponents";


const CaseList: FC = () => {

    const store = useContext(Store);
    const { currentBrushedPatientGroup, currentSelectPatient } = store.state;


    return (<UtilityContainer style={{ height: "15vh", paddingTop: "0.5px" }} >

        <List dense component="nav">

            <CaseListSubheader>

                <ListItemText primary={`Selected Cases`} />
                <ListItemSecondaryAction>
                    <IconButton edge="end"
                        onClick={() => {
                            store.selectionStore.updateBrush([]);
                        }}>
                        <CloseIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </CaseListSubheader>

            {currentBrushedPatientGroup.map(d => {
                return (
                    <ListItem
                        key={d.CASE_ID}
                        selected={(currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID) || false}>
                        <ListItemButton onClick={() => store.selectionStore.setCurrentSelectPatient(d)}>
                            <ListItemText primary={
                                store.configStore.privateMode ? d.CASE_ID : "----------"
                            } />
                        </ListItemButton>
                    </ListItem>
                );
            })}

        </List>
    </UtilityContainer>);
};
export default observer(CaseList);