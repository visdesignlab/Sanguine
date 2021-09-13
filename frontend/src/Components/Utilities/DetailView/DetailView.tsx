import { Container, Divider } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import CaseInfo from "./CaseInfo";
import CaseList from "./CaseList";

const DetailView: FC = () => {

    const store = useContext(Store);
    const { currentBrushedPatientGroup } = store.state

    return (
        <Container
            style={{ visibility: currentBrushedPatientGroup.length > 0 ? "visible" : "hidden" }}
        >
            <CaseList />
            <Divider orientation="horizontal" style={{ width: '100%' }} />
            <CaseInfo />
        </Container>
    )
}

export default observer(DetailView)