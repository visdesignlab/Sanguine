import { timeFormat, timeParse } from "d3";
import { observer } from "mobx-react";
import { createContext, useContext, useState } from "react";
import { useEffect } from "react";
import { FC } from "react";
import { useIdleTimer } from "react-idle-timer";
import Dashboard from "./Dashboard";
import { defaultState } from "./Interfaces/DefaultState";
import Store from "./Interfaces/Store";
import { SingleCasePoint } from "./Interfaces/Types/DataTypes";
import { logoutHandler, whoamiAPICall } from "./Interfaces/UserManagement";
import { SurgeryUrgencyArray } from "./Presets/DataDict";
import './App.css';
import { checkIfCriteriaMet } from "./HelperFunctions/CaseListProducer";
import useDeepCompareEffect from "use-deep-compare-effect";
import BrowserWarning from "./Components/Modals/BrowserWarning";
import DataRetrieval from "./Components/Modals/DataRetrieval";

export const DataContext = createContext<SingleCasePoint[]>([]);

const App: FC = () => {
    const store = useContext(Store);
    const { bloodComponentFilter, surgeryUrgencySelection, outcomeFilter, currentSelectPatientGroup, currentOutputFilterSet, testValueFilter } = store.state;
    const [hemoData, setHemoData] = useState<SingleCasePoint[]>([]);
    const [outputFilteredData, setOutputFilteredDAta] = useState<SingleCasePoint[]>([]);

    const [dataLoading, setDataLoading] = useState(true);
    const [dataLoadingFailed, setDataLoadingFailed] = useState(false);

    useEffect(() => {
        if (process.env.REACT_APP_REQUIRE_LOGIN !== "true" || (store.configStore.isLoggedIn && hemoData.length === 0)) {
            cacheHemoData();
        }
        else {
            whoamiAPICall(store);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.configStore.isLoggedIn]);

    const handleOnIdle = (event: any) => {
        // On idle log the user out
        if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
            logoutHandler();
        }

    };

    const handleOnAction = (event: any) => {
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

    //Data Updates
    useDeepCompareEffect(() => {
        let patientIDSet: Set<number> | undefined;
        if (currentSelectPatientGroup.length > 0) {
            patientIDSet = new Set<number>();
            currentSelectPatientGroup.forEach((d) => { patientIDSet!.add(d.CASE_ID); });
        }
        const newFilteredData = hemoData.filter((eachcase: SingleCasePoint) => checkIfCriteriaMet(eachcase, surgeryUrgencySelection, outcomeFilter, currentOutputFilterSet, bloodComponentFilter, testValueFilter, patientIDSet));


        setOutputFilteredDAta(newFilteredData);
    }, [surgeryUrgencySelection, outcomeFilter, hemoData, currentOutputFilterSet, bloodComponentFilter, testValueFilter, currentSelectPatientGroup]);

    async function cacheHemoData() {
        if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
            whoamiAPICall(store);
        }
        try {
            const surgeryCasesFetch = await fetch(`${process.env.REACT_APP_QUERY_URL}get_sanguine_surgery_cases`);
            const surgeryCases = await surgeryCasesFetch.json();

            const nameDictFetch = await fetch(`${process.env.REACT_APP_QUERY_URL}surgeon_anest_names`);
            const nameDict = await nameDictFetch.json();
            store.configStore.updateNameDictionary(nameDict);
            setHemoData(surgeryCases);
        }
        catch (e) {
            setDataLoadingFailed(true);
        } finally {
            setDataLoading(false);
        }
    }

    return <DataContext.Provider value={outputFilteredData}>
        <Dashboard />
        {(process.env.REACT_APP_REQUIRE_LOGIN === "true") ?
            <>
                <BrowserWarning />
                <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
            </> : <></>}
    </DataContext.Provider>;
};

export default observer(App);
