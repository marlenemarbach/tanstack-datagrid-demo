import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import { Icon } from "./grid";

export const ThemeToggle = () => {
  const { mode, systemMode, setMode } = useColorScheme();
  // `mode` is undefined until the stored preference is read on mount.
  if (!mode) return null;

  const current = mode === "system" ? systemMode : mode;
  const next = current === "dark" ? "light" : "dark";

  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton
        size="small"
        onClick={() => setMode(next)}
        aria-label={`Switch to ${next} mode`}
        sx={{ "& .tg-icon": { width: 20, height: 20, fill: "currentColor" } }}
      >
        <Icon name={current === "dark" ? "dark-mode" : "light-mode"} />
      </IconButton>
    </Tooltip>
  );
};
