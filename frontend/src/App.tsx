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
        // let patientIDSet: Set<number> | undefined;
        // if (currentSelectPatientGroup.length > 0) {
        //     patientIDSet = new Set<number>();
        //     currentSelectPatientGroup.forEach((d) => { patientIDSet!.add(d.CASE_ID); });
        // }
        // const newFilteredData = hemoData.filter((eachcase: SingleCasePoint) => checkIfCriteriaMet(eachcase, surgeryUrgencySelection, outcomeFilter, currentOutputFilterSet, bloodComponentFilter, testValueFilter, patientIDSet));


        setOutputFilteredDAta(hemoData);
    }, [surgeryUrgencySelection, outcomeFilter, hemoData, currentOutputFilterSet, bloodComponentFilter, testValueFilter, currentSelectPatientGroup]);

    async function cacheHemoData() {
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

            store.state.rawDateRange = [minDate, maxDate];
            setHemoData(surgeryCases.result);
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
