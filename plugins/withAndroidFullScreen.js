const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin for Emergency Broadcast Full-Screen Intent.
 * 
 * Modifies AndroidManifest.xml to:
 * 1. Allow MainActivity to show over the lockscreen and wake the screen
 * 2. Declare required permissions for FSI, wake lock, and foreground service
 * 3. Add receiver for boot-completed to re-register notification channels
 */
function withAndroidFullScreen(config) {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;

        // 1. Set MainActivity flags for lockscreen visibility
        const mainActivity = manifest.application[0].activity.find(
            (activity) => activity['$']['android:name'] === '.MainActivity'
        );

        if (mainActivity) {
            console.log('[FSI Plugin] Applying Full Screen Intent flags to MainActivity...');
            mainActivity['$']['android:showWhenLocked'] = 'true';
            mainActivity['$']['android:turnScreenOn'] = 'true';
            mainActivity['$']['android:launchMode'] = 'singleTask';
        } else {
            console.warn('[FSI Plugin] MainActivity not found in AndroidManifest.xml');
        }

        // 2. Ensure critical permissions are declared
        if (!manifest['uses-permission']) {
            manifest['uses-permission'] = [];
        }

        const existingPermissions = manifest['uses-permission'].map(
            (p) => p['$']['android:name']
        );

        const requiredPermissions = [
            'android.permission.USE_FULL_SCREEN_INTENT',
            'android.permission.WAKE_LOCK',
            'android.permission.VIBRATE',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.RECEIVE_BOOT_COMPLETED',
            'android.permission.SCHEDULE_EXACT_ALARM',
            'android.permission.POST_NOTIFICATIONS',
            'android.permission.SYSTEM_ALERT_WINDOW',
        ];

        for (const perm of requiredPermissions) {
            if (!existingPermissions.includes(perm)) {
                console.log(`[FSI Plugin] Adding permission: ${perm}`);
                manifest['uses-permission'].push({
                    '$': { 'android:name': perm },
                });
            }
        }

        return config;
    });
}

module.exports = withAndroidFullScreen;
