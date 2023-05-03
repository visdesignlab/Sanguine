import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import Store from "../../Interfaces/Store";
import { DataContext } from "../../App";
import EmailBarChart from "../Charts/EmailBarChart";


const EmailComponent: FC = () => {

  const store = useContext(Store);
  const allData = useContext(DataContext);

  const [currentSelectedProviderID, setCurrentSelectProvider] = useState('');
  const [providerType, setProviderType] = useState('');



  // rawDateRange: [new Date(2014, 0, 1).getTime(), today.getTime()],

  // useEffect(() => {
  //   // get provider names
  //   console.log(store.configStore.nameDictionary);

  // }, [store.configStore.nameDictionary]);



  return <div style={{ padding: '10px' }}>
    <div>
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Provider Type</InputLabel>
        <Select value={providerType} onChange={(e) => setProviderType(e.target.value)}>
          <MenuItem value={'SURGEON_ID'}>Surgeon</MenuItem>
          <MenuItem value={'ANESTHESIOLOGIST_ID'}>Anesthesiologist</MenuItem>
        </Select>
      </FormControl>
      {providerType ?
        <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Provider Name</InputLabel>
          <Select value={currentSelectedProviderID} onChange={(e) => setCurrentSelectProvider(e.target.value)}>
            {/* Menu option to select a provider */}
            {Object.keys(store.configStore.nameDictionary[providerType]).map((key: string) =>
              <MenuItem key={`email-dia-${key}`} value={key}>{store.configStore.nameDictionary[providerType][key]}</MenuItem>)
            }
          </Select>
        </FormControl> : <></>}
    </div>

    {/* Menu options for provider, time,  */}

    <div>
      {
        currentSelectedProviderID && providerType ? `Dear ${store.configStore.nameDictionary[providerType][currentSelectedProviderID]}`
          : 'Select provider to start'
      }
      <Grid spacing={2} container>

        <EmailBarChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
        <EmailBarChart attributeToVisualize="PREOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
        {/* <EmailBarChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
        <EmailBarChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} /> */}
      </Grid>

    </div>
  </div >;


};
export default observer(EmailComponent);
