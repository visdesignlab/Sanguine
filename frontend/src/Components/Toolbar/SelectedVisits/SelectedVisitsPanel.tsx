import { useContext, useEffect, useState } from "react";
import { useObserver } from "mobx-react-lite";
import { Store } from "../../../Store/Store";
import { Divider, NavLink, ScrollArea, Space, Stack, Text, Title } from "@mantine/core";
import { useThemeConstants } from "../../../Theme/mantineTheme";
import { makeHumanReadableColumn, makeHumanReadableValues } from "../../../Utils/humanReadableColsVals";

// ...existing code...
export function SelectedVisitsPanel() {
  const { toolbarWidth } = useThemeConstants();
  const store = useContext(Store);

  // Optional: load data on mount
  useEffect(() => {
    store.selectionsStore.updateSelectedVisits();
  }, []);

  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  return useObserver(() => (
    <Stack>
      <ScrollArea h={250}>
        {store.selectionsStore.selectedVisits.map((visit) => (
          <NavLink label={visit.visit_no} key={visit.visit_no} onClick={() => setSelectedVisit(visit)} active={selectedVisit?.visit_no === visit.visit_no} />  
        ))}
      </ScrollArea>
      <Divider/>
      <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px - 250px - 30px)`}>
        {selectedVisit && (
          <Stack p="sm">
          {Object.entries(selectedVisit).map(([key, value]) => (
            <Stack key={key} gap={0}>
              <Title order={6}>{makeHumanReadableColumn(key)}</Title>
              <Text>{makeHumanReadableValues(key as keyof typeof makeHumanReadableColumn, value)}</Text>
            </Stack>
          ))}
          <Space h={15} />
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  ));
}