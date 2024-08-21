import PDFParser, { Page } from 'pdf2json';
import winston from 'winston';
import { identifyTableColumns } from './columns';
import { extractRows } from './rows';
import { ExtractTableResult, PageTable, TableColumns } from './types';
import { groupTextByY } from './utils';

export function extractTable(file: string, logger: winston.Logger) {
  return new Promise<ExtractTableResult>((resolve, reject) => {
    const pdfParser = new PDFParser();
    const pages: PageTable[] = [];

    pdfParser.on('readable', (meta) =>
      logger.info('PDF Metadata', { pdfMeta: meta }),
    );
    pdfParser.on('data', (page) => {
      if (page) {
        pages.push({
          page,
          ...getTable(page, pages.length > 0 ? pages[0].columns : null),
        });
      } else if (pages.length > 0) {
        logger.info('All pages parsed', { totalPages: pages.length });
        resolve({
          columns: pages[0].columns,
          rows: pages.flatMap((p) => p.rows),
        });
      } else {
        logger.error('No pages found');
        reject(new Error('No pages found'));
      }
    });

    pdfParser.on('pdfParser_dataError', (err) => {
      logger.error('Parser Error', err);
      reject(err);
    });

    pdfParser.loadPDF(file);
  });
}

function getTable(page: Page, prevColumns: TableColumns[] | null) {
  const lineMap = groupTextByY(page);
  const [headerYIdx, columns] = identifyTableColumns(lineMap) ?? [-1, []];

  // Now we have headerY and columns, we can narrow down the lines to be searched
  const linesToSearch = Array.from(lineMap.keys())
    .sort((a, b) => a - b) // Sort lines by y-coordinate
    .filter((x) => x > headerYIdx) // Filter out lines before headerY
    .map((y) => lineMap.get(y) ?? []);

  const rows = extractRows(linesToSearch, columns ?? prevColumns ?? []);

  return {
    columns,
    rows,
  };
}
