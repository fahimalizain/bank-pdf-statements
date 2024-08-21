import { TableColumns } from './types';

export const ColumnKeyWords = [
  { type: 'SERIAL_NO', keywords: ['sn', 'sl', 's no'] },
  { type: 'VALUE_DATE', keywords: ['value date', 'value dt'] },
  { type: 'TX_DATE', keywords: ['date', 'transaction date'] },
  {
    type: 'DESCRIPTION',
    keywords: ['remarks', 'description', 'notes', 'particulars', 'narration'],
    multiline: true,
  },
  {
    type: 'REFERENCE',
    multiline: true,
    keywords: [
      'cheque',
      'ref no',
      'tran. no',
      'transaction no',
      'chq',
      'ref.no',
    ],
  },
  { type: 'CREDIT', parseNumber: true, keywords: ['credit', 'deposit', 'in'] },
  {
    type: 'DEBIT',
    parseNumber: true,
    keywords: ['debit', 'withdrawal', 'out'],
  },
  {
    type: 'BALANCE',
    parseNumber: true,
    keywords: ['balance', 'closing balance'],
  },
] satisfies Array<{
  type: TableColumns['type'];
  keywords: string[];
  multiline?: boolean;
  parseNumber?: boolean;
}>;
