import { action, makeAutoObservable } from "mobx";
import { changeBloodFilter, changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, dateRangeChange, loadPreset, toggleShowZero } from "./Actions/ProjectConfigActions";
import { RootStore } from "./Store";
import { LayoutElement } from "./Types/LayoutTypes";

export class ProjectConfigStore {
    rootStore: RootStore;
    private _isLoggedIn: boolean;
    private _dataLoading: boolean;
    private _dataLoadingFailed: boolean;
    private _topMenuBarAddMode: boolean;
    //this might not work with loading state. If not, just change this to part of state. 
    private _nextAddingIndex: number;
    openSaveStateDialog: boolean;
    openManageStateDialog: boolean;
    openShareURLDialog: boolean;
    openShareUIDDialog: boolean;
    openCostInputModal: boolean;
    savedState: string[];
    bloodComponentRange: any;

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
        this._isLoggedIn = !(process.env.REACT_APP_REQUIRE_LOGIN === "true");
        this._dataLoading = true;
        this._dataLoadingFailed = false;
        this._topMenuBarAddMode = false;
        this._nextAddingIndex = this.rootStore.state.layoutArray.length
        this.openSaveStateDialog = false;
        this.openManageStateDialog = false;
        this.openShareURLDialog = false;
        this.openShareUIDDialog = false;
        this.openCostInputModal = false;
        this.bloodComponentRange = { PRBC_UNITS: 0, FFP_UNITS: 0, PLT_UNITS: 0, CRYO_UNITS: 0, CELL_SAVER_ML: 0 }
        this.savedState = []
        makeAutoObservable(this)
    }

    checkIfInSavedState = (stateName: string) => {
        return this.savedState.includes(stateName)
    }

    addNewState = (stateName: string) => {
        this.savedState.push(stateName)
    }

    updateRange = (transfusedResult: any) => {
        this.bloodComponentRange.PRBC_UNITS = transfusedResult.PRBC_UNITS > this.bloodComponentRange.PRBC_UNITS ? transfusedResult.PRBC_UNITS : this.bloodComponentRange.PRBC_UNITS;
        this.bloodComponentRange.FFP_UNITS = transfusedResult.FFP_UNITS > this.bloodComponentRange.FFP_UNITS ? transfusedResult.FFP_UNITS : this.bloodComponentRange.FFP_UNITS;
        this.bloodComponentRange.PLT_UNITS = transfusedResult.PLT_UNITS > this.bloodComponentRange.PLT_UNITS ? transfusedResult.PLT_UNITS : this.bloodComponentRange.PLT_UNITS;
        this.bloodComponentRange.CRYO_UNITS = transfusedResult.CRYO_UNITS > this.bloodComponentRange.CRYO_UNITS ? transfusedResult.CRYO_UNITS : this.bloodComponentRange.CRYO_UNITS;
        this.bloodComponentRange.CELL_SAVER_ML = transfusedResult.CELL_SAVER_ML > this.bloodComponentRange.CELL_SAVER_ML ? transfusedResult.CELL_SAVER_ML : this.bloodComponentRange.CELL_SAVER_ML;
    }

    get provenance() {
        return this.rootStore.provenance
    }

    set isLoggedIn(input: boolean) {
        this._isLoggedIn = input
    }

    get isLoggedIn() {
        return this._isLoggedIn;
    }
    set dataLoading(input: boolean) {
        this._dataLoading = input
    }

    get dataLoading() {
        return this._dataLoading;
    }
    set dataLoadingFailed(input: boolean) {
        this._dataLoadingFailed = input
    }

    get dataLoadingFailed() {
        return this._dataLoadingFailed;
    }

    set topMenuBarAddMode(input: boolean) {
        console.log(input)
        this._topMenuBarAddMode = input
    }

    get topMenuBarAddMode() {
        return this._topMenuBarAddMode;
    }

    chartAdded() {
        this._nextAddingIndex += 1
    }

    get nextAddingIndex() {
        return this._nextAddingIndex.toString();
    }


    changeSurgeryUrgencySelection(input: [boolean, boolean, boolean]) {
        this.provenance.apply(changeSurgeryUrgencySelection(input))
    }

    changeCostConfig(componentName: string, newCost: number) {
        this.provenance.apply(changeCostConfig(componentName, newCost))
    }
    changeOutcomeFilter(newOutcomeFilter: string) {
        this.provenance.apply(changeOutcomeFilter(newOutcomeFilter))
    }

    toggleShowZero(showZero: boolean) {
        this.provenance.apply(toggleShowZero(showZero))
    }
    dateRangeChange(dateRange: number[]) {
        this.provenance.apply(dateRangeChange(dateRange))
    }
    loadPreset(layoutInput: LayoutElement[]) {
        this.provenance.apply(loadPreset(layoutInput))
    }
    changeBloodFilter(componentName: string, newRange: number[]) {
        this.provenance.apply(changeBloodFilter(componentName, newRange))
    }
}