import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_DISABLE_TURBOPACK: '1',
  TURBOPACK: '0',
};

const result = spawnSync(
  'opennextjs-cloudflare',
  ['build'],
  { stdio: 'inherit', shell: true, env }
);

process.exit(result.status ?? 1);
