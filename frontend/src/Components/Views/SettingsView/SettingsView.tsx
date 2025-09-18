import { Accordion, Button, Divider, Flex, Stack, Title, Tooltip } from "@mantine/core";
import { useThemeConstants } from "../../../Theme/mantineTheme";
import { IconPlus } from "@tabler/icons-react";
import { useContext } from "react";
import { Store } from "../../../Store/Store";
import { BloodProductCostSettings } from "./BloodProductCostSettings";
import { GuidelineAdherenceSettings } from "./GuidelineAdherenceSettings";

export function SettingsView() {
  const { toolbarWidth, } = useThemeConstants();
  const store = useContext(Store);

  // Return settings options components
  return (
    <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        {/** Dashboard Title */}
        <Title order={3}>Settings</Title>
        </Flex>
        <Divider />
        <Accordion multiple defaultValue={['bloodProductCosts']} variant="contained" radius="md" >
          <BloodProductCostSettings />
          <GuidelineAdherenceSettings />
        </Accordion>
    </Stack>
  )
}
