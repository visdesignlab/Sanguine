
import { Container, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader } from "@material-ui/core";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import styled from "styled-components";
import CloseIcon from '@material-ui/icons/Close';
import { observer } from "mobx-react";
import { useStyles } from "../../../Presets/StyledComponents";

const CaseList: FC = () => {

    const store = useContext(Store);
    const { currentBrushedPatientGroup, currentSelectPatient } = store.state
    const styles = useStyles();

    return (<Container style={{ overflow: "auto", height: "15vh" }} >

        <List dense>

            <ListSubheader className={styles.subheader}>

                <ListItemText primary={`Selected Cases`} />
                <ListItemSecondaryAction>

                    <IconButton edge="end"
                        onClick={() => {
                            store.selectionStore.setCurrentSelectPatient(null);
                            store.selectionStore.updateBrush([])
                        }}>
                        <CloseIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListSubheader>

            {currentBrushedPatientGroup.map(d => {
                return (
                    <CaseItem button key={d.CASE_ID}
                        isSelected={(currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID) || false}
                        onClick={() => { store.selectionStore.setCurrentSelectPatient(d) }}>
                        <ListItemText primary={d.CASE_ID} />
                    </CaseItem>
                )
            })}

        </List>
    </Container>)
}
export default observer(CaseList)

interface CaseItemProps {
    isSelected: boolean;
}

const CaseItem = styled(ListItem) <CaseItemProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
`;


