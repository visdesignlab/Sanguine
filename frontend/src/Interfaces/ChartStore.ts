import { makeAutoObservable } from 'mobx';
import {
  addExtraPair, addNewChart, changeChart, changeNotation, clearAllCharts, onLayoutChange, removeChart, removeExtraPair,
} from './Actions/ChartActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { LayoutElement, xAxisOption, yAxisOption } from './Types/LayoutTypes';
import { ChartType, Outcome } from '../Presets/DataDict';

export class ChartStore {
  rootStore: RootStore;

  private _totalAggregatedCaseCount: number;

  private _totalIndividualCaseCount: number;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    this._totalAggregatedCaseCount = 0;
    this._totalIndividualCaseCount = 0;
    makeAutoObservable(this);
  }

  get provenance() {
    return this.rootStore.provenance;
  }

  get totalIndividualCaseCount() {
    return this._totalIndividualCaseCount;
  }

  set totalIndividualCaseCount(input: number) {
    this._totalIndividualCaseCount = input;
  }

  get totalAggregatedCaseCount() {
    return this._totalAggregatedCaseCount;
  }

  set totalAggregatedCaseCount(input: number) {
    this._totalAggregatedCaseCount = input;
  }

  addExtraPair(chartID: string, newExtraPair: string) {
    this.provenance.apply(addExtraPair(chartID, newExtraPair));
  }

  removeExtraPair(chartID: string, removingPairName: string) {
    this.provenance.apply(removeExtraPair(chartID, removingPairName));
  }

  removeChart(chartID: string) {
    this.provenance.apply(removeChart(chartID));
    if (this.rootStore.provenanceState.layoutArray.length === 0) {
      this.totalAggregatedCaseCount = 0;
      this.totalIndividualCaseCount = 0;
    }
  }

  changeNotation(chartID: string, newNotation: string) {
    this.provenance.apply(changeNotation(chartID, newNotation));
  }

  addNewChart(newLayoutElement: LayoutElement) {
    this.provenance.apply(addNewChart(newLayoutElement));
  }

  changeChart(xAxisSelection: xAxisOption, yAxisSelection: yAxisOption, chartIndex: string, chartType: ChartType, outcomeComparison: Outcome | 'NONE') {
    this.provenance.apply(changeChart(xAxisSelection, yAxisSelection, chartIndex, chartType, outcomeComparison));
  }

  onLayoutChange(gridLayout: ReactGridLayout.Layout[]) {
    this.provenance.apply(onLayoutChange(gridLayout));
  }

  clearAllCharts() {
    this.provenance.apply(clearAllCharts());
  }
}
