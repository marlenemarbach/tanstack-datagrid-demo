import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import type { Tone } from './grid/features'

const tones: Array<Exclude<Tone, 'neutral'>> = ['info', 'success', 'warning', 'error', 'primary']

/**
 * All grid styling, applied once on the grid root and targeting class names.
 * Cells are plain elements with no `sx` of their own, which keeps rendering
 * thousands of cells cheap (no per-cell Emotion work). Keep this object
 * stable (module scope) so Emotion can reuse the serialised styles.
 */
export const gridSx: SxProps<Theme> = (theme) => {
  const { palette } = theme
  const paper = palette.background.paper
  const border = `1px solid ${palette.divider}`
  const toneStyles = Object.fromEntries(
    tones.map((tone) => [
      `& .tg-status[data-tone="${tone}"]`,
      { color: palette[tone].dark, backgroundColor: alpha(palette[tone].main, 0.12) },
    ]),
  )
  const iconTones = Object.fromEntries(tones.map((tone) => [`& .tg-icon-value[data-tone="${tone}"]`, { color: palette[tone].main }]))

  return {
    '--row-bg': paper,
    '--row-hover': `color-mix(in srgb, ${palette.text.primary} 4%, ${paper})`,
    '--row-selected': `color-mix(in srgb, ${palette.primary.main} 18%, ${paper})`,
    '--group-bg': `color-mix(in srgb, ${palette.text.primary} 6%, ${paper})`,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    position: 'relative',
    border,
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: paper,
    typography: 'body2',

    // Native progress bar: animates only while fetching (an idle MUI LinearProgress keeps animating when hidden).
    '@keyframes tg-progress': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(250%)' } },
    '& .tg-progress': {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      zIndex: 5,
      overflow: 'hidden',
      pointerEvents: 'none',
      '&[data-active="true"]::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        width: '40%',
        bgcolor: 'primary.main',
        animation: 'tg-progress 1.2s ease-in-out infinite',
      },
    },
    '& .tg-scroller': { flex: 1, overflow: 'auto', position: 'relative', overscrollBehavior: 'contain' },
    '& .tg-canvas': { position: 'relative' },

    // Header
    '& .tg-header': { position: 'sticky', top: 0, zIndex: 3, bgcolor: paper, borderBottom: border },
    '& .tg-header-row, & .tg-filter-row': { display: 'flex' },
    '& .tg-filter-row': { borderTop: border },
    '& .tg-fc': {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      px: 0.5,
      boxSizing: 'border-box',
      bgcolor: paper,
      borderInlineEnd: border,
    },
    '& .tg-fc.tg-pinned': { bgcolor: paper, zIndex: 4 },
    '& .tg-filter-input': {
      width: '100%',
      minWidth: 0,
      height: 26,
      boxSizing: 'border-box',
      px: 0.75,
      font: 'inherit',
      fontSize: 13,
      color: 'text.primary',
      bgcolor: palette.background.default,
      border,
      borderRadius: 0.5,
      outline: 'none',
      '&::placeholder': { color: palette.text.disabled },
      '&:hover': { borderColor: palette.text.secondary },
      '&:focus': { borderColor: palette.primary.main, boxShadow: `0 0 0 1px ${palette.primary.main}` },
      '&[data-active="true"]': { borderColor: palette.primary.main },
      '&[aria-invalid="true"]': { borderColor: palette.error.main },
    },
    '& .tg-th': {
      flex: 'none',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      bgcolor: paper,
      borderInlineEnd: border,
      fontWeight: 600,
      '&:hover .tg-th-filter': { opacity: 0.6 },
    },
    '& .tg-th-label': {
      all: 'unset',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      height: '100%',
      px: 1.25,
      cursor: 'pointer',
      '&:focus-visible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: -2 },
    },
    '& .tg-th-text': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    '& .tg-sort': { width: 16, height: 16, color: 'primary.main' },
    '& .tg-sort-index': { fontSize: 10, color: 'primary.main', fontWeight: 700 },
    '& .tg-th-filter': {
      all: 'unset',
      display: 'grid',
      placeItems: 'center',
      width: 24,
      height: 24,
      mr: 0.75,
      borderRadius: 0.5,
      cursor: 'pointer',
      opacity: 0,
      '&:hover, &:focus-visible': { opacity: 1, bgcolor: 'action.hover' },
      '&[data-active="true"]': { opacity: 1, color: 'primary.main' },
    },
    '& .tg-resizer': {
      position: 'absolute',
      insetInlineEnd: -3,
      top: 0,
      bottom: 0,
      width: 6,
      zIndex: 1,
      cursor: 'col-resize',
      touchAction: 'none',
      '&:hover, &[data-resizing="true"]': { bgcolor: 'primary.main' },
    },

    // Body
    '& .tg-body': { position: 'relative' },
    '& .tg-row': {
      position: 'absolute',
      top: 0,
      left: 0,
      height: 36,
      display: 'flex',
      bgcolor: 'var(--row-bg)',
      borderBottom: border,
      boxSizing: 'border-box',
      '&:hover': { '--row-bg': 'var(--row-hover)' },
      '&[data-selected="true"]': { '--row-bg': 'var(--row-selected)' },
      '&:focus-visible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: -2 },
    },
    '& .tg-cell': {
      flex: 'none',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      boxSizing: 'border-box',
      outline: 'none',
      '&[data-align="end"]': { justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' },
      '&[data-align="center"]': { justifyContent: 'center' },
      '&:focus': { boxShadow: `inset 0 0 0 2px ${palette.primary.main}` },
    },
    '& .tg-pinned': { position: 'sticky', zIndex: 1, bgcolor: 'var(--row-bg)' },
    '& .tg-th.tg-pinned': { bgcolor: paper, zIndex: 4 },
    '& .tg-pinned-last': { boxShadow: `1px 0 0 ${palette.divider}, 4px 0 6px -4px ${alpha(palette.common.black, 0.25)}` },

    // Edit mode: editable cells look like inputs; the real <input> only mounts on edit.
    '&[data-edit-mode="true"] .tg-cell[data-editable="true"]': {
      cursor: 'text',
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: '4px 4px',
        border,
        borderRadius: 0.5,
        bgcolor: alpha(palette.background.default, 0.4),
        pointerEvents: 'none',
        zIndex: -1,
      },
      '&:hover::after': { borderColor: palette.text.primary },
      '&:focus': { boxShadow: 'none' },
      '&:focus::after': { borderColor: palette.primary.main, borderWidth: 2 },
      '&[data-type="boolean"]': { cursor: 'pointer' },
    },
    '& .tg-cell[data-editable="true"]': { isolation: 'isolate' },
    '& .tg-editor': {
      position: 'absolute',
      inset: '4px 4px',
      width: 'calc(100% - 8px)',
      boxSizing: 'border-box',
      px: 1,
      font: 'inherit',
      color: 'text.primary',
      bgcolor: paper,
      border: `2px solid ${palette.primary.main}`,
      borderRadius: 0.5,
      outline: 'none',
      textAlign: 'inherit',
    },
    '& .tg-cell[data-align="end"] .tg-editor': { textAlign: 'end' },

    // Groups
    '& .tg-group-row': { bgcolor: 'var(--group-bg)', fontWeight: 600, outline: 'none', '&:focus-visible .tg-group-cell': { boxShadow: `inset 0 0 0 2px ${palette.primary.main}` } },
    '& .tg-group-cell': { position: 'sticky', left: 0, display: 'flex', alignItems: 'center', gap: 1, pr: 2, height: '100%' },
    '& .tg-expander': {
      all: 'unset',
      display: 'grid',
      placeItems: 'center',
      width: 24,
      height: 24,
      borderRadius: 0.5,
      cursor: 'pointer',
      '&:hover': { bgcolor: 'action.hover' },
    },
    '& .tg-group-label': { color: 'text.secondary', fontWeight: 400 },
    '& .tg-group-value': { display: 'inline-flex', alignItems: 'center', gap: 0.5 },
    '& .tg-group-count': { px: 1, borderRadius: 2, fontSize: 12, lineHeight: '20px', bgcolor: 'action.selected' },
    '& .tg-loader-row': { color: 'text.secondary', fontStyle: 'italic', alignItems: 'center' },
    '& .tg-sticky-label': { position: 'sticky', left: 0, px: 2 },

    // Values
    '& .tg-icon': { width: 18, height: 18, flex: 'none', fill: 'currentColor' },
    '& .tg-bool--true': { color: 'success.main' },
    '& .tg-bool--false': { color: 'text.disabled' },
    '& .tg-icon-value': { display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 },
    ...iconTones,
    '& .tg-status': {
      display: 'inline-block',
      px: 1,
      borderRadius: 1,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: '22px',
      color: 'text.secondary',
      bgcolor: 'action.selected',
    },
    ...toneStyles,
    '& .tg-checkbox': { width: 16, height: 16, m: 0, cursor: 'pointer', accentColor: palette.primary.main },

    // Chrome
    '& .tg-empty': { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'grid', placeItems: 'center', color: 'text.secondary' },
    '& .tg-status-bar': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      px: 1.5,
      py: 0.75,
      borderTop: border,
      typography: 'caption',
      color: 'text.secondary',
    },
    '& .tg-status-bar-selected': { color: 'primary.main', fontWeight: 600 },
  }
}
