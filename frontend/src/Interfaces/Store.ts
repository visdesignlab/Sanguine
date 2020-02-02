import { observable, computed } from 'mobx'
import {
  defaultState,
  LayoutElement
} from "./ApplicationState";

export default class Store {
  @observable isAtRoot: boolean = true;
  @observable isAtLatest: boolean = true;
  @observable currentSelectedChart: string = defaultState.currentSelected;
  @observable layoutArray: LayoutElement[] = defaultState.layoutArray;
  @observable perCaseSelected: boolean = defaultState.perCaseSelected;
  @observable yearRange: number[] = defaultState.yearRange;
  @observable filterSelection: string[] = defaultState.filterSelection;
}
    

export const store = new Store()