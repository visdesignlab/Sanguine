import React, {
    FC,
    useState,
    useEffect
} from "react";
import { inject, observer } from "mobx-react";
import Store from "../../Interfaces/Store";
import { List, Container, Button, Header, Search } from "semantic-ui-react";
import { HIPAA_Sensitive, AcronymDictionary, Title } from "../../PresetsProfile";
import styled from "styled-components";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import { SingleCasePoint } from "../../Interfaces/ApplicationState";
import { actions } from "../..";

interface OwnProps {
    hemoData: SingleCasePoint[];
    store?: Store;
}

export type Props = OwnProps;

const DetailView: FC<Props> = ({ hemoData, store }: Props) => {
    const {
        currentBrushedPatientGroup
    } = store!

    const [individualInfo, setIndividualInfo] = useState<any>(null);
    const [currentSelectPatient, setCurrentSelectPatient] = useState<SingleCasePoint | undefined>(undefined);
    const [searchCaseVal, setSearchCaseVal] = useState("");
    const [caseSearchResult, setCaseSearchResult] = useState<any[]>([]);

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
                    final_result[attribute] = final_result[attribute] === "0" ? "No" : "Yes"
                })
                stateUpdateWrapperUseJSON(individualInfo, final_result, setIndividualInfo)

            }
            else {
                stateUpdateWrapperUseJSON(individualInfo, null, setIndividualInfo)
            }

        }
        fetchIndividualInformaiton()

    }, [currentSelectPatient, individualInfo])

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
                            <List.Header >{AcronymDictionary[key] ? AcronymDictionary[key] : key}</List.Header>
                            <List.Content>{val as string}</List.Content>
                        </List.Item>
                    )
                }

            }
        }
        return result
    }




    return (
        <Container>
            <Container>
                <Title >Detail View</Title>
            </Container>
            <Container style={{ marginTop: "0.5vh" }}>
                <Search
                    placeholder="Search a Case by ID"
                    //defaultValue={"Search Case"}
                    minCharacters={3}
                    onSearchChange={(e, output) => {
                        setSearchCaseVal(output.value || "")

                        if (output.value && output.value.length >= 3) {
                            let searchResult = hemoData.filter((d: any) => d.CASE_ID.toString().includes(output.value))
                            stateUpdateWrapperUseJSON(caseSearchResult, searchResult, setCaseSearchResult);
                        }
                    }
                    }
                    results={caseSearchResult.map(d => { return { title: d.CASE_ID } })}
                    onResultSelect={(e, resultSelection) => {
                        const selectedPat = caseSearchResult.filter((d: any) => d.CASE_ID === resultSelection.result.title)[0]
                        // const newSingleCasePoint: SingleCasePoint = selectedPat;
                        setSearchCaseVal("");
                        actions.updateBrushPatientGroup([selectedPat], "ADD");

                    }
                    }
                    value={searchCaseVal}
                />

            </Container>
            <BoxContainer style={{ padding: "0.01em 0.01em", visibility: currentBrushedPatientGroup.length > 0 ? "visible" : "hidden", overflow: "overlay", height: "15vh" }} >
                <List relaxed divided>
                    <List.Item key="case-header" style={{ padding: "5px" }}>
                        <List.Content floated="right"><Button icon="close" compact size="mini" basic circular onClick={() => { actions.updateBrushPatientGroup([], "REPLACE") }} /></List.Content>
                        <List.Content><Header>Case Selected</Header></List.Content>
                    </List.Item>


                    {currentBrushedPatientGroup.map(d => {
                        return (
                            <CaseItem key={d.CASE_ID}
                                isSelected={currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID}
                                onClick={() => { setCurrentSelectPatient(d) }}
                            >
                                <span style={{ paddingLeft: "5px" }}>{d.CASE_ID}</span>
                            </CaseItem>)
                    })}
                </List>
            </BoxContainer>
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
        </Container >
    )
}

const BoxContainer = styled(Container)`
    border: 1px solid #ccc!important
    padding: 0.01em 5px
    border-radius: 13px;
    margin:0.5vh
`

interface CaseItemProps {
    isSelected: boolean;
}
const CaseItem = styled(List.Item) <CaseItemProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
  cursor: pointer
  &:hover{
    background:#faeee1;
  }
`;

export default inject("store")(observer(DetailView));

