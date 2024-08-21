import Queue from 'bee-queue';
import { getJobLogger, logger } from '../logger';
import { EnqueueJobArgs, PDFJob } from '../types';
import { extractTable } from '../pdf/extract_table';

export const defaultQueue = new Queue<PDFJob>('PDF_QUEUE', {
  redis: {
    host: process.env.WORKER_REDIS_HOST || 'localhost',
    port: parseInt(process.env.WORKER_REDIS_PORT || '6379'),
    /**
     * When Redis connection is lost due to any reason, the process will be killed at the moment.
     * Even though retry_strategy is defined, the process won't be saved
     * supervisord will restart the process. The purpose of this is to have a log of the event.
     *
     * The process is killed only because we are processing the events in the same process.
     * If we were to process the events in a different process, http-server/express won't go down (Tested & Verified)
     */
    retry_strategy: (args: object) => {
      logger.error({
        message: 'Redis connection lost. Retrying in few seconds..',
        ...args,
      });
      return 2000;
    },
  },
});

export function enqueueJob(args: EnqueueJobArgs) {
  return defaultQueue
    .createJob(args)
    .setId(args.jobId)
    .timeout(90000) // 90 seconds
    .save();
}

export function startWorker() {
  defaultQueue.process(async (job) => {
    const logger = getJobLogger({ jobId: job.id });
    logger.info({ message: 'Processing job', job: job.data });
    try {
      const r = await extractTable(job.data.inputFile, logger);
      logger.info({ message: 'Job completed', job: job.data, result: r });
    } catch (e) {
      logger.error({ message: 'Job failed', job: job.data, error: e });
      job.reportProgress({ status: 'error', progress: -1, error: e });
    }
  });
}
