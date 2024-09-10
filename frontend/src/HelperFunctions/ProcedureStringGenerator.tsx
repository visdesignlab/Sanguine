import { ProcedureEntry } from '../Interfaces/Types/DataTypes';

export const ProcedureStringGenerator = (procedureList: ProcedureEntry[]) => {
  if (procedureList.length === 0) {
    return '';
  }

  return procedureList.map((procedure) => {
    if (procedure.overlapList && procedure.overlapList.length > 0) {
      const subStringArray = procedure.overlapList.map((subProcedure) => `(${procedure.procedureName}%20AND%20${subProcedure.procedureName})`);
      return subStringArray.join('%20OR%20');
    }
    return `(${procedure.procedureName})`;
  }).join('%20OR%20');
};
