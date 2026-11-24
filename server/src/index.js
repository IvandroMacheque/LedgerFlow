import 'dotenv/config';
import { startServer } from './server.js';
import { logger } from './infra/observability/logger.js';

const port = process.env.PORT || 3000;

async function bootstrap() {
  try {
    const { close } = await startServer({ port });
    logger.info(`[LedgerFlow API] Servidor HTTP e OutboxWorker iniciados na porta ${port}`, {
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
    });

    const shutdown = async (signal) => {
      logger.info(`[LedgerFlow API] Sinal ${signal} recebido. Executando graceful shutdown...`);
      await close();
      logger.info('[LedgerFlow API] Encerrado com sucesso.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('[LedgerFlow API] Erro fatal durante a inicialização', { error });
    process.exit(1);
  }
}

bootstrap();
