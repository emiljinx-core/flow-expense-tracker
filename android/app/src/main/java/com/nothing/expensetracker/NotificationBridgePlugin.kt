package com.nothing.expensetracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

@CapacitorPlugin(name = "NotificationBridge")
class NotificationBridgePlugin : Plugin() {

    private lateinit var pendingQueue: PendingQueue
    private var receiver: BroadcastReceiver? = null

    override fun load() {
        super.load()
        pendingQueue = PendingQueue(context)
        
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                syncPending(null)
            }
        }
        val filter = IntentFilter("com.nothing.expensetracker.NEW_TRANSACTION")
        // Register receiver for background broadcast to push to frontend
        context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED ?: 0)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        receiver?.let { context.unregisterReceiver(it) }
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(context)
        val isGranted = enabledListeners.contains(context.packageName)
        val ret = JSObject()
        ret.put("granted", isGranted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun checkOverlayPermission(call: PluginCall) {
        val isGranted = Settings.canDrawOverlays(context)
        val ret = JSObject()
        ret.put("granted", isGranted)
        call.resolve(ret)
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun syncPending(call: PluginCall?) {
        val pending = pendingQueue.getPending()
        if (pending.isNotEmpty()) {
            val arr = JSArray()
            pending.forEach { arr.put(it.toJson()) }
            val ret = JSObject()
            ret.put("transactions", arr)
            notifyListeners("onPendingTransactions", ret)
        }
        call?.resolve()
    }

    @PluginMethod
    fun syncSaved(call: PluginCall) {
        val saved = pendingQueue.getSavedQueue()
        val arr = JSArray()
        saved.forEach { arr.put(it.toJson()) }
        
        // Clear them since we are passing them to React to save
        if (saved.isNotEmpty()) {
            pendingQueue.clearSavedQueue(saved.map { it.id })
        }
        
        val ret = JSObject()
        ret.put("transactions", arr)
        call.resolve(ret)
    }

    @PluginMethod
    fun acknowledge(call: PluginCall) {
        val idsArray = call.getArray("ids") ?: JSONArray()
        val ids = mutableListOf<String>()
        for (i in 0 until idsArray.length()) {
            ids.add(idsArray.getString(i))
        }
        pendingQueue.acknowledge(ids)
        call.resolve()
    }

    @PluginMethod
    fun scheduleBackup(call: PluginCall) {
        val frequencyHours = call.getInt("frequencyHours") ?: 24
        
        val constraints = androidx.work.Constraints.Builder()
            .setRequiresStorageNotLow(true)
            .build()
            
        val workRequest = androidx.work.PeriodicWorkRequestBuilder<com.nothing.expensetracker.backup.BackupWorker>(
            frequencyHours.toLong(),
            java.util.concurrent.TimeUnit.HOURS
        )
        .setConstraints(constraints)
        .build()
        
        androidx.work.WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "ExpenseTrackerBackup",
            androidx.work.ExistingPeriodicWorkPolicy.UPDATE,
            workRequest
        )
        
        call.resolve()
    }

    @PluginMethod
    fun cancelBackup(call: PluginCall) {
        androidx.work.WorkManager.getInstance(context).cancelUniqueWork("ExpenseTrackerBackup")
        call.resolve()
    }
}
