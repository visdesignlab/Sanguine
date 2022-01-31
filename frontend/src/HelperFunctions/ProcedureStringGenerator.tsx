import { ProcedureEntry } from "../Interfaces/Types/DataTypes";

export const ProcedureStringGenerator = (procedureList: ProcedureEntry[]) => {

    return procedureList.map((procedure) => {
        if (procedure.overlapList && procedure.overlapList.length > 0) {
            const subStringArray = procedure.overlapList.map((subProcedure) => {
                return `(${procedure.procedureName}%20AND%20${subProcedure.procedureName})`;
            });
            return subStringArray.join('%20OR%20');
        } else {
            return `(${procedure.procedureName})`;
        }
    }).join('%20OR%20');
};
