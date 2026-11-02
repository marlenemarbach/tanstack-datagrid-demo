import { useState, type DragEvent } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";

/** A column the grid can be grouped by. */
export type GroupByOption = { id: string; label: string };
type DropTarget = { index: number; side: "before" | "after" };

type GroupByFieldProps = {
  /** Groupable columns. */
  options: Array<GroupByOption>;
  /** Current grouping, outermost level first. */
  value: Array<GroupByOption>;
  onChange: (ids: Array<string>) => void;
};

/** Multi-select of group-by columns; drag the chips to change the nesting order. */
export function GroupByField({ options, value, onChange }: GroupByFieldProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const endDrag = () => {
    setDragIndex(null);
    setDropTarget(null);
  };

  const onChipDragOver = (e: DragEvent<HTMLElement>, index: number) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
    const next = index === dragIndex ? null : ({ index, side } as const);
    setDropTarget((t) =>
      t?.index === next?.index && t?.side === next?.side ? t : next,
    );
  };

  const onChipDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (dragIndex !== null && dropTarget) {
      const ids = value.map((c) => c.id);
      const [moved] = ids.splice(dragIndex, 1);
      const at =
        dropTarget.index -
        (dropTarget.index > dragIndex ? 1 : 0) +
        (dropTarget.side === "after" ? 1 : 0);
      ids.splice(at, 0, moved);
      onChange(ids);
    }
    endDrag();
  };

  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={value}
      onChange={(_, v) => onChange(v.map((c) => c.id))}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderValue={(items, getItemProps) =>
        items.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          const drop = dropTarget?.index === index ? dropTarget.side : null;
          return (
            <Chip
              key={key}
              {...itemProps}
              size="small"
              label={option.label}
              draggable
              // The Autocomplete root prevents mousedown default, which would block the drag.
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", option.id);
                setDragIndex(index);
              }}
              onDragOver={(e) => onChipDragOver(e, index)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setDropTarget(null);
              }}
              onDrop={onChipDrop}
              onDragEnd={endDrag}
              sx={{
                cursor: "grab",
                position: "relative",
                // Own compositing layer, so Chromium keeps the corners outside the
                // rounded chip transparent in the drag preview.
                transform: "translate(0, 0)",
                opacity: dragIndex === index ? 1 : 1,
                "&::after": drop
                  ? {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: 2,
                      bgcolor: "primary.main",
                      [drop === "before" ? "left" : "right"]: -3,
                    }
                  : undefined,
              }}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField {...params} placeholder={value.length ? "" : "Group by…"} />
      )}
      sx={{ flex: 1, minWidth: 240, maxWidth: 600 }}
    />
  );
}
