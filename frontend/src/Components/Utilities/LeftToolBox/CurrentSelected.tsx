import {
  List, ListItem, Button, ListItemText, IconButton, ListItemSecondaryAction, Box,
} from '@mui/material';
import { observer } from 'mobx-react';
import { useContext } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import styled from '@emotion/styled';
import Store from '../../../Interfaces/Store';
import { SelectSet } from '../../../Interfaces/Types/SelectionTypes';
import { AcronymDictionary } from '../../../Presets/DataDict';
import {
  InheritWidthGrid, CenterAlignedDiv, Title,
} from '../../../Presets/StyledComponents';

const TinyFontButton = styled(Button)({
  fontSize: 'xx-small!important',
});

function CurrentSelected() {
  const store = useContext(Store);
  const { currentBrushedPatientGroup, currentSelectSet } = store.provenanceState;

  return (
    <InheritWidthGrid item>
      <Box style={{ height: '20vh', overflow: 'auto' }}>
        <List dense>
          <ListItem>
            <Title>Currently Selected</Title>
          </ListItem>

          {currentBrushedPatientGroup.length > 0
            ? (
              <ListItem alignItems="flex-start" style={{ width: '100%' }}>
                <ListItemText
                  primary="Currently Selected Patients"
                  secondary={currentBrushedPatientGroup.length}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => { store.InteractionStore.updateBrush([]); }}>
                    <CloseIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )
            : null}

          {currentSelectSet.map((selectSet: SelectSet) => (
            <ListItem key={`${selectSet.setName}selected`}>
              <ListItemText
                primary={AcronymDictionary[selectSet.setName as keyof typeof AcronymDictionary] ? AcronymDictionary[selectSet.setName as keyof typeof AcronymDictionary] : selectSet.setName}
                secondary={selectSet.setValues.sort().join(', ')}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => { store.InteractionStore.clearSet(selectSet.setName); }}>
                  <CloseIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}

        </List>
        <CenterAlignedDiv>
          <TinyFontButton
            disabled={!(currentSelectSet.length > 0 || currentBrushedPatientGroup.length > 0 || store.InteractionStore.selectedCaseIds.length > 0)}
            variant="outlined"
            onClick={() => {
              const selectedCases = store.filteredCases.filter((caseRecord: any) => store.InteractionStore.selectedCaseIds.includes(caseRecord.CASE_ID));
              store.InteractionStore.updateSelectedPatientGroup(selectedCases);
            }}
          >
            Create Filter
          </TinyFontButton>
        </CenterAlignedDiv>
      </Box>
    </InheritWidthGrid>
  );
}

export default observer(CurrentSelected);
