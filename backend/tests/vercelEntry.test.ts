import { describe, expect, it } from 'vitest';
import handler, { getApp } from '../api/index.js';

describe('Vercel serverless entry point', () => {
  it('exports a callable default handler and a cached app factory', () => {
    expect(typeof handler).toBe('function');
    expect(typeof getApp).toBe('function');
  });
});
