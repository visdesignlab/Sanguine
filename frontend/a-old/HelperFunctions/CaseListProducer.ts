export const bloodComponentOutlierHandler = (input: number, yAxisVar: string) => {
  let returnVal = input;
  if ((input > 100 && yAxisVar === 'rbc_units')) {
    returnVal -= 999;
  }
  if ((input > 100 && yAxisVar === 'plt_units')) {
    returnVal -= 245;
  }
  return returnVal;
};
