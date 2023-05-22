import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useEffect, useState } from "react";
import Store from "../../../Interfaces/Store";
import { DataContext } from "../../../App";
import EmailDotChart from "./EmailDotChart";
import EmailText from "./EmailText";
import { WelcomeText } from "../../../Presets/StyledComponents";

export const LAST_QUARTER = [convertDateToUnixTimestamp('01-Jan-2015'), convertDateToUnixTimestamp('31-Mar-2015')];
export const CURRENT_QUARTER = [convertDateToUnixTimestamp('01-Apr-2015'), convertDateToUnixTimestamp('30-Jun-2015')];


function convertDateToUnixTimestamp(dateString: string): number {
  // Parse the date string into a Date object
  const date = new Date(dateString);

  // Get the Unix timestamp in milliseconds by calling the getTime() method
  const unixTimestamp = date.getTime();

  // Convert the timestamp to seconds by dividing by 1000 and rounding down

  // Return the Unix timestamp in seconds
  return unixTimestamp;
}

function convertUnixToMMDDYYYY(unixTimestamp: number) {
  // Create a new Date object with the Unix timestamp
  const date = new Date(unixTimestamp);

  // Extract the components of the date
  const month = date.getMonth() + 1; // Months are zero-based
  const day = date.getDate();
  const year = date.getFullYear();

  // Format the components into MM/DD/YYYY
  const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;

  return formattedDate;
}


const EmailComponent: FC = () => {

  const store = useContext(Store);

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
      <p>
        {
          currentSelectedProviderID && providerType ? `Dear ${store.configStore.nameDictionary[providerType][currentSelectedProviderID]}`
            :
            <WelcomeText show={false}>Select provider to start</WelcomeText>
        }
      </p>
      {currentSelectedProviderID ?
        <>
          From {convertUnixToMMDDYYYY(CURRENT_QUARTER[0])} to {convertUnixToMMDDYYYY(CURRENT_QUARTER[1])},
          <EmailText
            currentSelectedProviderID={currentSelectedProviderID}
            providerType={providerType} />
          <Grid spacing={2} container>
            <EmailDotChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
            <EmailDotChart attributeToVisualize="PREOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
          </Grid>
        </>
        : <></>}

      {/* <EmailBarChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} />
        <EmailBarChart attributeToVisualize="POSTOP_HGB" currentSelectedProviderID={currentSelectedProviderID} providerType={providerType} /> */}


    </div>
  </div >;


};
export default observer(EmailComponent);
