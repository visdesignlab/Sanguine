import { action, makeAutoObservable } from "mobx";
import { BloodComponentOptions, ScatterYOptions } from "../Presets/DataDict";
import { changeBloodFilter, changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, changeTestValueFilter, dateRangeChange, loadPreset, resetBloodFilter, resetTestValueFilter, toggleShowZero } from "./Actions/ProjectConfigActions";
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
    filterRange: any;

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
        this.filterRange = { PRBC_UNITS: 0, FFP_UNITS: 0, PLT_UNITS: 0, CRYO_UNITS: 0, CELL_SAVER_ML: 0, PREOP_HGB: 0, POSTOP_HGB: 0 };
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
        BloodComponentOptions.forEach((d) => {
            this.filterRange[d.key] = transfusedResult[d.key] > this.filterRange[d.key] ? transfusedResult[d.key] : this.filterRange[d.key];
        });
    }

    updateTestValue = (label: string, value: number) => {
        this.filterRange[label] = value > this.filterRange[label] ? value : this.filterRange[label]
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
    resetBloodFilter() {
        this.provenance.apply(resetBloodFilter());
    }

    changeTestValueFilter(testValueName: string, newRange: number[]) {
        this.provenance.apply(changeTestValueFilter(testValueName, newRange))
    }
    resetTestValueFilter() {
        this.provenance.apply(resetTestValueFilter());
    }
}