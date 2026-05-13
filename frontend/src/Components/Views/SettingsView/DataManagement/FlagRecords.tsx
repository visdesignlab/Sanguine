import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Popover,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconFilter,
  IconFilterFilled,
  IconX,
} from '@tabler/icons-react';
import {
  useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Store } from '../../../../Store/Store';
import {
  FLAGS, type DisplayColumn, type FlagDefinition,
} from './flagDefinitions';

interface FlagRecordsProps {
  flagKey: string;
  /** Map of "record_type:record_id" → true (exclude) | false (re-include) */
  pendingChanges: Map<string, boolean>;
  /** Set of "record_type:record_id" strings currently excluded in backend */
  excludedKeys: Set<string>;
  onPendingChange: (key: string, excluded: boolean) => void;
}

type Row = Record<string, unknown>;
type SortDir = 'asc' | 'desc';

function getSortValue(row: Row, col: DisplayColumn): number | string {
  const raw = row[col.key];
  if (raw == null) return '';
  if (col.sortType === 'number' || col.sortType === 'date') return Number(raw);
  return String(raw).toLowerCase();
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (dir === 'asc') return <IconArrowUp size={11} />;
  if (dir === 'desc') return <IconArrowDown size={11} />;
  return <IconArrowsSort size={11} style={{ opacity: 0.3 }} />;
}

export function FlagRecords({
  flagKey,
  pendingChanges,
  excludedKeys,
  onPendingChange,
}: FlagRecordsProps) {
  const store = useContext(Store);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const flag = FLAGS.find((f) => f.key === flagKey) as FlagDefinition;

  // Reset sort + filters when flag changes
  useEffect(() => {
    setSortKey(null);
    setSortDir('asc');
    setFilters({});
  }, [flagKey]);

  const load = useCallback(async () => {
    if (!store.duckDB || !flag) return;
    setLoading(true);
    try {
      const cols = flag.displayColumns.map((c) => c.key).join(', ');
      const result = await store.duckDB.query(
        `SELECT ${cols} FROM ${flag.source} WHERE ${flag.whereClause} ORDER BY 1 LIMIT 1000`,
      );
      setRows(result.toArray().map((r) => r.toJSON() as Row));
    } catch (e) {
      console.error('FlagRecords query error', e);
    } finally {
      setLoading(false);
    }
  }, [store.duckDB, flag]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingKey = (row: Row) => `${flag.recordType}:${String(row[flag.idField])}`;

  const isEffectivelyExcluded = (row: Row) => {
    const key = pendingKey(row);
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    return excludedKeys.has(key);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const setFilter = (colKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [colKey]: value }));
  };

  // Sorted + filtered rows (never mutates `rows`)
  const displayedRows = useMemo(() => {
    let result = [...rows];

    // Filter: match against the formatted display string
    Object.entries(filters).forEach(([colKey, filterVal]) => {
      if (!filterVal.trim()) return;
      const col = flag.displayColumns.find((c) => c.key === colKey);
      const lower = filterVal.toLowerCase();
      result = result.filter((row) => {
        const display = col?.format ? col.format(row[colKey]) : String(row[colKey] ?? '');
        return display.toLowerCase().includes(lower);
      });
    });

    // Sort
    if (sortKey) {
      const col = flag.displayColumns.find((c) => c.key === sortKey);
      if (col) {
        result.sort((a, b) => {
          const av = getSortValue(a, col);
          const bv = getSortValue(b, col);
          if (av === '' && bv === '') return 0;
          if (av === '') return 1;
          if (bv === '') return -1;
          const cmp = typeof av === 'number'
            ? av - (bv as number)
            : (av as string).localeCompare(bv as string);
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [rows, filters, sortKey, sortDir, flag]);

  const selectAll = () => {
    displayedRows.forEach((row) => {
      if (!isEffectivelyExcluded(row)) {
        onPendingChange(pendingKey(row), true);
      }
    });
  };

  const deselectAll = () => {
    displayedRows.forEach((row) => {
      if (isEffectivelyExcluded(row)) {
        onPendingChange(pendingKey(row), false);
      }
    });
  };

  const pendingExcludeCount = displayedRows.filter((r) => {
    const key = pendingKey(r);
    return pendingChanges.has(key) && pendingChanges.get(key) === true && !excludedKeys.has(key);
  }).length;

  const pendingIncludeCount = displayedRows.filter((r) => {
    const key = pendingKey(r);
    return pendingChanges.has(key) && pendingChanges.get(key) === false && excludedKeys.has(key);
  }).length;

  const hasFilters = Object.values(filters).some((v) => v.trim() !== '');

  if (!flag) return null;

  return (
    <Stack gap="sm" h="100%">
      {/* Flag header + bulk actions inline */}
      <Box>
        <Text fw={600} size="sm" mb={4}>{flag.label}</Text>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>{flag.rationale}</Text>
          <Group gap="xs" style={{ flexShrink: 0 }}>
            <Button size="xs" variant="light" onClick={selectAll}>Exclude All</Button>
            {(pendingExcludeCount > 0 || pendingIncludeCount > 0) && (
              <Button size="xs" variant="subtle" color="gray" onClick={deselectAll}>Reset All</Button>
            )}
            {hasFilters && (
              <Button size="xs" variant="subtle" color="orange" onClick={() => setFilters({})}>
                Clear Filters
              </Button>
            )}
            <Text size="xs" c="dimmed" style={{ alignSelf: 'center' }}>
              {!loading && (
                displayedRows.length < rows.length
                  ? `${displayedRows.length} of ${rows.length} records`
                  : `${rows.length} records`
              )}
            </Text>
          </Group>
        </Group>
      </Box>

      {/* Pending summary */}
      {(pendingExcludeCount > 0 || pendingIncludeCount > 0) && (
        <Alert color="yellow" variant="light" p="xs">
          <Text size="xs">
            {pendingExcludeCount > 0 && `${pendingExcludeCount} will be excluded`}
            {pendingExcludeCount > 0 && pendingIncludeCount > 0 && ' · '}
            {pendingIncludeCount > 0 && `${pendingIncludeCount} will be re-included`}
            {' — click Save to apply'}
          </Text>
        </Alert>
      )}

      {/* Records table */}
      {loading ? (
        <Group justify="center" mt="xl">
          <Loader size="sm" />
        </Group>
      ) : (
        <ScrollArea style={{ flex: 1 }}>
          <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs">
            <Table.Thead>
              {/* Sort + filter header row */}
              <Table.Tr>
                <Table.Th w={40} />
                {flag.displayColumns.map((col) => {
                  const activeDir = sortKey === col.key ? sortDir : null;
                  const hasFilter = Boolean(filters[col.key]?.trim());
                  return (
                    <Table.Th key={col.key} style={{ whiteSpace: 'nowrap' }}>
                      <Group gap={2} wrap="nowrap">
                        <UnstyledButton
                          onClick={() => handleSort(col.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            flex: 1,
                            cursor: 'pointer',
                          }}
                        >
                          <Text size="xs" fw={700} style={{ flex: 1 }}>{col.label}</Text>
                          <SortIcon dir={activeDir} />
                        </UnstyledButton>
                        <Popover
                          position="bottom-end"
                          withArrow
                          shadow="sm"
                          closeOnClickOutside
                        >
                          <Popover.Target>
                            <ActionIcon
                              size={16}
                              variant="transparent"
                              color={hasFilter ? 'red' : 'gray'}
                              style={{ opacity: hasFilter ? 1 : 0.4, flexShrink: 0 }}
                            >
                              {hasFilter ? <IconFilterFilled size={11} /> : <IconFilter size={11} />}
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown p={8}>
                            <TextInput
                              size="xs"
                              placeholder={`Filter ${col.label}…`}
                              value={filters[col.key] ?? ''}
                              onChange={(e) => setFilter(col.key, e.currentTarget.value)}
                              autoFocus
                              styles={{ input: { fontSize: 12, width: 160 } }}
                              rightSection={
                                filters[col.key] ? (
                                  <ActionIcon
                                    size={14}
                                    variant="transparent"
                                    onClick={() => setFilter(col.key, '')}
                                    tabIndex={-1}
                                  >
                                    <IconX size={10} />
                                  </ActionIcon>
                                ) : null
                              }
                              rightSectionWidth={filters[col.key] ? 20 : 0}
                            />
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {displayedRows.map((row) => {
                const key = pendingKey(row);
                const excluded = isEffectivelyExcluded(row);
                return (
                  <Table.Tr key={key} style={{ opacity: excluded ? 0.5 : 1 }}>
                    <Table.Td>
                      {excluded ? (
                        <Tooltip label="Re-include this record">
                          <ActionIcon
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={() => onPendingChange(key, false)}
                          >
                            <IconX size={10} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Checkbox
                          size="xs"
                          checked={false}
                          onChange={() => onPendingChange(key, true)}
                        />
                      )}
                    </Table.Td>
                    {flag.displayColumns.map((col) => (
                      <Table.Td
                        key={col.key}
                        style={col.isOutlierValue?.(row[col.key], row) ? { backgroundColor: 'var(--mantine-color-red-0)' } : undefined}
                      >
                        {col.format ? col.format(row[col.key]) : String(row[col.key] ?? '—')}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                );
              })}
              {displayedRows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={flag.displayColumns.length + 1}>
                    <Text size="xs" c="dimmed" ta="center" py="sm">No matching records</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  );
}
