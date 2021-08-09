import { CircularProgress, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader } from "@material-ui/core";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useEffect, useState } from "react";
import { Container } from "semantic-ui-react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import CloseIcon from '@material-ui/icons/Close';
import { AcronymDictionary, HIPAA_Sensitive, SurgeryUrgencyArray } from "../../../Presets/DataDict";
import { useStyles } from "../../../Presets/StyledComponents";

const CaseInfo: FC = () => {

    const [individualInfo, setIndividualInfo] = useState<any>(null);
    const store = useContext(Store);
    const styles = useStyles();
    const { currentSelectPatient } = store.state

    const generate_List_Items = () => {
        let result = [];
        if (individualInfo) {
            for (let [key, val] of Object.entries(individualInfo)) {
                if (!HIPAA_Sensitive.has(key)) {
                    result.push(
                        <ListItem>
                            <ListItemText primary={AcronymDictionary[key] ? AcronymDictionary[key] : key} secondary={val as string} />
                        </ListItem>
                    )
                }

            }
        }
        return result
    }

    useEffect(() => {
        async function fetchIndividualInformaiton() {

            if (currentSelectPatient) {
                const fetchResult = await fetch(`${process.env.REACT_APP_QUERY_URL}fetch_patient?patient_id=${currentSelectPatient.PATIENT_ID}`)

                const fetchResultJson = await fetchResult.json();
                const individualInfoJSON = fetchResultJson.result[0];

                const fetchSurgery = await fetch(`${process.env.REACT_APP_QUERY_URL}fetch_surgery?case_id=${currentSelectPatient.CASE_ID}`)
                const fetchSurgeryJson = await fetchSurgery.json();
                const surgeryInfo = fetchSurgeryJson.result[0];

                let final_result = Object.assign(individualInfoJSON, surgeryInfo)

                final_result = Object.assign(final_result, currentSelectPatient)

                const outcomeAttributes = ["DEATH", "ECMO", "STROKE", "VENT", "AMICAR", "TXA", "B12"]
                outcomeAttributes.forEach((attribute) => {
                    final_result[attribute] = final_result[attribute] === 0 ? "No" : "Yes"
                })

                final_result.SURGERY_TYPE = SurgeryUrgencyArray[final_result.SURGERY_TYPE];
                stateUpdateWrapperUseJSON(individualInfo, final_result, setIndividualInfo)
            }
            else {
                stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo)
            }
        }
        fetchIndividualInformaiton()

    }, [currentSelectPatient])
    return (<Container style={{ overflow: "auto", height: "85vh", visibility: currentSelectPatient ? "visible" : "hidden" }}>

        <List dense>
            <ListSubheader className={styles.subheader}>
                <ListItemText primary={`Case Info`} />
                <ListItemSecondaryAction>

                    <IconButton edge="end"
                        onClick={() => {
                            store.selectionStore.setCurrentSelectPatient(null);
                        }}>
                        <CloseIcon />
                    </IconButton>
                </ListItemSecondaryAction>

            </ListSubheader>
            {individualInfo ? generate_List_Items() : <Container className={styles.centerAlignment}><CircularProgress /></Container>}
        </List>
    </Container>)
}

export default observer(CaseInfo)