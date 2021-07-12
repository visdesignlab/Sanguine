import { changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, dateRangeChange, loadPreset, toggleShowZero } from "./Actions/ProjectConfigActions";
import { RootStore } from "./Store";
import { LayoutElement } from "./Types/LayoutTypes";

export class ProjectConfigStore {
    rootStore: RootStore;
    private _isLoggedIn: boolean;
    private _dataLoading: boolean;
    private _dataLoadingFailed: boolean;

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
        this._isLoggedIn = false;
        this._dataLoading = true;
        this._dataLoadingFailed = false;
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