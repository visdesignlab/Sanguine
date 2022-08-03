import { Container, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader } from "@mui/material";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import CloseIcon from '@mui/icons-material/Close';
import { observer } from "mobx-react";
import styled from '@emotion/styled';


const CaseList: FC = () => {

    const store = useContext(Store);
    const { currentBrushedPatientGroup, currentSelectPatient } = store.state;


    return (<Container className={styles.containerWidth} style={{ height: "15vh", paddingTop: "0.5px" }} >

        <List dense>

            <ListSubheader className={styles.subheader}>

                <ListItemText primary={`Selected Cases`} />
                <ListItemSecondaryAction>

                    <IconButton edge="end"
                        onClick={() => {
                            store.selectionStore.updateBrush([]);
                        }}>
                        <CloseIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListSubheader>

            {currentBrushedPatientGroup.map(d => {
                return (
                    <CaseItem
                        // TODO check this
                        key={d.CASE_ID}
                        isSelected={(currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID) || false}
                        onClick={() => { store.selectionStore.setCurrentSelectPatient(d); }}>
                        <ListItemText primary={
                            store.configStore.privateMode ? d.CASE_ID : "----------"

                        } />
                    </CaseItem>
                );
            })}

        </List>
    </Container>);
};
export default observer(CaseList);

interface CaseItemProps {
    isSelected: boolean;
}

const CaseItem = styled(ListItem) <CaseItemProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
`;
