import React, {
    FC,
    useState,
    useEffect
} from "react";
import { inject, observer } from "mobx-react";
import Store from "../../Interfaces/Store";
import { List, Container, Button } from "semantic-ui-react";
import { HIPAA_Sensitive, AxisLabelDict, Title } from "../../PresetsProfile";
import { actions } from "../..";
import styled from "styled-components";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import { toJS } from "mobx";
import { SingleCasePoint } from "../../Interfaces/ApplicationState";

interface OwnProps {
    store?: Store;
}

export type Props = OwnProps;

const DetailView: FC<Props> = ({ store }: Props) => {
    const {
        currentBrushedPatientGroup,
        dateRange } = store!

    const [individualInfo, setIndividualInfo] = useState<any>(null)
    const [currentSelectPatient, setCurrentSelectPatient] = useState<SingleCasePoint | undefined>(undefined)


    useEffect(() => {
        async function fetchIndividualInformaiton() {

            if (currentSelectPatient) {
                console.log(toJS(currentSelectPatient))
                const fetchResult = await fetch(`http://localhost:8000/api/fetch_patient?patient_id=${currentSelectPatient.PATIENT_ID}`)

                const fetchResultJson = await fetchResult.json();

                const individualInfoJSON = fetchResultJson.result[0];
                const fetchSurgery = await fetch(`http://localhost:8000/api/fetch_surgery?case_id=${currentSelectPatient.CASE_ID}`)
                const fetchSurgeryJson = await fetchSurgery.json();
                const surgeryInfo = fetchSurgeryJson.result[0];

                let final_result = Object.assign(individualInfoJSON, surgeryInfo)
                console.log(final_result)
                final_result = Object.assign(final_result, currentSelectPatient)
                console.log(final_result)


                const outcomeAttributes = ["DEATH", "ECMO", "STROKE", "VENT"]
                outcomeAttributes.forEach((attribute) => {
                    final_result[attribute] = final_result[attribute] === "0" ? "No" : "Yes"
                })
                stateUpdateWrapperUseJSON(individualInfo, final_result, setIndividualInfo)

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
            result.push(
                <List.Header>
                    <Title>Selected Patient</Title>
                </List.Header>)
            for (let [key, val] of Object.entries(individualInfo)) {
                if (!HIPAA_Sensitive.has(key)) {
                    result.push(
                        <List.Item>
                            <List.Header >{AxisLabelDict[key] ? AxisLabelDict[key] : key}</List.Header>
                            <List.Content>{val as string}</List.Content>
                        </List.Item>
                    )
                }

            }
        }
        return result
    }




    return (
        <BoxContainer
            style={{ visibility: individualInfo ? "visible" : "hidden" }}
        >
            {/* <div  */}
            <Button floated="right" style={{ "margin-top": "10px" }} icon="close" circular compact size="mini" basic
                onClick={() => {
                    setCurrentSelectPatient(undefined)
                    // actions.selectPatient(null) 
                }}
            />
            {/* </div> */}
            <List>
                {generate_List_Items()}
            </List>
        </BoxContainer>
    )
}

const BoxContainer = styled(Container)`
    border: 1px solid #ccc!important
    padding: 0.01em 16px
    border-radius: 16px
`

export default inject("store")(observer(DetailView));

