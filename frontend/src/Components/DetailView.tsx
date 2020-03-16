import React, {
    FC,
    useState,
    useEffect
} from "react";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import Store from "../Interfaces/Store";
import { Message, List } from "semantic-ui-react";

interface OwnProps {
    store?: Store;
}

export type Props = OwnProps;

const DetailView: FC<Props> = ({ store }: Props) => {
    const { currentSelectPatient, actualYearRange } = store!

    const [individualInfo, setIndividualInfo] = useState<any>(null)


    async function fetchIndividualInformaiton() {
        if (currentSelectPatient) {
            const fetchResult = await fetch(`http://localhost:8000/api/fetch_patient?patient_id=${currentSelectPatient.patientID}`)
            const fetchResultJson = await fetchResult.json();
            const individualInfo = fetchResultJson.result[0];

            console.log(individualInfo)
            const fetchTransfused = await fetch(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&year_range=${actualYearRange}&patient_id=${currentSelectPatient.patientID}`)
            const fetchResultTran = await fetchTransfused.json();
            let transfused_info = fetchResultTran.result.filter((d: { case_id: number; }) => d.case_id === currentSelectPatient.caseId)[0];
            delete transfused_info.case_id
            //console.log(transfused_info)
            const fetchSurgery = await fetch(`http://localhost:8000/api/fetch_surgery?case_id=${currentSelectPatient.caseId}`)
            const fetchSurgeryJson = await fetchSurgery.json();
            const surgeryInfo = fetchSurgeryJson.result[0];
            console.log(surgeryInfo)
            let final_result = Object.assign(individualInfo, surgeryInfo)
            final_result = Object.assign(final_result, transfused_info)
            setIndividualInfo(final_result)
        }
        else {
            setIndividualInfo(null)
        }

    }
    useEffect(() => {
        fetchIndividualInformaiton()

    }, [currentSelectPatient])

    const generate_List_Items = () => {
        let result = [];
        if (individualInfo) {

            for (let [key, val] of Object.entries(individualInfo)) {
                result.push(
                    <List.Item>
                        <List.Header>{key}</List.Header>
                        {/* {val} */}
                        x
                    </List.Item>)
            }
        }
        return result
    }
    return (
        <Message>
            <Message.Header>Selected Patient</Message.Header>
            <List>
                {generate_List_Items()}
            </List>
        </Message>)
}

export default inject("store")(observer(DetailView));
