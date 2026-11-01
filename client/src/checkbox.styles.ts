import { alpha, darken, getContrastRatio, type CSSObject, type Theme } from '@mui/material/styles'

const svg = (shape: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`,
  )}")`
const checkmark = svg('<polyline points="2.5 6.25 5 8.75 9.5 3.5"/>')
const dash = svg('<line x1="3" y1="6" x2="9" y2="6"/>')

/** WCAG 1.4.11: graphical parts of a control need 3:1. */
const MIN_CONTRAST = 3

/** `color`, darkened in 5% steps until the white checkmark reaches MIN_CONTRAST. */
function fillFor(color: string) {
  let fill = color
  for (let step = 1; step <= 20 && getContrastRatio(fill, '#fff') < MIN_CONTRAST; step++) {
    fill = darken(color, step * 0.05)
  }
  return fill
}

/**
 * Native `<input type="checkbox" class="tg-checkbox">`, registered globally
 * (CssBaseline) so popovers outside the grid root get it too. Drawn by hand
 * so the checkmark is white whatever the primary shade; the fill is the
 * primary color, darkened where needed for contrast with the checkmark.
 */
export function checkboxStyles(theme: Theme): CSSObject {
  const { palette } = theme
  const fill = fillFor(palette.primary.main)
  const on: CSSObject = { borderColor: fill, backgroundColor: fill }
  return {
    appearance: 'none',
    width: 16,
    height: 16,
    flex: 'none',
    boxSizing: 'border-box',
    margin: 0,
    border: `2px solid ${alpha(palette.text.primary, 0.38)}`,
    borderRadius: 2,
    background: 'no-repeat center / 100%',
    cursor: 'pointer',
    '&:checked': { ...on, backgroundImage: checkmark },
    '&:indeterminate': { ...on, backgroundImage: dash },
    '&:focus-visible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: 2 },
  }
}
