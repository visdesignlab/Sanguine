import { AcronymDictionary } from '../../Presets/DataDict';

export type SelectSet = {
    setName: keyof typeof AcronymDictionary;
    setValues: string[];
}
