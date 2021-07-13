import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useState } from "react";
import { Grid, Container, Search } from "semantic-ui-react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";

type Props = { surgeryList: any[] }

const SurgerySearchBar: FC<Props> = ({ surgeryList }: Props) => {
    const store = useContext(Store)
    const [surgerySearchResult, setsurgerySearchResult] = useState<any[]>([]);
    const [searchSurgeryVal, setSearchSurgeryVal] = useState("");

    return (
        <Grid.Row centered >
            <Container>
                <Search
                    placeholder="Search a Procedure"
                    minCharacters={3}
                    onSearchChange={(e, output) => {
                        setSearchSurgeryVal(output.value || "")
                        if (output.value && output.value.length >= 3) {
                            let searchResult = surgeryList.filter(d => d.value.includes(output.value))
                            stateUpdateWrapperUseJSON(surgerySearchResult, searchResult, setsurgerySearchResult)
                        }
                    }}
                    results={surgerySearchResult.map(d => { return { title: d.value } })}
                    onResultSelect={(e, d) => {
                        if (!store.state.proceduresSelection.includes(d.result.title)) {
                            store.selectionStore.updateProcedureSelection(d.result.title, false)
                        }
                        setSearchSurgeryVal("")
                    }
                    }
                    value={searchSurgeryVal}
                />
            </Container>
        </Grid.Row>
    )
}

export default observer(SurgerySearchBar)