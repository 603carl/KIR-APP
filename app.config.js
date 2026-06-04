const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.GOOGLE_SERVICES_FILE ||
  undefined;

const googleServiceInfoPlist =
  process.env.GOOGLE_SERVICE_INFO_PLIST ||
  process.env.GOOGLE_SERVICE_INFO_PLIST_FILE ||
  undefined;

const fallbackGoogleWebClientId = '751130763657-6s429sp824lsha2sdqp9ooler427hve2.apps.googleusercontent.com';
const isProductionEasBuild = process.env.EAS_BUILD === 'true' && process.env.EAS_BUILD_PROFILE === 'production';
const isAndroidEasBuild =
  process.env.EAS_BUILD_PLATFORM === 'android' ||
  process.env.EAS_BUILD_PLATFORM === undefined;

module.exports = ({ config }) => {
  if (isProductionEasBuild && isAndroidEasBuild && !googleServicesFile) {
    throw new Error(
      '[Firebase] GOOGLE_SERVICES_JSON or GOOGLE_SERVICES_FILE must be configured as an EAS production file env before building Android. ' +
      'Without google-services.json, Android cannot register native FCM tokens for killed-app emergency broadcast takeover.'
    );
  }

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    config.extra?.googleWebClientId ||
    fallbackGoogleWebClientId;

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    ios: {
      ...config.ios,
      ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
    },
    extra: {
      ...config.extra,
      googleWebClientId,
    },
  };
};
