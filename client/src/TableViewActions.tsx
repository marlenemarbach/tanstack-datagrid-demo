import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { Icon } from "./grid";
import { parseZoom, rowHeights, serializeZoom } from "./queryParams";
import { setUrlParams } from "./urlState";
import { clearView, emptyView, loadView, sameView, saveView, type View } from "./savedView";

const iconSx = {
  p: 0.25,
  "& .tg-icon": { width: 18, height: 18, fill: "currentColor" },
};

/** Row zoom and save / reset buttons for the table configuration, shown in the grid's status bar. */
export const TableViewActions = ({ view }: { view: View }) => {
  const [saved, setSaved] = useState(loadView);
  const dirty = !sameView(view, saved ?? emptyView);
  const canReset = saved !== null;
  const zoom = parseZoom(view.zoom);
  const setZoom = (step: number) => setUrlParams({ zoom: serializeZoom(step) });

  const onSave = () => {
    saveView(view);
    setSaved(view);
  };
  const onReset = () => {
    clearView();
    setSaved(null);
    setUrlParams(emptyView);
  };

  return (
    // Zero height: the buttons overflow centred on the text line, so they never grow the bar.
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ ml: "auto", alignSelf: "center", alignItems: "center", height: 0 }}
    >
      <Tooltip title="Smaller rows">
        <span>
          <IconButton size="small" onClick={() => setZoom(zoom - 1)} disabled={zoom === 0} aria-label="Smaller rows" sx={iconSx}>
            <Icon name="zoom-out" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Larger rows">
        <span>
          <IconButton size="small" onClick={() => setZoom(zoom + 1)} disabled={zoom === rowHeights.length - 1} aria-label="Larger rows" sx={iconSx}>
            <Icon name="zoom-in" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Save table configuration">
        {/* span: a disabled button fires no events, so the tooltip needs a wrapper. */}
        <span>
          <IconButton size="small" color="primary" onClick={onSave} disabled={!dirty} aria-label="Save table configuration" sx={iconSx}>
            <Icon name="save" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Reset table configuration">
        <span>
          <IconButton size="small" onClick={onReset} disabled={!canReset} aria-label="Reset table configuration" sx={iconSx}>
            <Icon name="restart" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};
