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
    const { currentSelectPatient } = store!

    const [individualInfo, setIndividualInfo] = useState<any>(null)


    async function fetchIndividualInformaiton() {
        if (currentSelectPatient) {
            const fetchResult = await fetch(`http://localhost:8000/api/fetch_individual?case_id=${currentSelectPatient.caseId}`)
            const fetchResultJson = await fetchResult.json();
            const individualInfo = fetchResultJson.result[0];
            setIndividualInfo(individualInfo)
            console.log(individualInfo)
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
                        <List.Header>{key}</List.Header>   {val}
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
