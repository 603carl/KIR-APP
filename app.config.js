const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.GOOGLE_SERVICES_FILE ||
  undefined;

const googleServiceInfoPlist =
  process.env.GOOGLE_SERVICE_INFO_PLIST ||
  process.env.GOOGLE_SERVICE_INFO_PLIST_FILE ||
  undefined;

const fallbackGoogleWebClientId = '751130763657-6s429sp824lsha2sdqp9ooler427hve2.apps.googleusercontent.com';

module.exports = ({ config }) => {
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
