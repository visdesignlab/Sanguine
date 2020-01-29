import { observable, computed } from 'mobx'
import {
  defaultState,
  LayoutElement,
  ApplicationState
} from "./ApplicationState";

export default class Store {
    @observable isAtRoot: boolean = true;
    @observable isAtLatest: boolean = true;
    @observable currentSelectedChart: string = defaultState.currentSelected;
    @observable layoutArray: LayoutElement[] = defaultState.layoutArray;
    
}
    

export const store = new Store()