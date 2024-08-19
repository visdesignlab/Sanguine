// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stateUpdateWrapperUseJSON = (oldState: any, newState: any, updateFunction: (value: React.SetStateAction<any>) => void) => {
  if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
    updateFunction(newState);
  }
};
