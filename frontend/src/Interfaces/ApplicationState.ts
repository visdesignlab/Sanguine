export interface SelectSet {
  set_name: string;
  set_value: number;
}

export interface ApplicationState {
  layoutArray: LayoutElement[];
  currentSelected: string;
}
export interface LayoutElement{
  x_axis_name: string,
  y_axis_name: string,
  year_range: number[],
  filter_selection: string[]
  i: string,
  x: number,
  y: number,
  w: number,
  h: number,
  plot_type: string
}

export const defaultState: ApplicationState = {
    layoutArray: [],
    currentSelected: "-1"
};