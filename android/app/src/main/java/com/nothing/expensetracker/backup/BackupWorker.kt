package com.nothing.expensetracker.backup

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.os.Environment
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*

class BackupWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    companion object {
        const val TAG = "BackupWorker"
        // Capacitor SQLite appends "SQLite.db" to the database name
        const val DB_NAME = "expense_tracker.dbSQLite.db"
        const val SCHEMA_VERSION = 1
    }

    override suspend fun doWork(): Result {
        return try {
            val dbFile = applicationContext.getDatabasePath(DB_NAME)
            if (!dbFile.exists()) {
                Log.e(TAG, "Database file does not exist at ${dbFile.absolutePath}")
                return Result.failure()
            }

            val db = SQLiteDatabase.openDatabase(
                dbFile.absolutePath,
                null,
                SQLiteDatabase.OPEN_READONLY
            )

            val backupJson = JSONObject()
            backupJson.put("schemaVersion", SCHEMA_VERSION)
            backupJson.put("appVersion", "1.0.0")
            backupJson.put("createdAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { 
                timeZone = TimeZone.getTimeZone("UTC") 
            }.format(Date()))

            // 1. Serialize expenses
            val expensesArray = JSONArray()
            db.rawQuery("SELECT * FROM expenses", null).use { cursor ->
                while (cursor.moveToNext()) {
                    val obj = JSONObject()
                    obj.put("id", cursor.getString(cursor.getColumnIndexOrThrow("id")))
                    obj.put("amount", cursor.getLong(cursor.getColumnIndexOrThrow("amount")))
                    obj.put("person", cursor.getString(cursor.getColumnIndexOrThrow("person")))
                    obj.put("category", cursor.getString(cursor.getColumnIndexOrThrow("category")))
                    obj.put("description", cursor.getString(cursor.getColumnIndexOrThrow("description")))
                    obj.put("source", cursor.getString(cursor.getColumnIndexOrThrow("source")))
                    obj.put("createdAt", cursor.getString(cursor.getColumnIndexOrThrow("created_at")))
                    obj.put("origin", cursor.getString(cursor.getColumnIndexOrThrow("origin")))
                    
                    val sourceAppIdx = cursor.getColumnIndexOrThrow("source_app")
                    if (!cursor.isNull(sourceAppIdx)) {
                        obj.put("sourceApp", cursor.getString(sourceAppIdx))
                    }
                    expensesArray.put(obj)
                }
            }
            backupJson.put("expenses", expensesArray)

            // 2. Serialize credits
            val creditsArray = JSONArray()
            db.rawQuery("SELECT * FROM credits", null).use { cursor ->
                while (cursor.moveToNext()) {
                    val obj = JSONObject()
                    obj.put("id", cursor.getString(cursor.getColumnIndexOrThrow("id")))
                    obj.put("amount", cursor.getLong(cursor.getColumnIndexOrThrow("amount")))
                    obj.put("target", cursor.getString(cursor.getColumnIndexOrThrow("target")))
                    obj.put("note", cursor.getString(cursor.getColumnIndexOrThrow("note")))
                    obj.put("createdAt", cursor.getString(cursor.getColumnIndexOrThrow("created_at")))
                    obj.put("origin", cursor.getString(cursor.getColumnIndexOrThrow("origin")))
                    
                    val sourceAppIdx = cursor.getColumnIndexOrThrow("source_app")
                    if (!cursor.isNull(sourceAppIdx)) {
                        obj.put("sourceApp", cursor.getString(sourceAppIdx))
                    }
                    creditsArray.put(obj)
                }
            }
            backupJson.put("credits", creditsArray)

            // 3. Serialize categories
            val categoriesArray = JSONArray()
            db.rawQuery("SELECT * FROM categories", null).use { cursor ->
                while (cursor.moveToNext()) {
                    categoriesArray.put(cursor.getString(cursor.getColumnIndexOrThrow("name")))
                }
            }
            backupJson.put("categories", categoriesArray)

            // 4. Serialize budget history
            val historyArray = JSONArray()
            db.rawQuery("SELECT * FROM budget_history", null).use { cursor ->
                while (cursor.moveToNext()) {
                    val obj = JSONObject()
                    obj.put("month", cursor.getString(cursor.getColumnIndexOrThrow("month")))
                    obj.put("base", cursor.getLong(cursor.getColumnIndexOrThrow("base")))
                    obj.put("carryIn", cursor.getLong(cursor.getColumnIndexOrThrow("carry_in")))
                    obj.put("spent", cursor.getLong(cursor.getColumnIndexOrThrow("spent")))
                    historyArray.put(obj)
                }
            }
            backupJson.put("budgetHistory", historyArray)

            // 5. Serialize monthly budget
            db.rawQuery("SELECT amount FROM monthly_budget WHERE id = 1", null).use { cursor ->
                if (cursor.moveToFirst()) {
                    backupJson.put("monthlyBudget", cursor.getLong(cursor.getColumnIndexOrThrow("amount")))
                }
            }

            db.close()

            // Write to Documents directory
            val documentsDir = applicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                ?: return Result.failure()
                
            if (!documentsDir.exists()) {
                documentsDir.mkdirs()
            }

            val timestamp = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss", Locale.US).format(Date())
            val filename = "expense-tracker-backup-$timestamp.json"
            val backupFile = File(documentsDir, filename)

            FileWriter(backupFile).use { writer ->
                writer.write(backupJson.toString(2))
            }
            
            // Record successful backup time in SharedPreferences
            val prefs = applicationContext.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val settingsStr = prefs.getString("expense_tracker_settings", "{}")
            try {
                val settingsJson = JSONObject(settingsStr)
                settingsJson.put("lastBackupAt", backupJson.getString("createdAt"))
                prefs.edit().putString("expense_tracker_settings", settingsJson.toString()).apply()
            } catch (e: Exception) {
                // Ignore settings update failure
            }

            Result.success()

        } catch (e: Exception) {
            Log.e(TAG, "Backup failed", e)
            Result.retry()
        }
    }
}
