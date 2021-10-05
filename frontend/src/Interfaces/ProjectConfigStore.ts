import { makeAutoObservable } from "mobx";
import { BloodComponentOptions } from "../Presets/DataDict";
import { changeBloodFilter, changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, changeTestValueFilter, clearAllFilter, dateRangeChange, loadPreset, resetBloodFilter, resetTestValueFilter, toggleShowZero } from "./Actions/ProjectConfigActions";
import { RootStore } from "./Store";
import { LayoutElement } from "./Types/LayoutTypes";

export class ProjectConfigStore {
    rootStore: RootStore;
    private _isLoggedIn: boolean;
    private _dataLoading: boolean;
    private _dataLoadingFailed: boolean;
    private _topMenuBarAddMode: boolean;
    openSaveStateDialog: boolean;
    openManageStateDialog: boolean;
    openShareUIDDialog: boolean;
    openCostInputModal: boolean;
    openStateAccessControl: boolean;
    openAboutDialog: boolean;
    loadedStateName: string;
    openSnackBar: boolean;
    snackBarMessage: string;
    largeFont: boolean;
    savedState: string[];
    filterRange: any;
    snackBarIsError: boolean;
    privateMode: boolean;
    stateToUpdate: string;

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
        this._isLoggedIn = !(process.env.REACT_APP_REQUIRE_LOGIN === "true");
        this._dataLoading = true;
        this.largeFont = false;
        this.privateMode = false;
        this._dataLoadingFailed = false;
        this._topMenuBarAddMode = false;
        this.openSaveStateDialog = false;
        this.openManageStateDialog = false;
        this.openShareUIDDialog = false;

        this.openSnackBar = false;
        this.snackBarMessage = "";
        this.snackBarIsError = false;

        this.loadedStateName = ""
        this.openCostInputModal = false;
        this.openStateAccessControl = false;
        this.openAboutDialog = false;
        this.filterRange = { PRBC_UNITS: 0, FFP_UNITS: 0, PLT_UNITS: 0, CRYO_UNITS: 0, CELL_SAVER_ML: 0, PREOP_HGB: 0, POSTOP_HGB: 0 };
        this.stateToUpdate = ""

        this.savedState = ["asdfkjhasdhahahahahahahlongstate"]
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


    changeSurgeryUrgencySelection(input: [boolean, boolean, boolean]) {
        this.provenance.apply(changeSurgeryUrgencySelection(input))
    }

    changeCostConfig(componentName: string, newCost: number) {
        this.provenance.apply(changeCostConfig(componentName, newCost))
    }
    changeOutcomeFilter(newOutcomeFilter: string[]) {
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

    clearAllFilter() {
        this.provenance.apply(clearAllFilter())
    }
}