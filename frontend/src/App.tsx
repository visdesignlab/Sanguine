import { observer } from "mobx-react";
import { useContext, useState } from "react";
import { useEffect } from "react";
import { FC } from "react";
import { useIdleTimer } from "react-idle-timer";
import Dashboard from "./Dashboard";
import Store from "./Interfaces/Store";
import { logoutHandler, whoamiAPICall } from "./Interfaces/UserManagement";
import { SurgeryUrgencyArray, SurgeryUrgencyType } from "./Presets/DataDict";
import './App.css';
import BrowserWarning from "./Components/Modals/BrowserWarning";
import DataRetrieval from "./Components/Modals/DataRetrieval";

const App: FC = () => {
  const store = useContext(Store);
  const { currentSelectPatientGroup, allCases } = store.provenanceState;

  const [dataLoading, setDataLoading] = useState(true);
  const [dataLoadingFailed, setDataLoadingFailed] = useState(false);

  useEffect(() => {
    if (process.env.REACT_APP_REQUIRE_LOGIN !== "true" || (store.configStore.isLoggedIn && allCases.length === 0)) {
      fetchAllCases();
    } else {
      whoamiAPICall(store);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.configStore.isLoggedIn]);

  const handleOnIdle = () => {
    // On idle log the user out
    if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
      logoutHandler();
    }

  };

  const handleOnAction = () => {
    if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
      whoamiAPICall(store);
    }
  };

  useIdleTimer({
    //the idle timer setting
    timeout: 1000 * 60 * 120,
    onIdle: handleOnIdle,
    onAction: handleOnAction,
    events: ["mousedown", "keydown"],
    throttle: 1000 * 60
  });

  async function fetchAllCases() {
    if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
      whoamiAPICall(store);
    }
    try {
      const surgeryCasesFetch = await fetch(`${process.env.REACT_APP_QUERY_URL}get_sanguine_surgery_cases`);
      const surgeryCasesInput = await surgeryCasesFetch.json();

      // Fix data types for the surgery cases
      let minDate = +Infinity;
      let maxDate = -Infinity;
      const surgeryCases = {
        result: surgeryCasesInput.result.map((d: any) => {
          const preopHemo = parseFloat(`${d.PREOP_HEMO}`);
          const postopHemo = parseFloat(`${d.POSTOP_HEMO}`);
          const drgWeight = parseFloat(`${d.DRG_WEIGHT}`);
          const surgeryTypeIndex = SurgeryUrgencyArray.indexOf(d.SURGERY_TYPE_DESC as any);
          const caseDate = new Date(d.CASE_DATE).getTime();

          minDate = Math.min(minDate, caseDate);
          maxDate = Math.max(maxDate, caseDate);

          return {
            ...d,
            CASE_DATE: new Date(d.CASE_DATE).getTime(),
            PRBC_UNITS: d.PRBC_UNITS ? d.PRBC_UNITS : 0,
            FFP_UNITS: d.FFP_UNITS ? d.FFP_UNITS : 0,
            PLT_UNITS: d.PLT_UNITS ? d.PLT_UNITS : 0,
            CRYO_UNITS: d.CRYO_UNITS ? d.CRYO_UNITS : 0,
            CELL_SAVER_ML: d.CELL_SAVER_ML ? d.CELL_SAVER_ML : 0,
            PREOP_HEMO: !Number.isNaN(preopHemo) ? preopHemo : 0,
            POSTOP_HEMO: !Number.isNaN(postopHemo) ? postopHemo : 0,
            VENT: d.VENT ? d.VENT : 0,
            DRG_WEIGHT: !Number.isNaN(drgWeight) ? drgWeight : 0,
            DEATH: d.DEATH === "Y" ? 1 : 0,
            ECMO: d.ECMO ? d.ECMO : 0,
            STROKE: d.STROKE ? d.STROKE : 0,
            TXA: d.TXA ? d.TXA : 0,
            B12: d.B12 ? d.B12 : 0,
            AMICAR: d.AMICAR ? d.AMICAR : 0,
            SURGERY_TYPE_DESC: (surgeryTypeIndex > -1 ? SurgeryUrgencyArray[surgeryTypeIndex] : "Unknown") as SurgeryUrgencyType,
          };
        })
      };

      if (surgeryCases.result?.length === 0) {
        throw new Error("There was an issue fetching data. No results were returned.");
      }

      // const nameDictFetch = await fetch(`${process.env.REACT_APP_QUERY_URL}surgeon_anest_names`);
      // const nameDict = await nameDictFetch.json();
      // store.configStore.updateNameDictionary(nameDict);

      store.allCases = surgeryCases.result;
    }
    catch (e) {
      setDataLoadingFailed(true);
    } finally {
      setDataLoading(false);
    }
  }

  return <>
    <Dashboard />
    {(process.env.REACT_APP_REQUIRE_LOGIN === "true") ?
      <>
        <BrowserWarning />
        <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
      </> : <></>}
  </>;
};

export default observer(App);
