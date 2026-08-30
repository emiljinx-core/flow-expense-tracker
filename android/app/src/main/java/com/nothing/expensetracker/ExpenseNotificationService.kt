package com.nothing.expensetracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat

class ExpenseNotificationService : NotificationListenerService() {

    private lateinit var duplicateFilter: DuplicateFilter
    private lateinit var pendingQueue: PendingQueue
    private val CHANNEL_ID = "transaction_alerts"
    private val NOTIFICATION_ID = 1001 // Reuse same ID to prevent spam

    override fun onCreate() {
        super.onCreate()
        duplicateFilter = DuplicateFilter(this)
        pendingQueue = PendingQueue(this)
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Transaction Alerts"
            val descriptionText = "Alerts for detected expenses"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName
        val notification = sbn.notification
        val extras = notification.extras

        Log.d("ExpenseTracker-BG", "onNotificationPosted: package=$packageName")
        Log.d("ExpenseTracker-BG", "AppStateTracker.isAppInForeground() = ${AppStateTracker.isAppInForeground()}")
        Log.d("ExpenseTracker-BG", "Settings.canDrawOverlays() = ${Settings.canDrawOverlays(this)}")

        if (packageName == "com.google.android.apps.nbu.paisa.user") {
            Log.d("ExpenseTracker-GPAY", "GPay notification received")
            Log.d("ExpenseTracker-GPAY", "package=$packageName")
            Log.d("ExpenseTracker-GPAY", "key=${sbn.key}")
            Log.d("ExpenseTracker-GPAY", "id=${sbn.id}")
            Log.d("ExpenseTracker-GPAY", "postTime=${sbn.postTime}")
            Log.d("ExpenseTracker-GPAY", "category=${notification.category}")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d("ExpenseTracker-GPAY", "channelId=${notification.channelId}")
            }
            Log.d("ExpenseTracker-GPAY", "flags=${notification.flags}")
            Log.d("ExpenseTracker-GPAY", "priority=${notification.priority}")

            val gpayTitle = extras.get(Notification.EXTRA_TITLE)?.toString()
            val gpayText = extras.get(Notification.EXTRA_TEXT)?.toString()
            val gpayBigText = extras.get(Notification.EXTRA_BIG_TEXT)?.toString()
            Log.d("ExpenseTracker-GPAY", "GPay EXTRA_TITLE = $gpayTitle")
            Log.d("ExpenseTracker-GPAY", "GPay EXTRA_TEXT = $gpayText")
            Log.d("ExpenseTracker-GPAY", "GPay EXTRA_BIG_TEXT = $gpayBigText")

            val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            if (textLines != null) {
                Log.d("ExpenseTracker-GPAY", "GPay EXTRA_TEXT_LINES = [")
                textLines.forEachIndexed { index, line ->
                    Log.d("ExpenseTracker-GPAY", "  line $index: ${line?.toString()}")
                }
                Log.d("ExpenseTracker-GPAY", "]")
            } else {
                Log.d("ExpenseTracker-GPAY", "GPay EXTRA_TEXT_LINES = null")
            }

            Log.d("ExpenseTracker-GPAY", "--- ALL EXTRAS ---")
            for (key in extras.keySet()) {
                val value = extras.get(key)
                val type = value?.javaClass?.simpleName ?: "null"
                val stringValue = if (value is CharSequence) value.toString() else value?.toString() ?: "null"
                Log.d("ExpenseTracker-GPAY", "key=$key value=$stringValue type=$type")
            }
            Log.d("ExpenseTracker-GPAY", "------------------")
        }

        Log.d("ExpenseTracker", "BEFORE EXTRA READ: keys=${extras.keySet()}")

        for (key in extras.keySet()) {
            val value = extras.get(key)
            Log.d(
                "ExpenseTracker",
                "EXTRA key=$key value=${value?.toString()} type=${value?.javaClass?.simpleName}"
            )
        }

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        
        Log.d("ExpenseTracker", "Notification received: package=$packageName title=$title text=$text")

        if (title.isEmpty() && text.isEmpty()) return

        Log.d(
            "ExpenseTracker",
            "PARSER INPUT: package=$packageName title=[$title] text=[$text]"
        )

        val candidate = TransactionParser.parse(
            title,
            text,
            packageName,
            sbn.postTime
        )

        if (candidate == null) {
            Log.d(
                "ExpenseTracker",
                "PARSER RESULT: NULL"
            )
        } else {
            Log.d(
                "ExpenseTracker",
                "PARSER RESULT: SUCCESS type=${candidate.type}, amount=${candidate.amount}, counterparty=${candidate.counterparty}"
            )
        }
        
        if (candidate != null) {
            if (!duplicateFilter.isDuplicate(candidate)) {
                Log.d("ExpenseTracker", "New Transaction Detected: ${candidate.amount} via ${candidate.sourceApp}")
                Log.d("ExpenseTracker-BG", "Transaction detected: amount=${candidate.amount}, source=${candidate.sourceApp}")
                Log.d("ExpenseTracker-BG", "About to enqueue transaction")
                
                // Add to persistent queue
                pendingQueue.enqueue(candidate)
                Log.d("ExpenseTracker-BG", "Transaction successfully enqueued")
                
                Log.d(
                    "ExpenseTracker-BG",
                    "Presentation decision: foreground=${AppStateTracker.isAppInForeground()}, canDrawOverlays=${Settings.canDrawOverlays(this)}"
                )
                if (AppStateTracker.isAppInForeground()) {
                    // Broadcast to capacitor plugin if active
                    val intent = Intent("com.nothing.expensetracker.NEW_TRANSACTION")
                    sendBroadcast(intent)
                } else {
                    // Handle background presentation
                    if (Settings.canDrawOverlays(this)) {
                        // Start overlay service
                        Log.d("ExpenseTracker-BG", "BACKGROUND: attempting to start TransactionOverlayService")
                        Log.d("ExpenseTracker-BG", "Overlay candidate JSON=${candidate.toJson()}")
                        val intent = Intent(this, TransactionOverlayService::class.java).apply {
                            putExtra("candidate", candidate.toJson().toString())
                        }
                        startService(intent)
                        Log.d("ExpenseTracker-BG", "BACKGROUND: TransactionOverlayService startService() called")
                    } else {
                        // Fallback to standard notification
                        showFallbackNotification(candidate)
                    }
                }
            } else {
                Log.d("ExpenseTracker", "Duplicate transaction discarded")
            }
        }
    }

    private fun showFallbackNotification(candidate: TransactionCandidate) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val amountRupees = candidate.amount / 100.0
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Temporary icon
            .setContentTitle("Transaction Detected")
            .setContentText("₹$amountRupees detected. Tap to review.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager: NotificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }
}
