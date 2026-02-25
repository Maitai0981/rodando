const { spawn } = require('child_process');

const cmd = process.execPath;
const args = [
  require.resolve('@playwright/test/cli'),
  'test',
  'tests/e2e/supabase-live-connectivity.spec.js',
];

const env = {
  ...process.env,
  RUN_LIVE_SUPABASE: process.env.RUN_LIVE_SUPABASE || '1',
};

const child = spawn(cmd, args, { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
