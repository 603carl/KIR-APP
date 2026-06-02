const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');

const DEFAULT_PACKAGE = 'com.publickenyaapp.kenyaincidentreport';

const activitySource = (packageName) => `package ${packageName}

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class EmergencyBroadcastActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableLockScreenPresentation()

    val title = intent.getStringExtra("title") ?: "Emergency Broadcast"
    val message = intent.getStringExtra("message") ?: "An official emergency alert has been issued."
    val severity = intent.getStringExtra("severity") ?: "extreme"

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(40, 56, 40, 56)
      setBackgroundColor(Color.rgb(127, 29, 29))
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
    }

    val badge = TextView(this).apply {
      text = "KENYA INCIDENT REPORT"
      setTextColor(Color.rgb(254, 226, 226))
      textSize = 13f
      letterSpacing = 0.18f
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, 20)
    }

    val titleView = TextView(this).apply {
      text = title
      setTextColor(Color.WHITE)
      textSize = 32f
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, 0, 0, 18)
    }

    val severityView = TextView(this).apply {
      text = "SEVERITY: \${severity.uppercase()}"
      setTextColor(Color.rgb(254, 202, 202))
      textSize = 15f
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, 0, 0, 28)
    }

    val messageView = TextView(this).apply {
      text = message
      setTextColor(Color.WHITE)
      textSize = 20f
      gravity = Gravity.CENTER
      setLineSpacing(8f, 1.0f)
      setPadding(8, 0, 8, 36)
    }

    val openButton = Button(this).apply {
      text = "OPEN KIR APP"
      setTextColor(Color.rgb(127, 29, 29))
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setOnClickListener {
        openMainApp()
      }
    }

    val dismissButton = Button(this).apply {
      text = "DISMISS"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.TRANSPARENT)
      setOnClickListener {
        finishAndRemoveTask()
      }
    }

    root.addView(badge)
    root.addView(titleView)
    root.addView(severityView)
    root.addView(messageView)
    root.addView(openButton, LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    ))
    root.addView(dismissButton, LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    ))

    setContentView(root)
  }

  private fun enableLockScreenPresentation() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      keyguardManager.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      )
    }

    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun openMainApp() {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    if (launchIntent != null) {
      launchIntent.addFlags(
        android.content.Intent.FLAG_ACTIVITY_NEW_TASK or
          android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or
          android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
      )
      launchIntent.putExtras(intent)
      startActivity(launchIntent)
    }
    finishAndRemoveTask()
  }
}
`;

const notifierSource = (packageName) => `package ${packageName}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

object EmergencyBroadcastNotifier {
  private const val TAG = "KIREmergencyBroadcast"
  private const val CHANNEL_ID = "emergency-broadcasts-native-v1"
  private const val CHANNEL_NAME = "Emergency Broadcast Takeover"

  fun show(context: Context, rawData: Map<String, String>) {
    val data = sanitize(rawData)
    val broadcastId = data["broadcastId"] ?: "broadcast-\${System.currentTimeMillis()}"
    val title = data["title"] ?: "Emergency Broadcast"
    val message = data["message"] ?: "An official emergency alert has been issued."
    val severity = data["severity"] ?: "extreme"
    val notificationId = broadcastId.hashCode() and Int.MAX_VALUE

    createChannel(context)

    val fullScreenIntent = Intent(context, EmergencyBroadcastActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra("broadcastId", broadcastId)
      putExtra("title", title)
      putExtra("message", message)
      putExtra("severity", severity)
      putExtra("type", data["type"] ?: "broadcast")
    }

    val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      notificationId,
      fullScreenIntent,
      pendingIntentFlags
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.notification_icon)
      .setContentTitle(title)
      .setContentText(message)
      .setStyle(NotificationCompat.BigTextStyle().bigText(message))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setVibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000))
      .setSound(soundUri(context))
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(60_000)
      .setContentIntent(fullScreenPendingIntent)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .build()
      .apply {
        flags = flags or Notification.FLAG_INSISTENT
      }

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !notificationManager.canUseFullScreenIntent()) {
      Log.w(TAG, "Full-screen intent access is disabled by Android. Posting alarm notification fallback.")
    }
    notificationManager.notify(notificationId, notification)
  }

  private fun sanitize(rawData: Map<String, String>): Map<String, String> {
    return rawData.mapValues { (_, value) -> value.take(3500) }
  }

  private fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) return

    val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Critical KIR broadcast alerts with alarm sound and full-screen presentation."
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
      setSound(
        soundUri(context),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
    }

    notificationManager.createNotificationChannel(channel)
  }

  private fun soundUri(context: Context): Uri {
    return Uri.parse("\${android.content.ContentResolver.SCHEME_ANDROID_RESOURCE}://\${context.packageName}/\${R.raw.emergency_alert}")
  }
}
`;

const messagingServiceSource = (packageName) => `package ${packageName}

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

class EmergencyBroadcastMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data.toMutableMap()
    remoteMessage.notification?.title?.let { data.putIfAbsent("title", it) }
    remoteMessage.notification?.body?.let { data.putIfAbsent("message", it) }

    if (isKirBroadcast(data)) {
      EmergencyBroadcastNotifier.show(applicationContext, data)
      return
    }

    super.onMessageReceived(remoteMessage)
  }

  private fun isKirBroadcast(data: Map<String, String>): Boolean {
    return data["kir_native_fullscreen"] == "true" ||
      data["isBroadcast"] == "true" ||
      data["type"] == "broadcast"
  }
}
`;

function ensureArray(parent, key) {
    if (!parent[key]) parent[key] = [];
    return parent[key];
}

function removeByAndroidName(items, androidName) {
    return items.filter((item) => item?.$?.['android:name'] !== androidName);
}

function upsertByAndroidName(items, node) {
    const androidName = node?.$?.['android:name'];
    if (!androidName) return items;
    return [...removeByAndroidName(items, androidName), node];
}

function writeKotlinFile(projectRoot, packageName, fileName, source) {
    const packagePath = packageName.replace(/\./g, path.sep);
    const dir = path.join(projectRoot, 'app', 'src', 'main', 'java', ...packagePath.split(path.sep));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), source, 'utf8');
}

function addFirebaseMessagingDependency(buildGradle) {
    const dependency = '    implementation("com.google.firebase:firebase-messaging:25.0.1")';
    if (buildGradle.includes('com.google.firebase:firebase-messaging')) return buildGradle;
    return buildGradle.replace(/dependencies\s*\{\s*/, (match) => `${match}\n${dependency}\n`);
}

/**
 * Custom Expo Config Plugin for Emergency Broadcast Full-Screen Intent.
 * 
 * Modifies AndroidManifest.xml to:
 * 1. Allow MainActivity to show over the lockscreen and wake the screen
 * 2. Declare required permissions for FSI, wake lock, and foreground service
 * 3. Declare only permissions used by urgent notifications and screen wake-up
 */
function withAndroidFullScreen(config) {
    config = withAppBuildGradle(config, (config) => {
        config.modResults.contents = addFirebaseMessagingDependency(config.modResults.contents);
        return config;
    });

    config = withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;
        manifest.$ = manifest.$ || {};
        manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

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
        const permissions = ensureArray(manifest, 'uses-permission');

        const existingPermissions = permissions.map(
            (p) => p['$']['android:name']
        );

        const requiredPermissions = [
            'android.permission.USE_FULL_SCREEN_INTENT',
            'android.permission.WAKE_LOCK',
            'android.permission.VIBRATE',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.RECEIVE_BOOT_COMPLETED',
            'android.permission.POST_NOTIFICATIONS',
            'android.permission.DISABLE_KEYGUARD',
        ];

        for (const perm of requiredPermissions) {
            if (!existingPermissions.includes(perm)) {
                console.log(`[FSI Plugin] Adding permission: ${perm}`);
                permissions.push({
                    '$': { 'android:name': perm },
                });
            }
        }

        const application = manifest.application[0];
        const services = ensureArray(application, 'service');
        application.service = upsertByAndroidName(services, {
            '$': {
                'android:name': 'expo.modules.notifications.service.ExpoFirebaseMessagingService',
                'tools:node': 'remove',
            },
        });
        application.service = upsertByAndroidName(application.service, {
            '$': {
                'android:name': '.EmergencyBroadcastMessagingService',
                'android:exported': 'false',
            },
            'intent-filter': [
                {
                    '$': { 'android:priority': '1000' },
                    action: [{ '$': { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
                },
            ],
        });

        const activities = ensureArray(application, 'activity');
        application.activity = upsertByAndroidName(activities, {
            '$': {
                'android:name': '.EmergencyBroadcastActivity',
                'android:theme': '@style/incomingCall',
                'android:launchMode': 'singleTask',
                'android:excludeFromRecents': 'true',
                'android:exported': 'false',
                'android:showWhenLocked': 'true',
                'android:turnScreenOn': 'true',
            },
        });

        return config;
    });

    return withDangerousMod(config, [
        'android',
        async (config) => {
            const packageName = config.android?.package || DEFAULT_PACKAGE;
            const projectRoot = config.modRequest.platformProjectRoot;
            writeKotlinFile(projectRoot, packageName, 'EmergencyBroadcastActivity.kt', activitySource(packageName));
            writeKotlinFile(projectRoot, packageName, 'EmergencyBroadcastNotifier.kt', notifierSource(packageName));
            writeKotlinFile(projectRoot, packageName, 'EmergencyBroadcastMessagingService.kt', messagingServiceSource(packageName));
            return config;
        },
    ]);
}

module.exports = withAndroidFullScreen;
