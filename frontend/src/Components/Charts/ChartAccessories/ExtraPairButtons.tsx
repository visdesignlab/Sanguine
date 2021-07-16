import { useContext } from "react";
import { useEffect } from "react";
import { FC, useState } from "react";
import { Menu, Dropdown } from "semantic-ui-react";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { ExtraPairOptions } from "../../../Presets/DataDict";


type Props = {
    extraPairArrayString: string;
    chartId: string;
}
const ExtraPairButtons: FC<Props> = ({ extraPairArrayString, chartId }: Props) => {
    const store = useContext(Store)
    const [extraPairArray, setExtraPairArray] = useState<string[]>([])

    useEffect(() => {
        if (extraPairArrayString) {
            stateUpdateWrapperUseJSON(extraPairArray, JSON.parse(extraPairArrayString), setExtraPairArray)
        }
    }, [extraPairArray])

    return (
        <Menu.Item fitted>
            <Dropdown disabled={extraPairArray.length >= 5} selectOnBlur={false} basic item icon="plus" compact>
                <Dropdown.Menu>
                    {
                        ExtraPairOptions.map((d) => {
                            return (
                                <Dropdown.Item
                                    key={d.key}
                                    onClick={() => {
                                        store.chartStore.addExtraPair(chartId, d.value);
                                    }}
                                >
                                    {d.text}
                                </Dropdown.Item>
                            )
                        })
                    }
                </Dropdown.Menu>
            </Dropdown>
        </Menu.Item >)
}

export default ExtraPairButtons