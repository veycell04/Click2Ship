import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  minimum_chrome_version: string;
  permissions: string[];
  host_permissions: string[];
  background: { service_worker: string; type: string };
  side_panel: { default_path: string };
  content_scripts: Array<{ matches: string[]; js: string[] }>;
  icons: Record<string, string>;
  action: { default_title: string; default_icon: Record<string, string> };
}

describe('extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf8'),
  ) as ExtensionManifest;

  it('declares the minimum side-panel permissions and Chrome version', () => {
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['contextMenus', 'storage', 'sidePanel']),
    );
    expect(Number(manifest.minimum_chrome_version)).toBeGreaterThanOrEqual(116);
  });

  it('points to the built service worker and side-panel HTML', () => {
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');
  });

  it('permits backend requests to the configured loopback host', () => {
    expect(manifest.host_permissions).toContain('http://127.0.0.1:3001/*');
  });

  it('declares PNG branding for the extension and toolbar action', () => {
    const expectedIcons = {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    };
    expect(manifest.icons).toEqual(expectedIcons);
    expect(manifest.action).toEqual({
      default_title: 'Click2Ship',
      default_icon: expectedIcons,
    });
  });

  it('injects the selection content script only on normal web pages', () => {
    expect(manifest.content_scripts).toEqual([
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content-script.js'],
        run_at: 'document_idle',
      },
    ]);
  });

  it('opens the side panel before starting asynchronous structured capture', () => {
    const workerSource = readFileSync(
      resolve(process.cwd(), 'src/background/service-worker.ts'),
      'utf8',
    );
    const clickHandler = workerSource.slice(workerSource.indexOf('chrome.contextMenus.onClicked'));
    expect(clickHandler.indexOf('chrome.sidePanel.open({ tabId })')).toBeGreaterThan(0);
    expect(
      clickHandler.indexOf('void captureStructuredSelection(tabId, fallbackText, selectionId)'),
    ).toBeGreaterThan(clickHandler.indexOf('chrome.sidePanel.open({ tabId })'));
    expect(workerSource).toContain('SELECTION_TIMEOUT_MS = 1250');
  });

  it('keeps the asynchronous backend message response channel open', () => {
    const workerSource = readFileSync(
      resolve(process.cwd(), 'src/background/service-worker.ts'),
      'utf8',
    );
    expect(workerSource).toContain('handleBackendRequest(message)');
    expect(workerSource).toContain('return true;');
  });
});
