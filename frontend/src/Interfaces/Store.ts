import { observable, computed } from 'mobx'
import {
  defaultState,
  LayoutElement
} from "./ApplicationState";

export default class Store {
  @observable isAtRoot: boolean = true;
  @observable isAtLatest: boolean = true;
  @observable currentSelectedChart: string = defaultState.currentSelectedChart;
  @observable layoutArray: LayoutElement[] = defaultState.layoutArray;
  @observable perCaseSelected: boolean = defaultState.perCaseSelected;
  @observable yearRange: number[] = defaultState.yearRange;
  @observable filterSelection: string[] = defaultState.filterSelection;
  @computed get actualYearRange() {
    return [this.yearRange[0]+2014,this.yearRange[1]+2014]
  }
}
    

export const store = new Store()