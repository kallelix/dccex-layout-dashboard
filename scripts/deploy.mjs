#!/usr/bin/env node
/**
 * Deploy the built dashboard (dist/) to an nginx host over SSH.
 *
 * Config (env wins over deploy.config.json):
 *   DEPLOY_HOST   target host/IP        (required)
 *   DEPLOY_USER   ssh user              (default: root)
 *   DEPLOY_PATH   nginx web root        (default: /var/www/dashboard)
 *   DEPLOY_PORT   ssh port              (default: 22)
 *
 * Needs `ssh` and `scp` in PATH (OpenSSH; preinstalled on Win10+/Linux/macOS).
 * Key-based auth recommended, otherwise you'll be prompted for the password.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync, readFileSync, copyFileSync } from 'node:fs';

let fileCfg = {};
if (existsSync('deploy.config.json')) {
  fileCfg = JSON.parse(readFileSync('deploy.config.json', 'utf8'));
}

const cfg = {
  host: process.env.DEPLOY_HOST ?? fileCfg.host,
  user: process.env.DEPLOY_USER ?? fileCfg.user ?? 'root',
  path: process.env.DEPLOY_PATH ?? fileCfg.path ?? '/var/www/dashboard',
  port: String(process.env.DEPLOY_PORT ?? fileCfg.port ?? 22),
  // Layout bundled as the server default (served at <base>/layout.json). '' = none.
  layout: process.env.DEPLOY_LAYOUT ?? fileCfg.layout ?? 'anlage-v2.json',
};

if (!cfg.host) {
  console.error(
    'deploy: kein Ziel-Host. Setze DEPLOY_HOST oder lege deploy.config.json an\n' +
      '        (Vorlage: deploy.config.example.json).'
  );
  process.exit(1);
}
if (!existsSync('dist')) {
  console.error('deploy: dist/ fehlt — erst `npm run build` (oder nutze `npm run deploy`).');
  process.exit(1);
}
if (!cfg.path || cfg.path.trim() === '' || cfg.path.trim() === '/') {
  console.error(`deploy: unsicherer DEPLOY_PATH "${cfg.path}".`);
  process.exit(1);
}

// Bundle the layout so the deployed app serves it as default (drag&drop still
// overrides on the client). Set "layout": "" in the config to skip.
if (cfg.layout && existsSync(cfg.layout)) {
  copyFileSync(cfg.layout, 'dist/layout.json');
  console.log(`deploy: Layout gebündelt (${cfg.layout} → layout.json)`);
} else if (cfg.layout) {
  console.warn(`deploy: Layout "${cfg.layout}" nicht gefunden — App nutzt das Beispiel.`);
}

const target = `${cfg.user}@${cfg.host}`;
console.log(`deploy → ${target}:${cfg.path} (port ${cfg.port})`);

function run(cmd, args) {
  console.log('  >', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.error) {
    console.error(`deploy: "${cmd}" nicht gefunden? ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`deploy: "${cmd}" fehlgeschlagen (exit ${r.status}).`);
    process.exit(1);
  }
}

// 1) ensure web root exists and clear stale files (remote shell expands the glob)
run('ssh', ['-p', cfg.port, target, `mkdir -p ${cfg.path} && rm -rf ${cfg.path}/*`]);

// 2) upload the contents of dist/ (entries listed explicitly → no shell globbing)
const entries = readdirSync('dist').map((f) => `dist/${f}`);
run('scp', ['-r', '-P', cfg.port, ...entries, `${target}:${cfg.path}/`]);

console.log('deploy: fertig ✅  →  http://' + cfg.host + '/');
