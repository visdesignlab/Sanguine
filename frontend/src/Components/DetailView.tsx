import React, {
    FC,
    useState,
    useEffect
} from "react";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import Store from "../Interfaces/Store";
import { Message } from "semantic-ui-react";

interface OwnProps {
    store?: Store;
}

export type Props = OwnProps;

const DetailView: FC<Props> = ({ store }: Props) => {
    const { currentSelectPatient } = store!

    const [individualInfo,setIndividualInfo] = useState<any>(null)


    async function fetchIndividualInformaiton() {
        if (currentSelectPatient) {
            const fetchResult = await fetch(`http://localhost:8000/api/fetch_individual?case_id=${currentSelectPatient.caseId}`)
            const fetchResultJson = await fetchResult.json();
            const individualInfo = fetchResultJson.result;
            setIndividualInfo(individualInfo)
        }
    }
    useEffect(() => {
        fetchIndividualInformaiton()
    },[currentSelectPatient])
    return (
        <Message>
        <Message.Header>Selected Patient</Message.Header>
        <Message.Item>{individualInfo?individualInfo.toString():""}</Message.Item>
    </Message>)
}

export default inject("store")(observer(DetailView));
