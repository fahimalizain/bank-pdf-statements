import 'dotenv/config';
import express, { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { getJobLogger, logger } from './logger';
import { enqueueJob } from './bee-queue';

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.env.FILE_STORAGE_PATH || './uploads');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.use(
  (err: Error, req: Request, res: Response, _next: express.NextFunction) => {
    logger.error(err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDev ? err.message : 'An unexpected error occurred',
    });
  },
);

app.post(
  '/api/v1/statements',
  pdfUpload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const jobId = nanoid(20);
    const outputFormat = req.body.outputFormat || 'csv';

    const logger = getJobLogger({ jobId });
    logger.info('incoming file', req.file);
    logger.info('request format', { outputFormat });
    res.send('Hello, World!');
    enqueueJob({ jobId, outputFormat, inputFile: req.file.path });
  },
);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  import('./worker').then((module) => {
    module.default();
  });
}
