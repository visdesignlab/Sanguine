import { makeAutoObservable } from "mobx";
import { updateProcedureSelection, updateSelectedPatientGroup } from "./Actions/SelectionActions";
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

    updateProcedureSelection(newProcedures: string) {
        this.provenance.apply(updateProcedureSelection(newProcedures))
    }


}