import { makeAutoObservable } from "mobx";
import { clearAllFilter, clearSet, outputToFilter, removeFilter, selectSet, setCurrentSelectPatient, updateBrushPatient, updateProcedureSelection, updateSelectedPatientGroup } from "./Actions/SelectionActions";
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

    removeFilter(filterNameToRemove: string) {
        this.provenance.apply(removeFilter(filterNameToRemove))
    }

    selectSet(selectSetName: string, selectSetInput: string, replace: boolean) {
        this.provenance.apply(selectSet(selectSetName, selectSetInput, replace))
    }
    clearSet(selectSetName: string) {
        this.provenance.apply(clearSet(selectSetName))
    }
}