import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import multer from 'multer';

import { getJobLogger } from '../logger';
import {
  deleteJob,
  enqueueJob,
  getAllJobs,
  getJob,
  getJobResult,
} from '../bee-queue';
import { getOutputCSV, getOutputJSON } from '../pdf/output';

const router = Router();

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

router.post(
  '/',
  pdfUpload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const jobId = nanoid(20);
    const outputFormat = req.body.outputFormat || 'csv';

    const logger = getJobLogger({ jobId });
    logger.info('Incoming parse statement request', {
      jobId,
      outputFormat,
      file: req.file.path,
    });
    await enqueueJob({ jobId, outputFormat, inputFile: req.file.path });

    return res.status(200).json({
      jobId,
      status: 'queued',
      message: 'Job has been created and added to the queue.',
    });
  },
);

router.get('/:jobId/status', async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const logger = getJobLogger({ jobId });
  logger.info('Get job status', { jobId });
  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'JobNotFoundError',
      message: 'Job not found.',
    });
  }

  return res.status(200).json(job);
});

router.get('/:jobId/result', async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const logger = getJobLogger({ jobId });
  logger.info('Get job result', { jobId });
  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'JobNotFoundError',
      message: 'Job not found.',
    });
  }

  if (job.progress.status !== 'completed') {
    return res.status(400).json({
      error: 'InvalidJobStatusError',
      message: 'Job is not completed.',
    });
  }

  const { outputFormat } = job.data;
  const result = await getJobResult(jobId);

  if (!result) {
    return res.status(500).json({
      error: 'ServerError',
      message: 'An internal server error occurred.',
    });
  }

  if (outputFormat === 'csv') {
    return res
      .status(200)
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename=${jobId}.csv`)
      .send(getOutputCSV(result));
  } else if (outputFormat === 'json') {
    return res.status(200).json(getOutputJSON(result));
  }
});

router.get('/jobs', async (req: Request, res: Response) => {
  const logger = getJobLogger({ jobId: 'jobs' });
  logger.info('Get all jobs');
  const jobs = await getAllJobs();
  return res.status(200).json(jobs);
});

router.delete('/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const logger = getJobLogger({ jobId });
  logger.info('Delete job', { jobId });

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'JobNotFoundError',
      message: 'Job not found.',
    });
  }

  await deleteJob(jobId);
  return res.status(200).json({ message: 'Job has been deleted.' });
});

export default router;
