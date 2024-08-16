import { CircularProgress, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useEffect, useState } from "react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import CloseIcon from '@mui/icons-material/Close';
import { AcronymDictionary, HIPAA_Sensitive, SurgeryUrgencyArray } from "../../../Presets/DataDict";
import { UtilityContainer, CaseListSubheader, CenterAlignedDiv } from "../../../Presets/StyledComponents";


const CaseInfo: FC = () => {

    const [individualInfo, setIndividualInfo] = useState<any>(null);
    const store = useContext(Store);

    const { currentSelectPatient } = store.provenanceState;

    const generate_List_Items = () => {
        let result = [];
        if (individualInfo) {
            for (let [key, val] of Object.entries(individualInfo)) {
                if (!HIPAA_Sensitive.has(key) || store.configStore.privateMode) {
                    result.push(
                        <ListItem>
                            <ListItemText primary={AcronymDictionary[key] ? AcronymDictionary[key] : key} secondary={val} />
                        </ListItem>
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
                const fetchResult = await fetch(`${import.meta.env.REACT_APP_QUERY_URL}fetch_patient?patient_id=${currentSelectPatient.MRN}`);

                const fetchResultJson = await fetchResult.json();
                const individualInfoJSON = fetchResultJson.result[0];

                const fetchSurgery = await fetch(`${import.meta.env.REACT_APP_QUERY_URL}fetch_surgery?case_id=${currentSelectPatient.CASE_ID}`);
                const fetchSurgeryJson = await fetchSurgery.json();
                let surgeryInfo = fetchSurgeryJson.result[0];
                surgeryInfo["CPT Codes"] = surgeryInfo.cpt.join(', ');
                delete surgeryInfo.cpt;

                let final_result = Object.assign(individualInfoJSON, surgeryInfo);

                final_result = Object.assign(final_result, currentSelectPatient);

                const outcomeAttributes = ["DEATH", "ECMO", "STROKE", "VENT", "AMICAR", "TXA", "B12"];
                outcomeAttributes.forEach((attribute) => {
                    final_result[attribute] = final_result[attribute] === 0 ? "No" : "Yes";
                });

                final_result.SURGERY_TYPE_DESC = SurgeryUrgencyArray[final_result.SURGERY_TYPE_DESC];
                stateUpdateWrapperUseJSON(individualInfo, final_result, setIndividualInfo);
            }
            else {
                stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo);
            }
        }
        fetchIndividualInformaiton();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSelectPatient]);
    return (<UtilityContainer style={{ height: "80vh", padding: "1px", visibility: currentSelectPatient ? "visible" : "hidden" }}>

        <List dense>
            <CaseListSubheader>
                <ListItemText primary={`Case Info`} />
                <ListItemSecondaryAction>

                    <IconButton edge="end"
                        onClick={() => {
                            store.selectionStore.setCurrentSelectPatient(null);
                        }}>
                        <CloseIcon />
                    </IconButton>
                </ListItemSecondaryAction>

            </CaseListSubheader>
            {individualInfo ? generate_List_Items() : <CenterAlignedDiv><CircularProgress /></CenterAlignedDiv>}
        </List>
    </UtilityContainer>);
};

export default observer(CaseInfo);