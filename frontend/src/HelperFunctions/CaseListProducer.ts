
export const bloodComponentOutlierHandler = (input: number, yValueOption: string) => {
    if ((input > 100 && yValueOption === "PRBC_UNITS")) {
        input -= 999;
    }
    if ((input > 100 && yValueOption === "PLT_UNITS")) {
        input -= 245;
    }
    return input;
};