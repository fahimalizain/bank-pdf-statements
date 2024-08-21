import { startWorker } from './bee-queue';

export default startWorker;

if (process.env.NODE_ENV === 'production') {
  startWorker();
}
