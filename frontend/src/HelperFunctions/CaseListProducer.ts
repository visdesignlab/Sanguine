export const bloodComponentOutlierHandler = (input: number, yAxisVar: string) => {
  let returnVal = input;
  if ((input > 100 && yAxisVar === 'PRBC_UNITS')) {
    returnVal -= 999;
  }
  if ((input > 100 && yAxisVar === 'PLT_UNITS')) {
    returnVal -= 245;
  }
  return returnVal;
};
