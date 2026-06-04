const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const androidDestination = path.join(projectRoot, 'android', 'app', 'google-services.json');

const source =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.GOOGLE_SERVICES_FILE ||
  '';

const isAndroidBuild =
  process.env.EAS_BUILD_PLATFORM === 'android' ||
  process.env.EAS_BUILD_RUNNER === 'eas-build' ||
  process.env.EAS_BUILD === 'true';

const isProductionBuild =
  process.env.EAS_BUILD === 'true' &&
  process.env.EAS_BUILD_PROFILE === 'production';

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!source) {
  const message =
    '[Firebase] GOOGLE_SERVICES_JSON or GOOGLE_SERVICES_FILE is not set. ' +
    'Native FCM registration will not be available until google-services.json is provided.';

  if (isProductionBuild && isAndroidBuild) {
    fail(message);
  }

  console.warn(message);
  process.exit(0);
}

const sourcePath = path.resolve(source);
if (!fs.existsSync(sourcePath)) {
  const message = `[Firebase] Config file not found at ${sourcePath}`;

  if (isProductionBuild && isAndroidBuild) {
    fail(message);
  }

  console.warn(message);
  process.exit(0);
}

fs.mkdirSync(path.dirname(androidDestination), { recursive: true });
fs.copyFileSync(sourcePath, androidDestination);
console.log(`[Firebase] Android config copied to ${androidDestination}`);
