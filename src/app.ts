import { TelegramPoller } from './adapters/telegram-poller.js';
import { createApp, createStoreFromEnv } from './app-factory.js';

const { store, mode: storeMode, dbPath } = createStoreFromEnv(process.env);
const { app, orchestrator } = createApp(store);

const port = Number(process.env.PORT || 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`MiniClaw listening on :${port}`);
  app.log.info(`Session store: ${storeMode}${storeMode === 'sqlite' ? ` (${dbPath})` : ''}`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (botToken) {
    app.log.info('TELEGRAM_BOT_TOKEN detected, starting Telegram poller...');
    const poller = new TelegramPoller(botToken, orchestrator);
    poller.start().catch((err) => app.log.error({ err }, 'telegram poller stopped'));

    const shutdown = () => poller.stop();
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    app.log.info('TELEGRAM_BOT_TOKEN not set; Telegram adapter disabled.');
  }
});
