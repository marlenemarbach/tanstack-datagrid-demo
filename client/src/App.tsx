import { useCallback, useDeferredValue, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { patchOrder, queryOrders, type Order } from "./api/orders";
import { gridSx } from "./App.styles";
import { groupableColumns, orderColumns } from "./columns";
import { DataGrid } from "./grid/DataGrid";
import { AppSettings } from "./AppSettings";
import { GroupByField } from "./GroupByField";
import { TableViewActions } from "./TableViewActions";
import { ThemeToggle } from "./ThemeToggle";
import { viewFromParams } from "./savedView";
import { setUrlParams, useUrlSearch } from "./urlState";
import {
  parseColumnOrder,
  parseFilters,
  parseGroup,
  parseSort,
  parseZoom,
  rowHeights,
  serializeColumnOrder,
  serializeFilters,
  serializeGroup,
  serializeSort,
} from "./queryParams";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const ordersKey = ["orders"] as const;
const getOrderId = (order: Order) => order.order_id;

// Query settings live in the URL, so a view is linkable and survives reloads.
const onGroupingChange = (ids: Array<string>) =>
  setUrlParams({ group: serializeGroup(ids) });
const onSortingChange = (s: SortingState) =>
  setUrlParams({ sort: serializeSort(s) });
const onColumnOrderChange = (order: Array<string>) =>
  setUrlParams({ cols: serializeColumnOrder(order) });
const onColumnFiltersChange = (f: ColumnFiltersState) =>
  setUrlParams({ filters: serializeFilters(f) });

export function App() {
  const search = useUrlSearch();
  const params = new URLSearchParams(search);
  // Memoised on the raw param so the memoised grid sees stable props.
  const groupRaw = params.get("group");
  const sortRaw = params.get("sort");
  const filtersRaw = params.get("filters");
  const colsRaw = params.get("cols");
  const groupIdsNow = useMemo(
    () => serializeGroup(parseGroup(groupRaw)),
    [groupRaw],
  );
  const grouping = useMemo(
    () =>
      groupIdsNow
        ? groupIdsNow
            .split(",")
            .map((id) => groupableColumns.find((c) => c.id === id)!)
        : [],
    [groupIdsNow],
  );
  const sorting = useMemo(() => parseSort(sortRaw), [sortRaw]);
  const columnFilters = useMemo(() => parseFilters(filtersRaw), [filtersRaw]);
  const columnOrder = useMemo(() => parseColumnOrder(colsRaw), [colsRaw]);
  const rowHeight = rowHeights[parseZoom(params.get("zoom"))];
  const [editMode, setEditMode] = useState(false);
  const [columnBorders, setColumnBorders] = useState(false);
  const [stripedRows, setStripedRows] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onGridError = useCallback((e: Error) => setError(e.message), []);
  const groupIds = useDeferredValue(groupIdsNow);
  // Memoised so the grid only re-renders when the view actually changes.
  const viewActions = useMemo(
    () => (
      <TableViewActions view={viewFromParams(new URLSearchParams(search))} />
    ),
    [search],
  );

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        boxSizing: "border-box",
        bgcolor: "background.default",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          alignItems: { md: "center" },
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" sx={{ flex: "none" }}>
          Orders
        </Typography>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ThemeToggle />
          <AppSettings>
            <FormControlLabel
              control={
                <Switch
                  checked={columnBorders}
                  onChange={(e) => setColumnBorders(e.target.checked)}
                  size="small"
                />
              }
              label="Column borders"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={stripedRows}
                  onChange={(e) => setStripedRows(e.target.checked)}
                  size="small"
                />
              }
              label="Striped rows"
            />
          </AppSettings>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <GroupByField value={grouping} onChange={onGroupingChange} />
        <FormControlLabel
          control={
            <Switch
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
            />
          }
          label="Edit mode"
        />
      </Stack>

      <DataGrid
        queryKey={ordersKey}
        columns={orderColumns}
        // pinnedColumns={pinnedColumns}
        fetchPage={queryOrders}
        updateRecord={patchOrder}
        getRecordId={getOrderId}
        grouping={useGroupingArray(groupIds)}
        sorting={sorting}
        onSortingChange={onSortingChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        columnOrder={columnOrder}
        onColumnOrderChange={onColumnOrderChange}
        editMode={editMode}
        rowHeight={rowHeight}
        columnBorders={columnBorders}
        stripedRows={stripedRows}
        statusBarActions={viewActions}
        onError={onGridError}
        sx={gridSx}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** Stable array identity for the grid's `grouping` prop. */
const groupingCache = new Map<string, Array<string>>();
function useGroupingArray(ids: string) {
  let arr = groupingCache.get(ids);
  if (!arr) groupingCache.set(ids, (arr = ids ? ids.split(",") : []));
  return arr;
}
