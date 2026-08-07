import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { buildConfiguredApp } from './runtime.js';

let appPromise: Promise<FastifyInstance> | undefined;

export async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = buildConfiguredApp().then(async (app) => {
      await app.ready();
      return app;
    });
  }

  return appPromise;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await getApp();

  await new Promise<void>((resolve, reject) => {
    response.once('finish', resolve);
    response.once('close', resolve);
    response.once('error', reject);
    app.server.emit('request', request, response);
  });
}
