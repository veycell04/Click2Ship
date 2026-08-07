import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

rmSync(resolve(process.cwd(), 'dist'), { recursive: true, force: true });
