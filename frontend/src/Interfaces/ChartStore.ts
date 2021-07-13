import { makeAutoObservable } from "mobx";
import { addExtraPair, addNewChart, changeNotation, onLayoutChange, removeChart, removeExtraPair } from "./Actions/ChartActions";
import { RootStore } from "./Store";
import { LayoutElement } from "./Types/LayoutTypes";

export class ChartStore {
    rootStore: RootStore;
    private _totalAggregatedCaseCount: number;
    private _totalIndividualCaseCount: number;

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
        makeAutoObservable(this)
        this._totalAggregatedCaseCount = 0;
        this._totalIndividualCaseCount = 0;
    }
    get provenance() {
        return this.rootStore.provenance
    }
    get totalIndividualCaseCount() {
        return this._totalIndividualCaseCount
    }

    get totalAggregatedCaseCount() {
        return this._totalAggregatedCaseCount
    }

    set totalIndividualCaseCount(input: number) {
        this._totalIndividualCaseCount = input
    }

    set totalAggregatedCaseCount(input: number) {
        this._totalAggregatedCaseCount = input
    }

    addExtraPair(chartID: string, newExtraPair: string) {
        this.provenance.apply(addExtraPair(chartID, newExtraPair))
    }

    removeExtraPair(chartID: string, removingPairName: string) {
        this.provenance.apply(removeExtraPair(chartID, removingPairName))
    }

    removeChart(chartID: string) {
        this.provenance.apply(removeChart(chartID));
        if (this.rootStore.state.layoutArray.length === 0) {
            this.totalAggregatedCaseCount = 0
            this.totalIndividualCaseCount = 0
        }
    }

    changeNotation(chartID: string, newNotation: string) {
        this.provenance.apply(changeNotation(chartID, newNotation))
    }

    addNewChart(newLayoutElement: LayoutElement) {
        this.rootStore.configStore.chartAdded();
        this.provenance.apply(addNewChart(newLayoutElement));
    }

    //TODO check this type
    onLayoutChange(gridLayout: ReactGridLayout.Layout[]) {
        this.provenance.apply(onLayoutChange(gridLayout))
    }
}