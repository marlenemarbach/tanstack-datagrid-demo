import { createTheme } from "@mui/material/styles";
import { checkboxStyles } from "./checkbox.styles";

/** App theme; shared with Storybook. */
const primary = { main: "#00BFEA" };
export const theme = createTheme({
  colorSchemes: {
    light: { palette: { primary } },
    dark: { palette: { primary } },
  },
  // 2px everywhere (spacing 0.25); sx `borderRadius: 1` resolves to this.
  shape: { borderRadius: 2 },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({ ".tg-checkbox": checkboxStyles(theme) }),
    },
    // Flat popovers: hairline border carries the edge, shadow only hints at lift.
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)",
          ...theme.applyStyles("dark", {
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          }),
        }),
      },
    },
    MuiFormControlLabel: {
      defaultProps: { slotProps: { typography: { variant: "body2" } } },
    },
  },
});
