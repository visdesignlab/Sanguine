import { Accordion, Box, Button, Card, Divider, Flex, LoadingOverlay, NumberInput } from "@mantine/core";
import { useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Store } from "../../../Store/Store";
import { getIconForVar } from "../../../Utils/icons";
import { useThemeConstants } from "../../../Theme/mantineTheme";

export function GuidelineAdherenceSettings() {
  const store = useContext(Store);

  const [loading, setLoading] = useState(false);
  

  const ControlIcon = getIconForVar('rbc_adherent' as any);
  const {cardIconStroke} = useThemeConstants();
  return (
    <Accordion.Item value="guidelineAdherenceSettings">
      <Accordion.Control icon={<ControlIcon size={16} />}disabled>Guideline Adherence Settings</Accordion.Control>
      <Accordion.Panel>
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Divider mb="sm" />
        <Box mx="auto" maw={1000}>
          hello
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
