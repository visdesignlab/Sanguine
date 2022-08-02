import { makeAutoObservable } from "mobx";
import { changeCostConfig, changeFilter, changeOutcomeFilter, changeSurgeryUrgencySelection, clearAllFilter, dateRangeChange, loadPreset, resetSelectedFilter, toggleShowZero } from "./Actions/ProjectConfigActions";
import { defaultState } from "./DefaultState";
import { RootStore } from "./Store";
import { FilterType } from "./Types/DataTypes";
import { LayoutElement } from "./Types/LayoutTypes";

export class ProjectConfigStore {
    rootStore: RootStore;
    private _isLoggedIn: boolean;
    private _dataLoading: boolean;
    private _dataLoadingFailed: boolean;
    private _topMenuBarAddMode: boolean;

    //TODO simplify the bunch of open/close states
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
    filterRange: FilterType;
    snackBarIsError: boolean;
    privateMode: boolean;
    stateToUpdate: string;
    nameDictionary: any;

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
        this.loadedStateName = "";
        this.openCostInputModal = false;
        this.openStateAccessControl = false;
        this.openAboutDialog = false;
        this.filterRange = defaultState.allFilters;
        this.stateToUpdate = "";

        this.nameDictionary = {};
        this.savedState = [];
        makeAutoObservable(this);
    }

    checkIfInSavedState = (stateName: string) => {
        return this.savedState.includes(stateName);
    };

    updateNameDictionary = (newNameDictionary: any) => {
        this.nameDictionary = newNameDictionary;
    };

    addNewState = (stateName: string) => {
        this.savedState.push(stateName);
    };

    updateRange = (newFilterRange: FilterType) => {
        Object.keys(newFilterRange).forEach((filterName) => {
            this.filterRange[filterName] = [Math.floor(newFilterRange[filterName][0]), Math.ceil(newFilterRange[filterName][1])];
        });
        // this.filterRange = newFilterRange;
    };

    // updateRange = (transfusedResult: any) => {
    //     BloodComponentStringArray.forEach((d) => {
    //         this.filterRange[d.key] = transfusedResult[d.key] > this.filterRange[d.key] ? transfusedResult[d.key] : this.filterRange[d.key];
    //     });
    // };


    // updateTestValue = (label: string, value: number) => {
    //     this.filterRange[label] = value > this.filterRange[label] ? value : this.filterRange[label];
    // };

    get provenance() {
        return this.rootStore.provenance;
    }

    set isLoggedIn(input: boolean) {
        this._isLoggedIn = input;
    }

    get isLoggedIn() {
        return this._isLoggedIn;
    }
    set dataLoading(input: boolean) {
        this._dataLoading = input;
    }

    get dataLoading() {
        return this._dataLoading;
    }
    set dataLoadingFailed(input: boolean) {
        this._dataLoadingFailed = input;
    }

    get dataLoadingFailed() {
        return this._dataLoadingFailed;
    }

    set topMenuBarAddMode(input: boolean) {
        this._topMenuBarAddMode = input;
    }

    get topMenuBarAddMode() {
        return this._topMenuBarAddMode;
    }


    changeSurgeryUrgencySelection(input: [boolean, boolean, boolean]) {
        this.provenance.apply(changeSurgeryUrgencySelection(input));
    }

    changeCostConfig(componentName: string, newCost: number) {
        this.provenance.apply(changeCostConfig(componentName, newCost));
    }
    changeOutcomeFilter(newOutcomeFilter: string[]) {
        this.provenance.apply(changeOutcomeFilter(newOutcomeFilter));
    }

    toggleShowZero(showZero: boolean) {
        this.provenance.apply(toggleShowZero(showZero));
    }
    dateRangeChange(dateRange: number[]) {
        this.provenance.apply(dateRangeChange(dateRange));
    }
    loadPreset(layoutInput: LayoutElement[]) {
        this.provenance.apply(loadPreset(layoutInput));
    }

    changeFilter(filterName: string, newRange: [number, number]) {
        this.provenance.apply(changeFilter(filterName, newRange));
    }

    resetSelectedFilter(filterNames: string[]) {
        this.provenance.apply(resetSelectedFilter(filterNames));
    }

    clearAllFilter() {
        this.provenance.apply(clearAllFilter());
    }
}