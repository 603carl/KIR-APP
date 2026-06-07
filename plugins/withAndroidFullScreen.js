const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');

const DEFAULT_PACKAGE = 'com.publickenyaapp.kenyaincidentreport';

const activitySource = (packageName) => `package ${packageName}

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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

    val title = intent.getStringExtra("title") ?: "Emergency Alert"
    val message = intent.getStringExtra("message") ?: "An official emergency alert has been issued."
    val severity = intent.getStringExtra("severity") ?: "extreme"
    val colors = severityColors(severity)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(24), dp(48), dp(24), dp(48))
      background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, colors)
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
    }

    val icon = TextView(this).apply {
      text = "!"
      setTextColor(Color.WHITE)
      textSize = 42f
      gravity = Gravity.CENTER
      setTypeface(typeface, Typeface.BOLD)
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.TRANSPARENT)
        setStroke(dp(3), Color.WHITE)
      }
    }

    val emergencyTitle = TextView(this).apply {
      text = when (severity.lowercase()) {
        "extreme" -> "EXTREME EMERGENCY"
        "severe" -> "SEVERE ALERT"
        "amber" -> "AMBER ALERT"
        else -> "EMERGENCY ALERT"
      }
      setTextColor(Color.WHITE)
      textSize = 32f
      gravity = Gravity.CENTER
      letterSpacing = 0.06f
      setTypeface(typeface, Typeface.BOLD)
      setPadding(0, dp(14), 0, dp(28))
    }

    val body = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(20), dp(22), dp(20), dp(22))
      background = GradientDrawable().apply {
        cornerRadius = dp(20).toFloat()
        setColor(Color.argb(88, 0, 0, 0))
        setStroke(dp(1), Color.argb(64, 255, 255, 255))
      }
    }

    val titleView = TextView(this).apply {
      text = title
      setTextColor(Color.WHITE)
      textSize = 24f
      gravity = Gravity.CENTER
      setTypeface(typeface, Typeface.BOLD)
      setPadding(0, 0, 0, dp(14))
    }

    val messageView = TextView(this).apply {
      text = message
      setTextColor(Color.WHITE)
      textSize = 18f
      gravity = Gravity.CENTER
      setLineSpacing(dp(4).toFloat(), 1.0f)
    }

    val openButton = Button(this).apply {
      text = "OPEN KIR APP"
      textSize = 18f
      setTextColor(colors[0])
      setTypeface(typeface, Typeface.BOLD)
      background = GradientDrawable().apply {
        cornerRadius = dp(999).toFloat()
        setColor(Color.WHITE)
      }
      setPadding(0, dp(14), 0, dp(14))
      setOnClickListener {
        openMainApp()
      }
    }

    val disclaimer = TextView(this).apply {
      text = "Alert active until dismissed. Move to safety immediately."
      setTextColor(Color.argb(178, 255, 255, 255))
      textSize = 12f
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, dp(10))
    }

    val dismissButton = Button(this).apply {
      text = "DISMISS"
      textSize = 16f
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.TRANSPARENT)
      setTypeface(typeface, Typeface.BOLD)
      setOnClickListener {
        finishAndRemoveTask()
      }
    }

    body.addView(titleView)
    body.addView(messageView)

    val iconParams = LinearLayout.LayoutParams(dp(96), dp(96))
    val bodyParams = LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    bodyParams.bottomMargin = dp(28)
    val openButtonParams = LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    openButtonParams.bottomMargin = dp(4)
    val dismissButtonParams = LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )

    root.addView(icon, iconParams)
    root.addView(emergencyTitle)
    root.addView(body, bodyParams)
    root.addView(openButton, openButtonParams)
    root.addView(disclaimer)
    root.addView(dismissButton, dismissButtonParams)

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

  private fun severityColors(severity: String): IntArray {
    return when (severity.lowercase()) {
      "extreme" -> intArrayOf(Color.rgb(153, 0, 0), Color.rgb(255, 0, 0))
      "severe" -> intArrayOf(Color.rgb(192, 86, 0), Color.rgb(255, 140, 0))
      "amber" -> intArrayOf(Color.rgb(184, 134, 11), Color.rgb(255, 191, 0))
      else -> intArrayOf(Color.rgb(68, 68, 68), Color.rgb(102, 102, 102))
    }
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
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
import androidx.core.app.NotificationManagerCompat

object EmergencyBroadcastNotifier {
  private const val TAG = "KIREmergencyBroadcast"
  private const val CHANNEL_ID = "emergency-broadcasts-v4"
  private const val CHANNEL_NAME = "Emergency Broadcast Takeover"

  fun show(context: Context, rawData: Map<String, String>) {
    val data = sanitize(rawData)
    val broadcastId = data["broadcastId"] ?: "broadcast-\${System.currentTimeMillis()}"
    val title = data["title"] ?: "Emergency Broadcast"
    val message = data["message"] ?: "An official emergency alert has been issued."
    val severity = data["severity"] ?: "extreme"
    val notificationId = broadcastId.hashCode() and Int.MAX_VALUE

    Log.i(TAG, "Native broadcast message received: id=$broadcastId severity=$severity")
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
    val notificationsEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
    if (!notificationsEnabled) {
      Log.e(TAG, "Android notifications are disabled for this app. Emergency broadcast notification cannot be displayed.")
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !notificationManager.canUseFullScreenIntent()) {
      Log.w(TAG, "Full-screen intent access is disabled by Android. Posting alarm notification fallback.")
    } else {
      Log.i(TAG, "Full-screen intent access available. Posting takeover notification.")
    }
    try {
      notificationManager.notify(notificationId, notification)
      Log.i(TAG, "Emergency broadcast notification posted: id=$broadcastId notificationId=$notificationId notificationsEnabled=$notificationsEnabled")
    } catch (securityError: SecurityException) {
      Log.e(TAG, "Emergency broadcast notification blocked by Android notification permission.", securityError)
    } catch (error: Throwable) {
      Log.e(TAG, "Emergency broadcast notification failed.", error)
    }
  }

  private fun sanitize(rawData: Map<String, String>): Map<String, String> {
    return rawData.mapValues { (_, value) -> value.take(3500) }
  }

  private fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) return

    Log.i(TAG, "Creating emergency broadcast notification channel: $CHANNEL_ID")
    val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Critical KIR broadcast alerts with alarm sound and full-screen presentation."
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
      setBypassDnd(true)
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
import android.util.Log

class EmergencyBroadcastMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data.toMutableMap()
    remoteMessage.notification?.title?.let { data.putIfAbsent("title", it) }
    remoteMessage.notification?.body?.let { data.putIfAbsent("message", it) }
    Log.i("KIREmergencyBroadcast", "Firebase message received: dataKeys=\${data.keys.joinToString(",")} hasNotification=\${remoteMessage.notification != null} priority=\${remoteMessage.priority}")

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

function ensureDefaultFcmChannel(projectRoot) {
    const manifestPath = path.join(projectRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
    if (!fs.existsSync(manifestPath)) return;

    const channelMetaData =
        '    <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="emergency-broadcasts-v4" tools:replace="android:value"/>';
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    if (manifest.includes('com.google.firebase.messaging.default_notification_channel_id')) return;

    const insertionPoint = manifest.indexOf('    <meta-data android:name="com.google.firebase.messaging.default_notification_color"');
    if (insertionPoint >= 0) {
        manifest = `${manifest.slice(0, insertionPoint)}${channelMetaData}\n${manifest.slice(insertionPoint)}`;
    } else {
        manifest = manifest.replace(/(<application\b[^>]*>\s*)/, `$1\n${channelMetaData}\n`);
    }
    fs.writeFileSync(manifestPath, manifest, 'utf8');
}

function addFirebaseMessagingDependency(buildGradle) {
    let next = buildGradle;
    if (!next.includes('com.google.firebase:firebase-bom')) {
        next = next.replace(
            /dependencies\s*\{\s*/,
            (match) => `${match}\n    implementation(platform("com.google.firebase:firebase-bom:34.14.0"))\n`
        );
    }
    if (!next.includes('com.google.firebase:firebase-messaging')) {
        next = next.replace(
            /dependencies\s*\{\s*/,
            (match) => `${match}\n    implementation("com.google.firebase:firebase-messaging")\n`
        );
    }
    return next.replace(/implementation\("com\.google\.firebase:firebase-messaging:[^"]+"\)/g, 'implementation("com.google.firebase:firebase-messaging")');
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
        const metaData = ensureArray(application, 'meta-data');
        application['meta-data'] = upsertByAndroidName(metaData, {
            '$': {
                'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
                'android:value': 'emergency-broadcasts-v4',
                'tools:replace': 'android:value',
            },
        });
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
            ensureDefaultFcmChannel(projectRoot);
            return config;
        },
    ]);
}

module.exports = withAndroidFullScreen;
