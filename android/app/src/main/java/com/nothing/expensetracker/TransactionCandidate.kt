package com.nothing.expensetracker

import org.json.JSONObject

data class TransactionCandidate(
    val id: String,
    val type: String, // "debit" | "credit"
    val amount: Long, // in paise
    val counterparty: String?,
    val detectedAt: String,
    val sourceApp: String,
    val suggestedCategory: String? = null,
    val suggestedDescription: String? = null,
    val raw: String,
    val referenceId: String? = null, // New field for deduplication
    val paymentSource: String? = null
) {
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("id", id)
        json.put("type", type)
        json.put("amount", amount)
        json.put("counterparty", counterparty ?: JSONObject.NULL)
        json.put("detectedAt", detectedAt)
        json.put("sourceApp", sourceApp)
        json.put("suggestedCategory", suggestedCategory ?: JSONObject.NULL)
        json.put("suggestedDescription", suggestedDescription ?: JSONObject.NULL)
        json.put("raw", raw)
        json.put("referenceId", referenceId ?: JSONObject.NULL)
        json.put("paymentSource", paymentSource ?: JSONObject.NULL)
        return json
    }

    companion object {
        fun fromJson(jsonStr: String): TransactionCandidate {
            val json = JSONObject(jsonStr)
            return TransactionCandidate(
                id = json.getString("id"),
                type = json.getString("type"),
                amount = json.getLong("amount"),
                counterparty = if (json.isNull("counterparty")) null else json.getString("counterparty"),
                detectedAt = json.getString("detectedAt"),
                sourceApp = json.getString("sourceApp"),
                suggestedCategory = if (json.isNull("suggestedCategory")) null else json.getString("suggestedCategory"),
                suggestedDescription = if (json.isNull("suggestedDescription")) null else json.getString("suggestedDescription"),
                raw = json.getString("raw"),
                referenceId = if (json.isNull("referenceId")) null else json.getString("referenceId"),
                paymentSource = if (json.isNull("paymentSource") || !json.has("paymentSource")) null else json.getString("paymentSource")
            )
        }
    }
}
