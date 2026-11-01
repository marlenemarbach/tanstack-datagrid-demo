import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { checkboxStyles } from "./checkbox.styles";
import { IconSprite } from "./grid/icons";
import { restoreSavedView } from "./savedView";

const queryClient = new QueryClient({
  defaultOptions: {
    // Refetching an infinite query refetches every loaded page; keep that explicit.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const primary = { main: "#00BFEA" };
const theme = createTheme({
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

// Before the first render, so the grid never fetches the default view first.
restoreSavedView();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <IconSprite />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
