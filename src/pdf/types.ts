import { Page } from 'pdf2json';

export type PageTable = {
  page: Page;
  columns: TableColumns[];
  rows: ParsedRow[];
};

export type ExtractTableResult = {
  columns: TableColumns[];
  rows: ParsedRow[];
};

export type ParsedRow = Partial<Record<TableColumns['type'], string | number>>;

export type TableColumns = {
  type:
    | 'SERIAL_NO'
    | 'TX_DATE'
    | 'VALUE_DATE'
    | 'DESCRIPTION'
    | 'REFERENCE'
    | 'CREDIT'
    | 'DEBIT'
    | 'BALANCE';
  index: number;
  label: string;
  x: number;
  y: number;
  w: number;
  multiline: boolean;
  parseNumber: boolean;
};
