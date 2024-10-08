import { ExtractTableResult } from '../pdf/types';

export type outputFormat = 'csv' | 'json';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'error';

export type JobProgress = {
  status: JobStatus;
  progress?: number;
  result?: ExtractTableResult;
  error?: Error;
};

export type PDFJob = {
  jobId: string;
  outputFormat: outputFormat;
  inputFile: string;
  progress?: JobProgress;
};

export type EnqueueJobArgs = Pick<
  PDFJob,
  'jobId' | 'outputFormat' | 'inputFile'
>;
