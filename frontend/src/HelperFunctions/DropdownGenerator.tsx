
import MenuItem from "@material-ui/core/MenuItem"
import { DropdownInputTypes } from "../Interfaces/Types/DropdownInputType"

export const DropdownGenerator = (input: DropdownInputTypes[], withNone?: boolean) => {

    let output = input.map((d) => {
        return <MenuItem value={d.value}> {d.text} </MenuItem>
    })
    if (withNone) {
        output = [(<MenuItem value="">
            <em>None</em>
        </MenuItem>)].concat(output)
    }
    return output
}