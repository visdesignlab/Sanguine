import {
  CircularProgress, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText,
} from '@mui/material';
import { observer } from 'mobx-react';
import {
  useContext, useEffect, useState,
} from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { AcronymDictionary, HIPAASensitive, SurgeryUrgencyArray } from '../../../Presets/DataDict';
import { UtilityContainer, CaseListSubheader, CenterAlignedDiv } from '../../../Presets/StyledComponents';

function CaseInfo() {
  const [individualInfo, setIndividualInfo] = useState(null);
  const store = useContext(Store);

  const { currentSelectPatient } = store.provenanceState;

  const generateListItems = () => {
    const result = [];
    if (individualInfo) {
      for (const [key, val] of Object.entries(individualInfo)) {
        if (!HIPAASensitive.includes(key as never) || store.configStore.privateMode) {
          const typeNarrowedKey = key as keyof typeof AcronymDictionary;
          result.push(
            <ListItem>
              <ListItemText primary={AcronymDictionary[typeNarrowedKey] ? AcronymDictionary[typeNarrowedKey] : key} secondary={val} />
            </ListItem>,
          );
        }
      }
    }
    return result;
  };

  useEffect(() => {
    async function fetchIndividualInformaiton() {
      if (currentSelectPatient) {
        stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo);
        const fetchResult = await fetch(`${import.meta.env.VITE_APP_QUERY_URL}fetch_patient?patient_id=${currentSelectPatient.MRN}`);

        const fetchResultJson = await fetchResult.json();
        const individualInfoJSON = fetchResultJson.result[0];

        const fetchSurgery = await fetch(`${import.meta.env.VITE_APP_QUERY_URL}fetch_surgery?case_id=${currentSelectPatient.CASE_ID}`);
        const fetchSurgeryJson = await fetchSurgery.json();
        const surgeryInfo = fetchSurgeryJson.result[0];
        surgeryInfo['CPT Codes'] = surgeryInfo.cpt.join(', ');
        delete surgeryInfo.cpt;

        let finalResult = Object.assign(individualInfoJSON, surgeryInfo);

        finalResult = Object.assign(finalResult, currentSelectPatient);

        const outcomeAttributes = ['DEATH', 'ECMO', 'STROKE', 'VENT', 'AMICAR', 'TXA', 'B12'];
        outcomeAttributes.forEach((attribute) => {
          finalResult[attribute] = finalResult[attribute] === 0 ? 'No' : 'Yes';
        });

        finalResult.SURGERY_TYPE_DESC = SurgeryUrgencyArray[finalResult.SURGERY_TYPE_DESC];
        stateUpdateWrapperUseJSON(individualInfo, finalResult, setIndividualInfo);
      } else {
        stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo);
      }
    }
    fetchIndividualInformaiton();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectPatient]);
  return (
    <UtilityContainer style={{ height: '80vh', padding: '1px', visibility: currentSelectPatient ? 'visible' : 'hidden' }}>

      <List dense>
        <CaseListSubheader>
          <ListItemText primary="Case Info" />
          <ListItemSecondaryAction>

            <IconButton
              edge="end"
              onClick={() => {
                store.selectionStore.setCurrentSelectPatient(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </ListItemSecondaryAction>

        </CaseListSubheader>
        {individualInfo ? generateListItems() : <CenterAlignedDiv><CircularProgress /></CenterAlignedDiv>}
      </List>
    </UtilityContainer>
  );
}

export default observer(CaseInfo);
