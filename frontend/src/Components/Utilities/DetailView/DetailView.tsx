import { Divider } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import CaseInfo from "./CaseInfo";
import CaseList from "./CaseList";

const DetailView: FC = () => {

  const store = useContext(Store);
  const { currentBrushedPatientGroup } = store.state;

  return (
    <div
      style={{ visibility: currentBrushedPatientGroup.length > 0 ? "visible" : "hidden" }}
    >
      <CaseList />
      <Divider orientation="horizontal" style={{ width: '100%' }} />
      <CaseInfo />
    </div>
  );
};

export default observer(DetailView);