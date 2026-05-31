const { expo } = require('./app.json');

const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.GOOGLE_SERVICES_FILE ||
  undefined;

const googleServiceInfoPlist =
  process.env.GOOGLE_SERVICE_INFO_PLIST ||
  process.env.GOOGLE_SERVICE_INFO_PLIST_FILE ||
  undefined;

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  expo.extra?.googleWebClientId ||
  '751130763657-6s429sp824lsha2sdqp9ooler427hve2.apps.googleusercontent.com';

module.exports = () => ({
  ...expo,
  android: {
    ...expo.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  ios: {
    ...expo.ios,
    ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
  },
  extra: {
    ...expo.extra,
    googleWebClientId,
  },
});
