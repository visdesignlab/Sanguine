import {
  Box, CircularProgress, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader,
} from '@mui/material';
import { observer } from 'mobx-react';
import {
  useContext, useEffect, useState,
} from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { AcronymDictionary, HIPAASensitive, SurgeryUrgencyArray } from '../../../Presets/DataDict';
import { CenterAlignedDiv } from '../../../Presets/StyledComponents';

function CaseInfo() {
  const [individualInfo, setIndividualInfo] = useState(null);
  const store = useContext(Store);

  const { currentSelectPatient } = store.provenanceState;

  const generateListItems = () => {
    const result: JSX.Element[] = [];
    if (individualInfo) {
      Object.entries(individualInfo).forEach(([key, val], idx) => {
        if (!HIPAASensitive.includes(key as never) || store.configStore.privateMode) {
          const typeNarrowedKey = key as keyof typeof AcronymDictionary;
          result.push(
            <ListItem key={`case-info-${idx}`}>
              <ListItemText primary={AcronymDictionary[typeNarrowedKey] ? AcronymDictionary[typeNarrowedKey] : key} secondary={val} />
            </ListItem>,
          );
        }
      });
    }
    return result;
  };

  useEffect(() => {
    if (currentSelectPatient) {
      stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo);
      const individualInfoJSON = currentSelectPatient;

      const outcomeAttributes = ['DEATH', 'ECMO', 'STROKE', 'VENT', 'AMICAR', 'TXA', 'B12', 'IRON'];
      outcomeAttributes.forEach((attribute) => {
        individualInfoJSON[attribute] = individualInfoJSON[attribute] === 0 ? 'No' : 'Yes';
      });

      individualInfoJSON.surgery_type_desc = SurgeryUrgencyArray[individualInfoJSON.surgery_type_desc];
      stateUpdateWrapperUseJSON(individualInfo, individualInfoJSON, setIndividualInfo);
    } else {
      stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectPatient]);
  return (
    <Box
      p={0.1}
      style={{
        height: 'calc(100vh - 64px - 20vh - 1px',
        overflow: 'auto',
        visibility: currentSelectPatient ? 'visible' : 'hidden',
      }}
    >
      <List
        dense
        sx={{
          bgcolor: 'background.paper',
          position: 'relative',
          overflow: 'auto',
          '& ul': { padding: 0 },
          height: '98%',
          width: '100%',
        }}
        subheader={<li />}
      >
        <ListSubheader sx={{ p: 1 }}>
          <ListItemText primary="Case Info" />
          <ListItemSecondaryAction>

            <IconButton
              edge="end"
              onClick={() => {
                store.interactionStore.setCurrentSelectPatient(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListSubheader>

        {individualInfo
          // ? generateListItems()
          ? JSON.stringify(individualInfo, null, 2).split('\n').map((line, idx) => (
            <ListItem key={`case-info-${idx}`}>
              <ListItemText primary={line} />
            </ListItem>
          ))
          : <CenterAlignedDiv><CircularProgress /></CenterAlignedDiv>}
      </List>
    </Box>
  );
}

export default observer(CaseInfo);
