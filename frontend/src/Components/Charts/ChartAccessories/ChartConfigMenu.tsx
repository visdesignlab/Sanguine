import { useContext, useState, MouseEvent } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { NestedMenuItem } from 'mui-nested-menu';
import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import {
  AcronymDictionary, addOptions, OutcomeOptions, typeDiction,
} from '../../../Presets/DataDict';
import { BloodProductCap } from '../../../Presets/Constants';

type Props = {
    xAggregationOption: keyof typeof AcronymDictionary;
    yValueOption: keyof typeof BloodProductCap | '' | 'POSTOP_HEMO' | 'PREOP_HEMO';
    chartTypeIndexinArray: number;
    chartId: string;
    requireOutcome: boolean;
    requireSecondary: boolean;
};

function ChartConfigMenu({
  xAggregationOption, yValueOption, chartTypeIndexinArray, requireOutcome, chartId, requireSecondary,
}: Props) {
  const store = useContext(Store);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeXAxis = (value: keyof typeof AcronymDictionary) => {
    store.chartStore.changeChart(value, yValueOption, chartId, typeDiction[chartTypeIndexinArray], 'NONE');
    handleClose();
  };

  const changeYAxis = (value: keyof typeof BloodProductCap | '') => {
    store.chartStore.changeChart(xAggregationOption, value, chartId, typeDiction[chartTypeIndexinArray], 'NONE');
    handleClose();
  };

  const changeOutcome = (value: keyof typeof AcronymDictionary | 'NONE') => {
    store.chartStore.changeChart(xAggregationOption, yValueOption, chartId, 'HEATMAP', value);
    handleClose();
  };

  const OutcomeDropdownOptions = OutcomeOptions.concat({ key: 'NONE', value: 'None' });

  return (
    <>
      <Tooltip title="Update chart attributes">
        <IconButton size="small" onClick={handleClick}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <NestedMenuItem
          label="Change Aggregation"
          parentMenuOpen={open}
        >
          {addOptions[chartTypeIndexinArray][1].map((option) => (
            <MenuItem key={option.key} onClick={() => { changeXAxis(option.key as keyof typeof AcronymDictionary); }}>{option.value}</MenuItem>
          ))}
        </NestedMenuItem>
        {requireSecondary ? (
          <NestedMenuItem
            label="Change Value to Show"
            parentMenuOpen={open}
          >
            {addOptions[chartTypeIndexinArray][0].map((option) => (
              <MenuItem key={option.key} onClick={() => { changeYAxis(option.key as keyof typeof BloodProductCap); }}>{option.value}</MenuItem>
            ))}
            {chartTypeIndexinArray === 0 ? <MenuItem key="NONE" onClick={() => { changeYAxis(''); }}>None</MenuItem> : null}
          </NestedMenuItem>
        ) : []}
        {requireOutcome ? (
          <NestedMenuItem
            label="Change Outcome Comparison"
            parentMenuOpen={open}
          >
            {OutcomeDropdownOptions.map((option) => (
              <MenuItem key={option.key} onClick={() => { changeOutcome(option.key as keyof typeof AcronymDictionary | 'NONE'); }}>{option.value}</MenuItem>
            ))}
          </NestedMenuItem>
        ) : []}
      </Menu>
    </>
  );
}

export default observer(ChartConfigMenu);
