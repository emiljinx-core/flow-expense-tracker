package com.nothing.expensetracker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

class PendingQueue(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ExpenseTracker_PendingQueue", Context.MODE_PRIVATE)
    private val MAX_QUEUE_SIZE = 100

    @Synchronized
    fun enqueue(candidate: TransactionCandidate) {
        val queue = getQueue()
        
        // Prevent duplicates in queue by ID
        if (queue.any { it.id == candidate.id }) {
            return
        }

        queue.add(candidate)
        
        // Preserve FIFO bounded size
        while (queue.size > MAX_QUEUE_SIZE) {
            queue.removeAt(0)
        }

        saveQueue(queue)
    }

    @Synchronized
    fun getPending(): List<TransactionCandidate> {
        return getQueue()
    }

    @Synchronized
    fun acknowledge(candidateIds: List<String>) {
        val queue = getQueue()
        val initialSize = queue.size
        queue.removeAll { candidateIds.contains(it.id) }
        
        if (queue.size != initialSize) {
            saveQueue(queue)
        }
    }

    private fun getQueue(): MutableList<TransactionCandidate> {
        val jsonStr = prefs.getString("queue", "[]") ?: "[]"
        val list = mutableListOf<TransactionCandidate>()
        try {
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                try {
                    list.add(TransactionCandidate.fromJson(obj.toString()))
                } catch (e: Exception) {
                    // Handle malformed safely by skipping
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    private fun saveQueue(queue: List<TransactionCandidate>) {
        val arr = JSONArray()
        queue.forEach {
            try {
                arr.put(it.toJson())
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        prefs.edit().putString("queue", arr.toString()).apply()
    }

    // --- Saved Queue for Native background saves ---
    
    @Synchronized
    fun enqueueSaved(candidate: TransactionCandidate) {
        val queue = getSavedQueue()
        if (queue.any { it.id == candidate.id }) {
            return
        }
        queue.add(candidate)
        while (queue.size > MAX_QUEUE_SIZE) {
            queue.removeAt(0)
        }
        saveSavedQueue(queue)
    }

    @Synchronized
    fun getSavedQueue(): MutableList<TransactionCandidate> {
        val jsonStr = prefs.getString("saved_queue", "[]") ?: "[]"
        val list = mutableListOf<TransactionCandidate>()
        try {
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                try {
                    list.add(TransactionCandidate.fromJson(obj.toString()))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    @Synchronized
    fun clearSavedQueue(candidateIds: List<String>) {
        val queue = getSavedQueue()
        val initialSize = queue.size
        queue.removeAll { candidateIds.contains(it.id) }
        
        if (queue.size != initialSize) {
            saveSavedQueue(queue)
        }
    }

    private fun saveSavedQueue(queue: List<TransactionCandidate>) {
        val arr = JSONArray()
        queue.forEach {
            try {
                arr.put(it.toJson())
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        prefs.edit().putString("saved_queue", arr.toString()).apply()
    }
}
