type AltiumColorFromCssInput = {
  cssColor: string
  fallbackAltiumColor: number
}

function parseCssHexColor(cssColor: string):
  | {
      blue: number
      green: number
      red: number
    }
  | undefined {
  const shortHexMatch = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/iu.exec(cssColor)
  if (shortHexMatch) {
    const [, red, green, blue] = shortHexMatch
    if (!red || !green || !blue) return undefined
    return {
      red: Number.parseInt(`${red}${red}`, 16),
      green: Number.parseInt(`${green}${green}`, 16),
      blue: Number.parseInt(`${blue}${blue}`, 16),
    }
  }

  const hexMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(cssColor)
  if (!hexMatch) return undefined
  const [, red, green, blue] = hexMatch
  if (!red || !green || !blue) return undefined
  return {
    red: Number.parseInt(red, 16),
    green: Number.parseInt(green, 16),
    blue: Number.parseInt(blue, 16),
  }
}

export function getAltiumColorFromCss({
  cssColor,
  fallbackAltiumColor,
}: AltiumColorFromCssInput): number {
  const rgbColor = parseCssHexColor(cssColor.trim())
  if (!rgbColor) return fallbackAltiumColor
  return rgbColor.red | (rgbColor.green << 8) | (rgbColor.blue << 16)
}
