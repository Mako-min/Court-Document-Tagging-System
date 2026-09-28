import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

const [major, minor] = process.versions.node.split('.').map(Number);
if (!(major === 20 && minor >= 19) && !(major === 22 && minor >= 12) && major < 24) {
  console.error(
    '当前 Node.js 版本过低或不在支持范围内，请安装 Node.js 24 LTS： https://nodejs.org/',
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
const missing = Object.keys(dependencies).some(
  (name) => !existsSync(join(root, 'node_modules', name, 'package.json')),
);
const lockContent = readFileSync(join(root, 'package-lock.json'));
const lockHash = createHash('sha256').update(lockContent).digest('hex');
const lockedPackages = JSON.parse(lockContent).packages;
const versionsMatch =
  !missing &&
  Object.keys(dependencies).every((name) => {
    try {
      const installed = JSON.parse(
        readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'),
      );
      return installed.version === lockedPackages[`node_modules/${name}`]?.version;
    } catch {
      return false;
    }
  });
const stamp = join(root, 'node_modules', '.mingli-install-stamp');
const previousHash = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : '';

try {
  if (missing || !versionsMatch || (previousHash && previousHash !== lockHash)) {
    console.log('\n首次启动或依赖已更新，正在安装所需文件，请稍候……\n');
    // 固定使用锁文件安装；不改写组员约定的依赖版本。
    const install =
      process.platform === 'win32'
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm ci'], {
            cwd: root,
            stdio: 'inherit',
            windowsHide: true,
          })
        : spawnSync('npm', ['ci'], { cwd: root, stdio: 'inherit' });
    if (install.error || install.status !== 0) {
      throw new Error('依赖安装失败。请检查网络与 npm 是否可用，然后重新双击启动。');
    }
  }
  writeFileSync(stamp, lockHash);

  const { createServer } = await import('vite');
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 5173;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('端口应为 1–65535 的整数。');
  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port, open: !process.argv.includes('--no-open') },
  });
  await server.listen();
  console.log(
    process.argv.includes('--no-open')
      ? '\n明理网页已启动，可复制下方地址访问。'
      : '\n明理网页已启动。浏览器将自动打开；也可以复制下方地址访问。',
  );
  console.log('使用期间请保留此窗口，关闭窗口或按 Ctrl+C 可停止运行。\n');
  server.printUrls();

  async function stop() {
    await server.close();
    process.exit(0);
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch (error) {
  console.error(`\n启动失败：${error.message}`);
  process.exitCode = 1;
}
