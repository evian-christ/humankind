const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const tauriRoot = path.join(projectRoot, 'src-tauri');
const appName = 'Humankind in a nutshell DEMO.app';
const version = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;

const appPath = path.join(tauriRoot, 'target', 'release', 'bundle', 'macos', appName);
const macosPath = path.join(appPath, 'Contents', 'MacOS');
const releaseDir = path.join(repoRoot, 'release_artifacts');
const zipPath = path.join(releaseDir, `humankind-steam-macos-demo-${version}-aarch64.zip`);

function findSteamDylib() {
  const buildRoot = path.join(tauriRoot, 'target', 'release', 'build');
  const entries = fs.existsSync(buildRoot) ? fs.readdirSync(buildRoot) : [];

  for (const entry of entries) {
    if (!entry.startsWith('steamworks-sys-')) continue;
    const candidate = path.join(buildRoot, entry, 'out', 'libsteam_api.dylib');
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`libsteam_api.dylib was not found under ${buildRoot}`);
}

if (!fs.existsSync(appPath)) {
  throw new Error(`macOS app bundle was not found: ${appPath}`);
}

fs.mkdirSync(macosPath, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });

const dylibSource = findSteamDylib();
const dylibTarget = path.join(macosPath, 'libsteam_api.dylib');
fs.copyFileSync(dylibSource, dylibTarget);

execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
  stdio: 'inherit',
});

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execFileSync('ditto', ['-c', '-k', '--norsrc', '--keepParent', appPath, zipPath], {
  stdio: 'inherit',
});

console.log(`Packaged ${zipPath}`);
