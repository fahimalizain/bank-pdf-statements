import { ExtractTableResult } from './types';

export function getOutputJSON(result: ExtractTableResult) {
  return result;
}

export function getOutputCSV(result: ExtractTableResult): string {
  const headers = result.columns.map((col) => col.label).join(',');
  const rows = result.rows.map((row) =>
    result.columns.map((col) => row[col.type] || '').join(','),
  );
  return [headers, ...rows].join('\n');
}
