import React, {
    FC,
    useState,
    useEffect
} from "react";
import { inject, observer } from "mobx-react";
import Store from "../../Interfaces/Store";
import { List, Container, Button } from "semantic-ui-react";
import { HIPAA_Sensitive, AxisLabelDict, stateUpdateWrapperUseJSON } from "../../PresetsProfile";
import { actions } from "../..";

interface OwnProps {
    store?: Store;
}

export type Props = OwnProps;

const DetailView: FC<Props> = ({ store }: Props) => {
    const { currentSelectPatient, dateRange } = store!

    const [individualInfo, setIndividualInfo] = useState<any>(null)



    useEffect(() => {
        async function fetchIndividualInformaiton() {
            if (currentSelectPatient) {
                const fetchResult = await fetch(`http://localhost:8000/api/fetch_patient?patient_id=${currentSelectPatient.patientID}`)
                const fetchResultJson = await fetchResult.json();
                const individualInfoJSON = fetchResultJson.result[0];

                //    console.log(individualInfo)
                const fetchTransfused = await fetch(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&date_range=${dateRange}&case_ids=${currentSelectPatient.caseId}`)
                const fetchResultTran = await fetchTransfused.json();
                //  console.log(fetchResultTran)
                const transfusedInfo = fetchResultTran[0].transfused_units;
                const transfusionResult = {
                    PRBC_UNITS: transfusedInfo[0] || 0,
                    FFP_UNITS: transfusedInfo[1] || 0,
                    PLT_UNITS: transfusedInfo[2] || 0,
                    CRYO_UNITS: transfusedInfo[3] || 0,
                    CELL_SAVER_ML: transfusedInfo[4] || 0
                }

                const fetchSurgery = await fetch(`http://localhost:8000/api/fetch_surgery?case_id=${currentSelectPatient.caseId}`)
                const fetchSurgeryJson = await fetchSurgery.json();
                const surgeryInfo = fetchSurgeryJson.result[0];

                const fetchRisk = await fetch(`http://localhost:8000/api/risk_score?patient_ids=${currentSelectPatient.patientID}`)
                const fetchRiskJson = await fetchRisk.json();
                const riskInfo = { ROM: fetchRiskJson[0].apr_drg_rom, SOI: fetchRiskJson[0].apr_drg_soi }

                const fetchOutcome = await fetch(`http://localhost:8000/api/patient_outcomes?patient_ids=${currentSelectPatient.patientID}`)
                const fetchOutcomeJson = await fetchOutcome.json();
                const outcomeInfo = { Mortality: fetchOutcomeJson[0].patient_death === 0 ? "Yes" : "No", Vent: fetchOutcomeJson[0].gr_than_1440_vent === 0 ? "Yes" : "No" }

                //  console.log(surgeryInfo)
                let final_result = Object.assign(individualInfoJSON, surgeryInfo)
                final_result = Object.assign(final_result, transfusionResult)
                final_result = Object.assign(final_result, riskInfo)
                final_result = Object.assign(final_result, outcomeInfo)

                stateUpdateWrapperUseJSON(individualInfo, final_result, setIndividualInfo)
                //  setIndividualInfo(final_result)
            }
            else {
                stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo)
            }

        }
        fetchIndividualInformaiton()

    }, [currentSelectPatient])

    const generate_List_Items = () => {
        let result = [];
        if (individualInfo) {
            result.push(<List.Header><b style={{}}>Selected Patient</b></List.Header>)
            for (let [key, val] of Object.entries(individualInfo)) {
                if (!HIPAA_Sensitive.has(key)) {
                    result.push(

                        <List.Item>
                            <List.Content>{AxisLabelDict[key] ? AxisLabelDict[key] : key}</List.Content>
                            <List.Description>{val as string}</List.Description>
                        </List.Item>)
                }

            }
        }
        return result
    }




    return (
        <Container>
            <div style={{ visibility: individualInfo ? "visible" : "hidden" }}>
                <Button floated="right" icon="close" circular compact size="mini" basic onClick={() => { actions.selectPatient(null) }} /></div>
            <List>

                {generate_List_Items()}
            </List>
        </Container>
    )
}


export default inject("store")(observer(DetailView));

