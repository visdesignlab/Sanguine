import { observable, computed } from 'mobx'
import {
  defaultState,
  LayoutElement,
  SelectSet,
  DumbbellDataPoint
} from "./ApplicationState";

export default class Store {
  @observable isAtRoot: boolean = true;
  @observable isAtLatest: boolean = true;
  @observable currentSelectedChart: string = defaultState.currentSelectedChart;
  @observable layoutArray: LayoutElement[] = defaultState.layoutArray;
  // @observable perCaseSelected: boolean = defaultState.perCaseSelected;
  @observable yearRange: number[] = defaultState.yearRange;
  @observable filterSelection: string[] = defaultState.filterSelection;
  @observable totalCaseCount: number = defaultState.totalCaseCount;
  // @observable dumbbellSorted: boolean = defaultState.dumbbellSorted;
  @observable currentSelectSet: SelectSet | null = defaultState.currentSelectSet;
  @observable currentSelectPatient: DumbbellDataPoint|null = defaultState.currentSelectPatient;
  @computed get actualYearRange() {
    return [this.yearRange[0]+2014,this.yearRange[1]+2014]
  }
  @observable hemoglobinDataSet:any = defaultState.hemoglobinDataSet
}
    

export const store = new Store()