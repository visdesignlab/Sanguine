import {
  IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText,
} from '@mui/material';
import { useContext } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import { CaseListSubheader, UtilityContainer } from '../../../Presets/StyledComponents';

function CaseList() {
  const store = useContext(Store);
  const { currentBrushedPatientGroup, currentSelectPatient } = store.provenanceState;

  return (
    <UtilityContainer style={{ height: '15vh', paddingTop: '0.5px' }}>

      <List dense component="nav">

        <CaseListSubheader>

          <ListItemText primary="Selected Cases" />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={() => {
                store.selectionStore.updateBrush([]);
              }}
            >
              <CloseIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </CaseListSubheader>

        {currentBrushedPatientGroup.map((d) => (
          <ListItem
            key={d.CASE_ID}
            selected={(currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID) || false}
          >
            <ListItemButton onClick={() => store.selectionStore.setCurrentSelectPatient(d)}>
              <ListItemText primary={
                                store.configStore.privateMode ? d.CASE_ID : '----------'
                            }
              />
            </ListItemButton>
          </ListItem>
        ))}

      </List>
    </UtilityContainer>
  );
}

export default observer(CaseList);
