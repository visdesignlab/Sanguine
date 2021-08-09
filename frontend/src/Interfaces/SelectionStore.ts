import { makeAutoObservable } from "mobx";
import { clearAllFilter, outputToFilter, setCurrentSelectPatient, updateBrushPatient, updateProcedureSelection, updateSelectedPatientGroup } from "./Actions/SelectionActions";
import { RootStore } from "./Store";
import { SingleCasePoint } from "./Types/DataTypes";

export class SelectionStore {
    rootStore: RootStore;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this)
    }

    get provenance() {
        return this.rootStore.provenance;
    }

    updateSelectedPatientGroup(caseList: SingleCasePoint[]) {
        this.provenance.apply(updateSelectedPatientGroup(caseList))
    }

    updateProcedureSelection(newProcedures: string, removing: boolean) {
        this.provenance.apply(updateProcedureSelection(newProcedures, removing))
    }

    updateBrush(caseList: SingleCasePoint[]) {
        this.provenance.apply(updateBrushPatient(caseList))
    }

    setCurrentSelectPatient(newCase: SingleCasePoint | null) {
        this.provenance.apply(setCurrentSelectPatient(newCase))
    }

    clearAllFilter() {
        this.provenance.apply(clearAllFilter())
    }

    outputToFilter() {
        this.provenance.apply(outputToFilter())
    }
}