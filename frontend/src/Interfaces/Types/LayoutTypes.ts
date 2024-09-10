import { BloodProductCap } from '../../Presets/Constants';
import { AcronymDictionary } from '../../Presets/DataDict';

export type LayoutElement = {
    aggregatedBy: keyof typeof AcronymDictionary | '',
    valueToVisualize: 'PREOP_HEMO' | 'POSTOP_HEMO' | keyof typeof BloodProductCap | '',
    i: string,
    x: number,
    y: number,
    w: number,
    h: number,
    plotType: string,
    extraPair?: string,
    interventionDate?: number,
    outcomeComparison?: keyof typeof AcronymDictionary | '',
    notation: string;
}
