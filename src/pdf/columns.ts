import { Text } from 'pdf2json';
import { TableColumns } from './types';
import { extractString } from './utils';
import { ColumnKeyWords } from './meta';

/**
 * Given a set a Map of y-coordinates to Text objects, this function identifies the y-coordinate of the table header and the columns within the table.
 * @param lineMap A Map where keys are y-coordinates and values are arrays of Text objects
 * @returns An array containing the y-coordinate of the table header and an array of TableColumns
 */
export function identifyTableColumns(
  lineMap: Map<number, Text[]>,
): [number, TableColumns[]] | null {
  const headerY = identifyTableHeaderY(lineMap);
  if (headerY === -1) {
    return null;
  }

  const headerTexts = lineMap.get(headerY) ?? [];
  if (headerTexts.length === 0) {
    return null;
  }

  // There is a possibility that the header text is split across two lines
  const headerTexts2Idx =
    Array.from(lineMap.keys())
      .sort((a, b) => a - b)
      .find((y) => y > headerY) ?? -1;
  const headerTexts2 = headerTexts2Idx >= 0 ? lineMap.get(headerTexts2Idx) : [];

  const colTypesFound: TableColumns['type'][] = [];
  const columns: TableColumns[] = [];
  for (let i = 0; i < headerTexts.length; i++) {
    const text = headerTexts[i];

    const line2Text =
      headerTexts2?.find((x) => {
        if (x.x > text.x + text.w) {
          return false;
        }

        if (
          (x.A || 'left') !== (text.A || 'left') ||
          (x.clr || 0) !== (text.clr || 0) ||
          (x.oc || 0) !== (text.oc || 0)
        ) {
          return false;
        }

        // We are not expecting multiple runs for a single text element
        if (x.R.length > 1) {
          return false;
        }

        // x.R.S style index from style dictionary
        if (x.R[0].S !== text.R[0].S) {
          return false;
        }

        // x.R.TS is an array of numbers representing [fontFaceId, fontSize, 1/0 for bold, 1/0 for italic]
        if (JSON.stringify(x.R[0].TS) !== JSON.stringify(text.R[0].TS)) {
          return false;
        }

        // Verify second line starts after first line in X-axis
        if (x.x < text.x) {
          return false;
        }

        // Verify the width of the second line do not go beyond the first line for more than 2 units
        if (x.x + x.w - text.x + text.w < 2) {
          return false;
        }

        return true;
      }) ?? null;

    let label = extractString(text);

    if (line2Text) {
      label += ' ' + extractString(line2Text);
      headerTexts2?.splice(headerTexts2.indexOf(line2Text), 1);
      lineMap.delete(headerTexts2Idx); // Remove the second line
    }

    const colDef = ColumnKeyWords.filter(
      (x) => !colTypesFound.includes(x.type),
    ).find((c) =>
      c.keywords.some((keyword) =>
        new RegExp(`\\b${keyword}\\b`, 'i').test(label),
      ),
    );

    if (!colDef) {
      continue;
    }

    colTypesFound.push(colDef.type);

    columns.push({
      type: colDef.type,
      index: i,
      label,
      x: text.x,
      y: text.y,
      w: text.w,
      multiline: colDef.multiline || false,
      parseNumber: colDef.parseNumber || false,
    });
  }

  // Now, let's distribute the column widths and heights.
  // We'll use integer percentages to avoid floating point issues.
  // - non-multiline vs non-multiline: 50-50 distribution
  // - non-multiline vs multiline: 35-65 distribution
  // - multiline vs non-multiline: 65-35 distribution
  // - multiline vs multiline: 50-50 distribution
  for (let i = 0; i < columns.length - 1; i++) {
    const col1 = columns[i];
    const col2 = columns[i + 1];

    let distr1 = col1.multiline ? 90 : 10;
    let distr2 = col2.multiline ? 90 : 10;

    if (distr1 + distr2 !== 100) {
      distr1 = 50;
      distr2 = 50;
    }

    const totalWidth = col2.x + col2.w - col1.x;
    const newCol1Width = Math.round((totalWidth * distr1) / 100);

    col1.w = newCol1Width;
    col2.x = col1.x + newCol1Width;
    col2.w = totalWidth - newCol1Width;
  }

  return [headerY, columns];
}

/**
 * Identifies the y-coordinate of the table header in a table
 * This is done by going through each line and checking if some of our expected column headers are present.
 *
 * @param lineMap A Map where keys are y-coordinates and values are arrays of Text objects
 * @returns The y-coordinate of the table header or -1 if not found
 */
function identifyTableHeaderY(lineMap: Map<number, Text[]>): number {
  const headerKeywords = ColumnKeyWords.map((c) => c.keywords);

  for (const [y, texts] of lineMap.entries()) {
    const lineText = texts
      .flatMap((t) => t.R.map((r) => r.T.toLowerCase()))
      .join(' ');
    const matchCount = headerKeywords.filter((keywords) =>
      keywords.some((keyword) => lineText.includes(keyword)),
    ).length;

    if (matchCount >= 4) {
      return y;
    }
  }

  return -1;
}
