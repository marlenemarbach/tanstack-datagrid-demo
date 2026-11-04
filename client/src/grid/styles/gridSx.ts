import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import type { Tone } from "../core/features";

const tones: Array<Exclude<Tone, "neutral">> = [
  "info",
  "success",
  "warning",
  "error",
  "primary",
];

/**
 * All grid styling, applied once on the grid root and targeting class names.
 * Cells are plain elements with no `sx` of their own, which keeps rendering
 * thousands of cells cheap (no per-cell Emotion work). Keep this object
 * stable (module scope) so Emotion can reuse the serialised styles.
 *
 * Don't use comma-separated selector lists here (`&:hover, &:focus`): in the
 * Bun dev server Emotion mangles them and the rule is lost. Use `:is()`.
 */
export const gridSx: SxProps<Theme> = (theme) => {
  const { palette } = theme;
  const paper = palette.background.paper;
  const border = `1px solid ${palette.divider}`;
  const toneStyles = Object.fromEntries(
    tones.map((tone) => [
      `& .tg-status[data-tone="${tone}"]`,
      {
        color: palette[tone].dark,
        backgroundColor: alpha(palette[tone].main, 0.12),
      },
    ]),
  );
  const iconTones = Object.fromEntries(
    tones.map((tone) => [
      `& .tg-icon-value[data-tone="${tone}"]`,
      { color: palette[tone].main },
    ]),
  );

  // Native <select>: the browser arrow ignores padding-right in Chromium/Edge,
  // so draw our own chevron and reserve room for it.
  const selectChevron = {
    appearance: "none",
    pr: 3,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${palette.text.secondary}" d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>`,
    )}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 4px center",
    backgroundSize: "18px 18px",
    cursor: "pointer",
  } as const;

  return {
    "--row-bg": paper,
    "--row-hover": `color-mix(in srgb, ${palette.text.primary} 4%, ${paper})`,
    "--row-selected": `color-mix(in srgb, ${palette.primary.main} 18%, ${paper})`,
    "--group-bg": `color-mix(in srgb, ${palette.text.primary} 6%, ${paper})`,
    "--row-stripe": `color-mix(in srgb, ${palette.text.primary} 3%, ${paper})`,
    "--filter-bg": `color-mix(in srgb, ${palette.text.primary} 4%, ${paper})`,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    position: "relative",
    border,
    borderRadius: 0,
    overflow: "hidden",
    bgcolor: paper,
    typography: "body2",

    // Native progress bar: animates only while fetching (an idle MUI LinearProgress keeps animating when hidden).
    "@keyframes tg-progress": {
      from: { transform: "translateX(-100%)" },
      to: { transform: "translateX(250%)" },
    },
    "& .tg-progress": {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      zIndex: 5,
      overflow: "hidden",
      pointerEvents: "none",
      '&[data-active="true"]::before': {
        content: '""',
        position: "absolute",
        inset: 0,
        width: "40%",
        bgcolor: "primary.main",
        animation: "tg-progress 1.2s ease-in-out infinite",
      },
    },
    "& .tg-scroller": {
      flex: 1,
      overflow: "auto",
      position: "relative",
      overscrollBehavior: "contain",
    },
    "& .tg-canvas": { position: "relative" },

    // Header
    "& .tg-header": {
      position: "sticky",
      top: 0,
      zIndex: 3,
      bgcolor: paper,
      borderBottom: border,
    },
    "& :is(.tg-header-row, .tg-filter-row)": { display: "flex" },
    "& .tg-filter-row": {
      borderTop: border,
      borderBottom: border,
      bgcolor: "var(--filter-bg)",
    },
    "& .tg-fc": {
      flex: "none",
      display: "flex",
      alignItems: "center",
      px: 1,
      boxSizing: "border-box",
      bgcolor: "var(--filter-bg)",
      borderInlineEnd: `1px solid ${paper}`,
    },
    "& .tg-fc.tg-pinned": { bgcolor: "var(--filter-bg)", zIndex: 4 },
    "& .tg-filter-input": {
      width: "100%",
      minWidth: 0,
      height: 26,
      boxSizing: "border-box",
      px: 0.75,
      font: "inherit",
      fontSize: 13,
      color: "text.primary",
      bgcolor: palette.background.default,
      border,
      borderRadius: 1,
      outline: "none",
      "&::placeholder": { color: palette.text.disabled },
      "&:hover": { borderColor: palette.text.secondary },
      "&:focus": {
        borderColor: palette.primary.main,
        boxShadow: `0 0 0 1px ${palette.primary.main}`,
      },
      '&[data-active="true"]': { borderColor: palette.primary.main },
      '&[aria-invalid="true"]': { borderColor: palette.error.main },
    },
    "& select.tg-filter-input": selectChevron,
    "& .tg-filter-search": {
      position: "relative",
      width: "100%",
      minWidth: 0,
      "& svg": {
        position: "absolute",
        insetInlineStart: 5,
        top: "50%",
        transform: "translateY(-50%)",
        width: 16,
        height: 16,
        fill: palette.text.secondary,
        pointerEvents: "none",
      },
      "& .tg-filter-input": { pl: 3 },
    },
    "& .tg-filter-select": {
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      pr: 0.25,
      textAlign: "start",
      cursor: "pointer",
      "& svg": { flex: "none", width: 18, height: 18, fill: palette.text.secondary },
    },
    "& .tg-filter-range": {
      position: "relative",
      width: "100%",
      minWidth: 0,
      "& .tg-filter-input": { pr: 3.25 },
    },
    "& .tg-filter-range-btn": {
      all: "unset",
      position: "absolute",
      insetInlineEnd: 2,
      top: 2,
      bottom: 2,
      width: 22,
      display: "grid",
      placeItems: "center",
      borderRadius: 0.5,
      cursor: "pointer",
      color: palette.text.secondary,
      "&:hover": { color: palette.text.primary, bgcolor: palette.action.hover },
      "&:focus-visible": { outline: `2px solid ${palette.primary.main}` },
    },
    "& .tg-filter-select-text": {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "& .tg-th": {
      flex: "none",
      position: "relative",
      display: "flex",
      alignItems: "center",
      bgcolor: paper,
      fontWeight: 600,
      borderInlineEnd: `1px solid ${paper}`,
      // With the label's own padding this keeps the text 10px from the edge.
      pl: 0.5,
      // Column separator, like the MUI DataGrid: drawn over the 1px border
      // (always in the background colour here) and inset top and bottom.
      "&::after": {
        content: '""',
        position: "absolute",
        top: theme.spacing(1),
        bottom: theme.spacing(1),
        insetInlineEnd: -1,
        width: "1px",
        bgcolor: palette.divider,
        pointerEvents: "none",
      },
      "&:hover .tg-th-filter": { opacity: 0.6 },
      '&[data-dragging="true"]': { opacity: 0.5 },
      '&[data-drop="before"]': {
        boxShadow: `inset 2px 0 0 ${palette.primary.main}`,
      },
      '&[data-drop="after"]': {
        boxShadow: `inset -2px 0 0 ${palette.primary.main}`,
      },
    },
    "& .tg-th-label": {
      all: "unset",
      // Fills the cell, but stops short of both edges; the right gap keeps
      // clicks on the column resizer (3px into the cell) from sorting.
      flex: 1,
      alignSelf: "stretch",
      minWidth: 0,
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      px: 0.75,
      mr: 1,
      borderRadius: 1,
      cursor: "pointer",
      "&:focus-visible": {
        outline: `2px solid ${palette.primary.main}`,
        outlineOffset: -2,
      },
    },
    "& .tg-th-text": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "& .tg-sort": { width: 16, height: 16, flex: "none", color: "primary.main" },
    "& .tg-sort-hint": { color: "text.disabled", opacity: 0 },
    "& .tg-th-label:is(:hover, :focus-visible) .tg-sort-hint": {
      opacity: 1,
    },
    "& .tg-sort-index": {
      fontSize: 10,
      color: "primary.main",
      fontWeight: 700,
    },
    "& .tg-th-filter": {
      all: "unset",
      display: "grid",
      placeItems: "center",
      width: 24,
      height: 24,
      ml: "auto",
      mr: 0.75,
      borderRadius: 1,
      cursor: "pointer",
      opacity: 0,
      "&:is(:hover, :focus-visible)": { opacity: 1, bgcolor: "action.hover" },
      '&[data-active="true"]': { opacity: 1, color: "primary.main" },
    },
    "& .tg-resizer": {
      position: "absolute",
      insetInlineEnd: -3,
      top: 0,
      bottom: 0,
      width: 6,
      zIndex: 1,
      cursor: "col-resize",
      touchAction: "none",
      // The hit area is 6px centred on the column edge; on hover the column
      // separator is redrawn blue and 2px wide, with the same inset.
      "&::after": {
        content: '""',
        position: "absolute",
        top: theme.spacing(1),
        bottom: theme.spacing(1),
        insetInlineEnd: 2,
        width: 2,
      },
      '&:is(:hover, [data-resizing="true"])::after': { bgcolor: "primary.main" },
    },

    // Body
    "& .tg-body": { position: "relative" },
    // Striped rows: borders take the stripe colour, so toggling never shifts
    // anything. `:where()` keeps the stripe's specificity low enough that the
    // hover/selected rules below still win.
    '&[data-striped-rows="true"] .tg-row': {
      borderBottomColor: "var(--row-stripe)",
    },
    '&:where([data-striped-rows="true"]) .tg-row[data-alt="true"]': {
      "--row-bg": "var(--row-stripe)",
    },
    "& .tg-row": {
      position: "absolute",
      top: 0,
      left: 0,
      height: "var(--row-height, 36px)",
      display: "flex",
      bgcolor: "var(--row-bg)",
      borderBottom: border,
      boxSizing: "border-box",
      "&:hover": { "--row-bg": "var(--row-hover)" },
      '&[data-selected="true"]': { "--row-bg": "var(--row-selected)" },
      "&:focus-visible": {
        outline: `2px solid ${palette.primary.main}`,
        outlineOffset: -2,
      },
    },
    "& .tg-cell": {
      flex: "none",
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.25,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      boxSizing: "border-box",
      outline: "none",
      borderInlineEnd: "1px solid var(--row-bg)",
      '&[data-align="end"]': {
        justifyContent: "flex-end",
        fontVariantNumeric: "tabular-nums",
      },
      '&[data-align="center"]': { justifyContent: "center" },
      "&:focus": { boxShadow: `inset 0 0 0 2px ${palette.primary.main}` },
    },
    // Column borders: always 1px wide, painted in the cell's background colour
    // when hidden, so toggling never shifts anything. Header cells show an
    // inset separator over theirs (see `.tg-th`).
    "& .tg-filter-row .tg-fc": { borderInlineEndColor: "var(--filter-bg)" },
    '&[data-column-borders="true"] :is(.tg-fc, .tg-cell)': {
      borderInlineEndColor: palette.divider,
    },
    "& .tg-pinned": { position: "sticky", zIndex: 1, bgcolor: "var(--row-bg)" },
    "& .tg-th.tg-pinned": { bgcolor: paper, zIndex: 4 },
    "& .tg-pinned-last": {
      boxShadow: `1px 0 0 ${palette.divider}, 4px 0 6px -4px ${alpha(palette.common.black, 0.12)}`,
    },
    // The header already has its own border, so drop the shadow's 1px line.
    "& .tg-th.tg-pinned-last": {
      boxShadow: `4px 0 6px -4px ${alpha(palette.common.black, 0.12)}`,
    },

    // Edit mode: editable cells look like inputs; the real <input> only mounts on edit.
    '&[data-edit-mode="true"] .tg-cell[data-editable="true"]': {
      cursor: "text",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: "4px 4px",
        border,
        borderRadius: 1,
        bgcolor: alpha(palette.background.default, 0.4),
        pointerEvents: "none",
        zIndex: -1,
      },
      "&:hover::after": { borderColor: palette.text.primary },
      "&:focus": { boxShadow: "none" },
      "&:focus::after": { borderColor: palette.primary.main, borderWidth: 2 },
      '&[data-type="boolean"]': { cursor: "pointer" },
    },
    '& .tg-cell[data-editable="true"]': { isolation: "isolate" },
    "& .tg-editor": {
      position: "absolute",
      inset: "4px 4px",
      width: "calc(100% - 8px)",
      boxSizing: "border-box",
      // 4px inset + 2px border + 4px padding = the cell's 10px, so text doesn't shift.
      px: 0.5,
      font: "inherit",
      color: "text.primary",
      bgcolor: paper,
      border: `2px solid ${palette.primary.main}`,
      borderRadius: 1,
      outline: "none",
      textAlign: "inherit",
    },
    '& .tg-cell[data-align="end"] .tg-editor': { textAlign: "end" },
    "& select.tg-editor": selectChevron,

    // Groups
    "& .tg-group-row": {
      bgcolor: "var(--group-bg)",
      fontWeight: 600,
      outline: "none",
      "&:focus-visible .tg-group-cell": {
        boxShadow: `inset 0 0 0 2px ${palette.primary.main}`,
      },
    },
    "& .tg-group-cell": {
      position: "sticky",
      left: 0,
      display: "flex",
      alignItems: "center",
      gap: 1,
      pr: 2,
      height: "100%",
    },
    "& .tg-expander": {
      all: "unset",
      display: "grid",
      placeItems: "center",
      width: 24,
      height: 24,
      borderRadius: 1,
      cursor: "pointer",
      "&:hover": { bgcolor: "action.hover" },
    },
    "& .tg-group-label": { color: "text.secondary", fontWeight: 400 },
    "& .tg-group-value": {
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
    },
    "& .tg-group-count": {
      px: 1,
      borderRadius: 1,
      fontSize: 12,
      lineHeight: "20px",
      bgcolor: "action.selected",
    },
    "& .tg-loader-row": {
      color: "text.secondary",
      fontStyle: "italic",
      alignItems: "center",
    },
    "& .tg-sticky-label": { position: "sticky", left: 0, px: 2 },

    // Values
    "& .tg-icon": { width: 18, height: 18, flex: "none", fill: "currentColor" },
    "& .tg-bool--true": { color: "success.main" },
    "& .tg-bool--false": { color: "text.disabled" },
    "& .tg-icon-value": {
      display: "inline-flex",
      alignItems: "center",
      gap: 0.75,
      minWidth: 0,
    },
    ...iconTones,
    "& .tg-status": {
      display: "inline-block",
      px: 1,
      borderRadius: 1,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: "22px",
      color: "text.secondary",
      bgcolor: "action.selected",
    },
    ...toneStyles,

    // Chrome
    "& .tg-empty": {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      display: "grid",
      placeItems: "center",
      color: "text.secondary",
    },
    "& .tg-status-bar": {
      display: "flex",
      flexWrap: "wrap",
      gap: 2,
      px: 1.5,
      py: 0.75,
      borderTop: border,
      typography: "caption",
      color: "text.secondary",
    },
    "& .tg-status-bar-selected": { color: "primary.main", fontWeight: 600 },
  };
};
