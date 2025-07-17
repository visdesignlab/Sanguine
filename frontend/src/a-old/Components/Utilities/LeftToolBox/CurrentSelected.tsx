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
import { usePrivateProvLabel } from '../../Hooks/UsePrivateModeLabeling';

const TinyFontButton = styled(Button)({
  fontSize: 'xx-small!important',
});

function CurrentSelected() {
  const store = useContext(Store);
  const { currentSelectedPatientGroup, currentSelectSet } = store.provenanceState;
  const getLabel = usePrivateProvLabel();

  return (
    <InheritWidthGrid item>
      <Box style={{ height: '20vh', overflow: 'auto' }}>
        <List dense>
          <ListItem>
            <Title>Currently Selected</Title>
          </ListItem>

          {/** Currently Selected Cases */}
          {currentSelectedPatientGroup.length > 0
            ? (
              <ListItem alignItems="flex-start" style={{ width: '100%' }}>
                <ListItemText
                  primary="Currently Selected Cases"
                  secondary={currentSelectedPatientGroup.length}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => { store.interactionStore.clearSelectedCases(); }}>
                    <CloseIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )
            : null}
          {/** Currently Selected Attributes */}
          {currentSelectSet.map((selectSet: SelectSet) => (
            <ListItem key={`${selectSet.setName}selected`}>
              {/** primary = Attribute Name.  secondary = attribute values, different values for private mode. */}
              <ListItemText
                primary={AcronymDictionary[selectSet.setName as keyof typeof AcronymDictionary] ? AcronymDictionary[selectSet.setName as keyof typeof AcronymDictionary] : selectSet.setName}
                secondary={
                  selectSet
                    .setValues
                    .map((value) => getLabel(value, selectSet.setName))
                    .sort()
                    .join(', ')
                }
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => { store.interactionStore.clearSet(selectSet.setName); }}>
                  <CloseIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}

        </List>
        <CenterAlignedDiv>
          <TinyFontButton
            disabled={!(currentSelectSet.length > 0 || currentSelectedPatientGroup.length > 0 || store.interactionStore.selectedCaseIds.length > 0)}
            variant="outlined"
            onClick={() => {
              const selectedCases = store.filteredCases.filter((caseRecord) => store.interactionStore.selectedCaseIds.includes(caseRecord.case_id));
              store.interactionStore.updateFilteredPatientGroup(selectedCases);
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
