import fs from 'fs';
import { extractTable } from './pdf/extract_table';
import { getJobLogger } from './logger';

const logger = getJobLogger({ jobId: 'cli-parse-pdf' });
const file = process.argv.at(-1);
if (!file || !file.endsWith('.pdf')) {
  logger.error('Invalid file type. Only PDF files are allowed.', { file });
  process.exit(1);
}

if (!fs.existsSync(file)) {
  logger.error('File not found.', { file });
  process.exit(1);
}

logger.info('Parsing PDF...', { file });
extractTable(file, logger)
  .then((r) => {
    logger.info('PDF parsed successfully from CLI');
    console.log(JSON.stringify(r, null, 2));
  })
  .catch((e) => {
    logger.error('Error parsing PDF.', { error: e });
  });
