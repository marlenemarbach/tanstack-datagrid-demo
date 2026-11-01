import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { Column } from "@tanstack/react-table";
import type { FilterValue, QueryItem } from "../api/orders";
import type { Features } from "./features";

type AnyColumn = Column<Features, QueryItem<unknown>, unknown>;

export interface FilterTarget {
  column: AnyColumn;
  anchor: HTMLElement;
}

/**
 * One popover instance for the whole grid, positioned over the header cell.
 * The edited value is TanStack column-filter state; it already has the shape
 * of an API filter (minus `field`).
 */
export function FilterPopover({
  target,
  onClose,
}: {
  target: FilterTarget | null;
  onClose: () => void;
}) {
  return (
    <Popover
      open={!!target}
      anchorEl={target?.anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            p: 1.5,
            minWidth: Math.max(240, target?.anchor.offsetWidth ?? 0),
          },
        },
      }}
    >
      {target && <FilterForm key={target.column.id} column={target.column} />}
    </Popover>
  );
}

function FilterForm({ column }: { column: AnyColumn }) {
  const meta = column.columnDef.meta ?? {};
  const value = column.getFilterValue() as FilterValue | undefined;
  const set = (next: FilterValue | undefined) => column.setFilterValue(next);
  const header =
    typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id;

  let body;
  switch (meta.type) {
    case "boolean":
      body = (
        <ToggleButtonGroup
          exclusive
          size="small"
          fullWidth
          value={value?.operator === "EQUALS" ? String(value.value) : "any"}
          onChange={(_, v: string | null) =>
            set(
              v === null || v === "any"
                ? undefined
                : { operator: "EQUALS", value: v === "true" },
            )
          }
        >
          <ToggleButton value="any">Any</ToggleButton>
          <ToggleButton value="true">Yes</ToggleButton>
          <ToggleButton value="false">No</ToggleButton>
        </ToggleButtonGroup>
      );
      break;
    case "enum":
    case "status":
    case "icon": {
      const selected = value?.operator === "IN" ? value.values : [];
      const toggle = (v: string, on: boolean) => {
        const values = on ? [...selected, v] : selected.filter((s) => s !== v);
        set(values.length ? { operator: "IN", values } : undefined);
      };
      body = (
        <Stack sx={{ maxHeight: 280, overflowY: "auto" }}>
          {meta.options?.map((o) => (
            <FormControlLabel
              key={o.value}
              label={o.label}
              control={
                <Checkbox
                  size="small"
                  checked={selected.includes(o.value)}
                  onChange={(e) => toggle(o.value, e.target.checked)}
                />
              }
            />
          ))}
        </Stack>
      );
      break;
    }
    case "number":
    case "date":
    case "datetime": {
      const between = value?.operator === "BETWEEN" ? value : undefined;
      body = (
        <RangeFilter
          type={meta.type === "number" ? "number" : "date"}
          from={between?.from}
          to={between?.to}
          onChange={set}
        />
      );
      break;
    }
    default:
      body = (
        <TextFilter
          value={value?.operator === "CONTAINS" ? value.value : ""}
          onChange={set}
        />
      );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Filter {header}</Typography>
      {body}
      <Button
        size="small"
        onClick={() => set(undefined)}
        disabled={value === undefined}
        sx={{ alignSelf: "flex-end" }}
      >
        Clear
      </Button>
    </Stack>
  );
}

/** Local draft, pushed to filter state after the user pauses typing. */
function useDebounced<T>(value: T, onSettle: (v: T) => void, ms = 300) {
  useEffect(() => {
    const t = setTimeout(() => onSettle(value), ms);
    return () => clearTimeout(t);
    // Only the draft value should restart the timer.
  }, [value]);
}

function TextFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: FilterValue | undefined) => void;
}) {
  const [draft, setDraft] = useState(value);
  useDebounced(
    draft,
    (v) =>
      v !== value &&
      onChange(v ? { operator: "CONTAINS", value: v } : undefined),
  );
  return (
    <TextField
      autoFocus
      size="small"
      placeholder="Contains…"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

function RangeFilter(props: {
  type: "number" | "date";
  from?: string | number;
  to?: string | number;
  onChange: (v: FilterValue | undefined) => void;
}) {
  const [draft, setDraft] = useState({
    from: props.from?.toString() ?? "",
    to: props.to?.toString() ?? "",
  });
  useDebounced(draft, ({ from, to }) => {
    if (
      from === (props.from?.toString() ?? "") &&
      to === (props.to?.toString() ?? "")
    )
      return;
    const cast = (v: string) =>
      v === "" ? undefined : props.type === "number" ? Number(v) : v;
    props.onChange(
      from || to
        ? { operator: "BETWEEN", from: cast(from), to: cast(to) }
        : undefined,
    );
  });
  const field = (key: "from" | "to", label: string) => (
    <TextField
      size="small"
      type={props.type}
      label={label}
      value={draft[key]}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
  return (
    <Stack direction="row" spacing={1}>
      {field("from", props.type === "number" ? "Min" : "From")}
      {field("to", props.type === "number" ? "Max" : "To")}
    </Stack>
  );
}
