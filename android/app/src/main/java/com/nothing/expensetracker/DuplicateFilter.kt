package com.nothing.expensetracker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import java.security.MessageDigest

class DuplicateFilter(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ExpenseTracker_Duplicates", Context.MODE_PRIVATE)
    private val MAX_HISTORY = 50

    fun isDuplicate(candidate: TransactionCandidate): Boolean {
        val hash = generateHash(candidate)
        val history = getHistory()

        if (history.contains(hash)) {
            return true
        }

        history.add(hash)
        if (history.size > MAX_HISTORY) {
            history.removeAt(0)
        }
        saveHistory(history)
        return false
    }

    private fun generateHash(candidate: TransactionCandidate): String {
        // Primary deduplication: Reference ID
        if (!candidate.referenceId.isNullOrEmpty()) {
            return "REF:${candidate.referenceId}"
        }

        // Fallback: Composite Fingerprint
        // We round the timestamp to the nearest minute to handle slight delays in multi-delivery
        val minuteTimestamp = try {
            val iso = candidate.detectedAt // "2023-10-01T10:00:15.123Z"
            iso.substring(0, 16) // "2023-10-01T10:00"
        } catch (e: Exception) {
            candidate.detectedAt
        }

        val rawStr = "${candidate.amount}|${candidate.type}|${candidate.sourceApp}|${candidate.counterparty ?: ""}|$minuteTimestamp"
        
        val bytes = MessageDigest.getInstance("SHA-256").digest(rawStr.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun getHistory(): MutableList<String> {
        val jsonStr = prefs.getString("history", "[]") ?: "[]"
        val arr = JSONArray(jsonStr)
        val list = mutableListOf<String>()
        for (i in 0 until arr.length()) {
            list.add(arr.getString(i))
        }
        return list
    }

    private fun saveHistory(history: List<String>) {
        val arr = JSONArray(history)
        prefs.edit().putString("history", arr.toString()).apply()
    }
}
