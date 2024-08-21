import { Page, Text } from 'pdf2json';

export function extractString(text: Text): string {
  return text.R.map((r) => decodeURIComponent(r.T)).join(' ');
}

/**
 * Groups text elements on a page by their y-coordinate.
 *
 * @param page The Page object containing text elements to be grouped
 * @param yTolerance The tolerance level for considering y-coordinates as equal (default: 0.1)
 * @returns A Map where keys are y-coordinates and values are arrays of Text objects
 */
export function groupTextByY(
  page: Page,
  yTolerance = 0.1,
): Map<number, Text[]> {
  const lineMap = new Map<number, Text[]>();
  const toleranceMult = 1 / yTolerance;

  page.Texts.forEach((text) => {
    const y = Math.round(text.y * toleranceMult) / toleranceMult;
    if (!lineMap.has(y)) {
      lineMap.set(y, []);
    }
    lineMap.get(y)?.push(
      structuredClone({
        ...text,
        // "text.w doesn't make sense"
        // https://github.com/modesty/pdf2json/issues/136
        // Divide by 16 to convert from PDF units to Relative units as per the comments above.
        w: text.w / 16,
      }),
    );
  });

  return lineMap;
}
