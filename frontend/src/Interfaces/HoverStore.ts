import { makeAutoObservable } from 'mobx';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';

export class HoverStore {
  rootStore: RootStore;

  // Currently hovered case IDs
  private _hoveredCaseIds: number[];

  // Color of the smaller mark hover
  public readonly smallHoverColor: string;

  // Color of a larger background hover
  public readonly backgroundHoverColor: string;

  // Extends the root store
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Currently hovered case IDs
    this._hoveredCaseIds = [];

    // Color of the hover
    this.smallHoverColor = '#FFCF76';

    // Color of the hover
    this.backgroundHoverColor = '#FFE8BE';

    // Make the store observable
    makeAutoObservable(this);
  }

  get hoveredCaseIds() {
    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }
}
