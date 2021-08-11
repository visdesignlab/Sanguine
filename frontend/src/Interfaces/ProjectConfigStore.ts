import { makeAutoObservable } from "mobx";
import { changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, dateRangeChange, loadPreset, toggleShowZero } from "./Actions/ProjectConfigActions";
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
    savedState: string[]

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
        makeAutoObservable(this)
        this._isLoggedIn = !(process.env.REACT_APP_REQUIRE_LOGIN === "true");
        //TODO don't forget to change this;
        this._dataLoading = true;
        this._dataLoadingFailed = false;
        this._topMenuBarAddMode = false;
        this._nextAddingIndex = this.rootStore.state.layoutArray.length
        this.openSaveStateDialog = false;
        this.openManageStateDialog = false;
        this.openShareURLDialog = false;
        this.openShareUIDDialog = false;
        this.openCostInputModal = false;

        this.savedState = []
    }

    checkIfInSavedState = (stateName: string) => {
        return this.savedState.includes(stateName)
    }

    addNewState = (stateName: string) => {
        this.savedState.push(stateName)
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
}