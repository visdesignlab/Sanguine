import {
  Accordion,
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Text,
} from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import {
  useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Store } from '../../../../Store/Store';
import { FLAGS, type RecordType } from './flagDefinitions';
import { FlagList } from './FlagList';
import { FlagRecords } from './FlagRecords';
import { apiPath } from '../../../../Utils/api';

export function DataManagementView() {
  const store = useContext(Store);

  const [selectedFlagKey, setSelectedFlagKey] = useState<string>(FLAGS[0].key);
  const [userHasSelected, setUserHasSelected] = useState(false);
  const [flagCounts, setFlagCounts] = useState<Record<string, number>>({});
  // Map of "record_type:record_id" → true (exclude) | false (re-include)
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  // Set of excluded keys currently confirmed in the backend
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load flag counts and current exclusion state on open
  const loadCounts = useCallback(async () => {
    if (!store.duckDB) return;
    const counts: Record<string, number> = {};
    await Promise.all(FLAGS.map(async (flag) => {
      try {
        const res = await store.duckDB!.query(
          `SELECT COUNT(*) AS n FROM ${flag.source} WHERE ${flag.whereClause}`,
        );
        counts[flag.key] = Number(res.toArray()[0].toJSON().n);
      } catch {
        counts[flag.key] = 0;
      }
    }));
    setFlagCounts(counts);

    // Auto-select the first flag with outliers, but only if the user hasn't
    // manually chosen one yet.
    if (!userHasSelected) {
      const firstWithIssues = FLAGS.find((f) => (counts[f.key] ?? 0) > 0);
      if (firstWithIssues) {
        setSelectedFlagKey(firstWithIssues.key);
      }
    }
  }, [store.duckDB, userHasSelected]);

  const loadExcludedKeys = useCallback(async () => {
    try {
      const res = await fetch(apiPath('exclusions'));
      if (!res.ok) return;
      const data = await res.json() as { visits: number[], surgery_cases: number[] };
      const keys = new Set<string>([
        ...data.visits.map((id) => `visit:${id}`),
        ...data.surgery_cases.map((id) => `surgery_case:${id}`),
      ]);
      setExcludedKeys(keys);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadCounts();
    loadExcludedKeys();
  }, [loadCounts, loadExcludedKeys]);

  const handlePendingChange = useCallback((key: string, shouldExclude: boolean) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const currentlyExcluded = excludedKeys.has(key);
      // If this change just restores the backend state, remove from pending
      if (shouldExclude === currentlyExcluded) {
        next.delete(key);
      } else {
        next.set(key, shouldExclude);
      }
      return next;
    });
  }, [excludedKeys]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const toAdd: { record_type: RecordType; record_id: string; flag_key: string }[] = [];
      const toRemove: { record_type: RecordType; record_id: string }[] = [];

      pendingChanges.forEach((shouldExclude, key) => {
        const colonIdx = key.indexOf(':');
        const recordType = key.slice(0, colonIdx) as RecordType;
        const recordId = key.slice(colonIdx + 1);
        const flag = FLAGS.find((f) => f.recordType === recordType) ?? FLAGS[0];
        // Find the flag that matches the selected flag key for attribution
        const activeFlag = FLAGS.find((f) => f.key === selectedFlagKey) ?? flag;
        if (shouldExclude) {
          toAdd.push({ record_type: recordType, record_id: recordId, flag_key: activeFlag.key });
        } else {
          toRemove.push({ record_type: recordType, record_id: recordId });
        }
      });

      await store.saveExclusions(toAdd, toRemove);
      await loadExcludedKeys();
      setPendingChanges(new Map());
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, selectedFlagKey, store, loadExcludedKeys]);

  const totalExcluded = useMemo(() => excludedKeys.size, [excludedKeys]);

  return (
    <Accordion.Item value="dataManagement">
      <Accordion.Control icon={<IconDatabase size={16} />}>
        Data Management
      </Accordion.Control>
      <Accordion.Panel>
        <Divider mb="sm" />
        <Text size="sm" c="dimmed" mb="md">
          <Text span size="sm" fw={600} c="dark">Flagged Records: </Text>
          Review flagged records and exclude those that should not influence charts or metrics.
          Excluding records from calculations does not delete source data.
        </Text>

        <Paper withBorder style={{ display: 'flex', height: 520, overflow: 'hidden' }}>
          {/* Left: flag list */}
          <Box w={260} style={(theme) => ({ borderRight: `1px solid ${theme.colors.gray[2]}` })}>
            <FlagList
              selectedFlagKey={selectedFlagKey}
              flagCounts={flagCounts}
              totalExcluded={totalExcluded}
              onSelectFlag={(key) => {
                setUserHasSelected(true);
                setSelectedFlagKey(key);
              }}
            />
          </Box>

          {/* Right: flag records */}
          <Box style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
            <FlagRecords
              flagKey={selectedFlagKey}
              pendingChanges={pendingChanges}
              excludedKeys={excludedKeys}
              onPendingChange={handlePendingChange}
            />
          </Box>
        </Paper>

        {/* Save bar */}
        <Box mt="md">
          {saveError && (
            <Alert color="red" mb="sm" variant="light">
              {saveError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              disabled={pendingChanges.size === 0}
              loading={saving}
              onClick={handleSave}
            >
              {pendingChanges.size > 0 ? `Save Changes (${pendingChanges.size})` : 'Save Changes'}
            </Button>
          </Group>
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
