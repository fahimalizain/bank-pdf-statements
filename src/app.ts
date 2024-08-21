import 'dotenv/config';
import express, { Request, Response } from 'express';
import { logger } from './logger';
import statementsRouter from './routes/statements';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
  (err: Error, req: Request, res: Response, _next: express.NextFunction) => {
    logger.error(err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDev ? err.message : 'An unexpected error occurred',
    });
  },
);

app.use('/api/v1/statements', statementsRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  import('./worker').then((module) => {
    module.default();
  });
}
