export const bloodComponentOutlierHandler = (input: number, yValueOption: string) => {
  let returnVal = input;
  if ((input > 100 && yValueOption === 'PRBC_UNITS')) {
    returnVal -= 999;
  }
  if ((input > 100 && yValueOption === 'PLT_UNITS')) {
    returnVal -= 245;
  }
  return returnVal;
};
