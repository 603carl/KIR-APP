const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to enable Full Screen Intent (FSI) capabilities.
 * It modifies the AndroidManifest.xml to allow the MainActivity to show over the lockscreen
 * and wake the screen when a notification arrives.
 */
function withAndroidFullScreen(config) {
    return withAndroidManifest(config, (config) => {
        const mainActivity = config.modResults.manifest.application[0].activity.find(
            (activity) => activity['$']['android:name'] === '.MainActivity'
        );

        if (mainActivity) {
            console.log('Applying Full Screen Intent flags to MainActivity...');
            mainActivity['$']['android:showWhenLocked'] = 'true';
            mainActivity['$']['android:turnScreenOn'] = 'true';
        } else {
            console.warn('MainActivity not found in AndroidManifest.xml');
        }

        return config;
    });
}

module.exports = withAndroidFullScreen;
