import { Text } from 'pdf2json';
import { ParsedRow, TableColumns } from './types';
import { extractString } from './utils';

/**
 * Extracts rows from a table based on the columns identified in the table header.
 * Rows can span multiple lines, and the function will merge them into a single row.
 *
 * @param lineMap A Map where keys are y-coordinates and values are arrays of Text objects
 * @param columns An array of TableColumns
 * @returns An array of rows, where each row is an array of strings
 */
export function extractRows(lines: Text[][], columns: TableColumns[]) {
  const rows: Array<ParsedRow> = [];

  for (let i = 0; i < lines.length; i++) {
    // Peek at next 6 lines to peek at wrapped lines. Also text-alignment of the columns may take it to the next line
    for (let j = i + 6; j >= i; j--) {
      const linesToCheck = lines.slice(i, j + 1);
      const buckets = columns.map((c) => ({
        ...c,
        type: c.type,
        label: c.label,
        segments: [] as Text[],
      }));

      // Now, distribute each Text element across all the linesToCheck
      // to each column bucket. Please note that a single row might have multiple Text elements. Always check the Y-axis before deciding if it's a new row.

      for (const line of linesToCheck) {
        for (let k = 0; k < line.length; k++) {
          const text = structuredClone(line[k]);

          const [tX1, tX2] = [text.x, text.x + text.w];
          const possibleBuckets = buckets.filter((bucket) => {
            const [bX1, bX2] = [bucket.x, bucket.x + bucket.w];
            // return true if the text has SOME overlap with the bucket
            return (
              (tX1 <= bX1 && tX2 >= bX1 && tX2 <= bX2) ||
              (tX1 >= bX1 && tX1 < bX2 && tX2 >= bX2) ||
              (tX1 <= bX1 && tX2 >= bX2) ||
              (tX1 >= bX1 && tX2 <= bX2)
            );
          });

          if (possibleBuckets.length === 0) {
            // console.warn('No bucket found for text:', extractString(text));
            continue;
          }

          let bucket = possibleBuckets[0];
          if (possibleBuckets.length > 1) {
            // Find the bucket with the largest overlap
            const overlaps = possibleBuckets.map((b) => {
              const [bX1, bX2] = [b.x, b.x + b.w];
              const overlap = Math.min(bX2, tX2) - Math.max(bX1, tX1);
              return overlap;
            });
            const maxOverlap = Math.max(...overlaps);
            const maxOverlapIdx = overlaps.findIndex((x) => x === maxOverlap);
            bucket = possibleBuckets[maxOverlapIdx];
          }

          bucket.segments.push(text);
        }
      }

      // Now that all Text segments are distributed to their respective buckets, we can check if the buckets are valid
      let valid = true;
      for (const bucket of buckets) {
        if (bucket.segments.length <= 1) continue;
        if (bucket.multiline) continue;

        // Not multiline, and there are multiple segments
        // Check if the y-coordinates of the segments are close to each other
        const yTolerance = 0.1;
        for (let i = 0; i < bucket.segments.length - 1; i++) {
          const segment1 = bucket.segments[i];
          const segment2 = bucket.segments[i + 1];
          if (Math.abs(segment1.y - segment2.y) > yTolerance) {
            valid = false;
            break;
          }
        }

        if (!valid) {
          break;
        }
      }

      if (valid) {
        const row = buckets.reduce((acc, bucket) => {
          const col = bucket.type;
          acc[col] = bucket.segments.map(extractString).join(' ');

          if (bucket.parseNumber) {
            acc[col] = parseFloat((acc[col] || '0').replace(/[^\d.]/g, ''));
          }

          return acc;
        }, {} as ParsedRow);

        if ((row.CREDIT || row.DEBIT) && row.TX_DATE) {
          rows.push(row);
        }

        // Update i to skip the rows we just processed
        // i = j + 1 is not done because we have i++ that will be called right after this
        i = j;
      }
    }
  }

  return rows;
}
