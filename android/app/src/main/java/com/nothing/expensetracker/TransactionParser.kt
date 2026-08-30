package com.nothing.expensetracker

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.regex.Pattern
import kotlin.math.roundToLong

object TransactionParser {

    private data class ParsedMatch(
        val type: String,
        val amountStr: String,
        val counterparty: String?,
        val referenceId: String?
    )

    private val rules = listOf(
        // FIRST PRIORITY: Explicit CREDIT patterns
        // 1a. "[person] paid you [amount]" (e.g. "DEVIKA SUNIL paid you 10.00")
        Pattern.compile("(?i)([a-zA-Z0-9\\s]+?)\\s+paid\\s+you\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(2), m.group(1).trim(), null)
        },
        // 1b. "[amount] [paid/sent] to you/me"
        Pattern.compile("(?i)(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?\\s+(?:paid|sent)\\s+to\\s+(?:you|me)(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(1), null, null)
        },
        // 1c. "[person] paid/sent [amount] to you"
        // Example: "Wafaa'♡ sent ₹10.00 to You"
        // Example: "Devika paid ₹100 to you"
        Pattern.compile(
            "(?i)(.+?)\\s+(?:paid|sent)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?\\s+to\\s+(?:you|me)(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)"
        ) to { m: java.util.regex.Matcher ->
            ParsedMatch(
                "credit",
                m.group(2),
                m.group(1).trim(),
                null
            )
        },
        // 2. "received [amount] from [person]"
        Pattern.compile("(?i)received\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?\\s+from\\s+([a-zA-Z0-9\\s]+?)(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(1), m.group(2).trim(), null)
        },

        // THEN PRIORITY: Bank CREDITS
        // 3a. Bank Credit with Ref and Counterparty (e.g. "credited by Rs.2.00 ... transfer from Google Play Ref No 390906542256")
        Pattern.compile("(?i)credited\\s*(?:by|with|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?.*?from\\s+([a-zA-Z0-9\\s]+?)\\s+(?:ref\\s*no|refno|ref|upi\\s+ref|txn)\\s*([a-zA-Z0-9]+)") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(1), m.group(2).trim(), m.group(3))
        },
        // 3b. Bank Credit with Ref only
        Pattern.compile("(?i)credited\\s*(?:by|with|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?.*?(?:ref\\s*no|refno|ref|upi\\s+ref|txn)\\s*([a-zA-Z0-9]+)") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(1), null, m.group(2))
        },
        // 3c. Generic Bank Credit fallback
        Pattern.compile("(?i)credited\\s*(?:by|with|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?") to { m: java.util.regex.Matcher ->
            ParsedMatch("credit", m.group(1), null, null)
        },

        // THEN PRIORITY: Explicit DEBIT patterns
        // 4a. "[paid/sent] [amount] to [person]"
        Pattern.compile("(?i)(?:paid|sent)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?\\s+to\\s+([a-zA-Z0-9\\s]+?)(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(1), m.group(2).trim(), null)
        },
        // 4b. "[amount] [paid/sent] to [person]" (Handles "₹500 sent to emil jinu")
        Pattern.compile("(?i)(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?\\s+(?:paid|sent)\\s+to\\s+([a-zA-Z0-9\\s]+?)(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(1), m.group(2).trim(), null)
        },
        // 4c. "paid [person] [amount]"
        Pattern.compile("(?i)paid\\s+([a-zA-Z0-9\\s]+?)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(2), m.group(1).trim(), null)
        },

        // THEN PRIORITY: Bank DEBITS
        // 5a. Bank Debit with Ref and Counterparty (e.g. "debited by 2.00 ... trf to Google Play Refno 390802712256")
        Pattern.compile("(?i)debited\\s*(?:by|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?.*?to\\s+([a-zA-Z0-9\\s]+?)\\s+(?:ref\\s*no|refno|ref|upi\\s+ref|txn)\\s*([a-zA-Z0-9]+)") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(1), m.group(2).trim(), m.group(3))
        },
        // 5b. Bank Debit with Ref only
        Pattern.compile("(?i)debited\\s*(?:by|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?.*?(?:ref\\s*no|refno|ref|upi\\s+ref|txn)\\s*([a-zA-Z0-9]+)") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(1), null, m.group(2))
        },
        // 5c. Generic Bank Debit fallback
        Pattern.compile("(?i)debited\\s*(?:by|for)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?") to { m: java.util.regex.Matcher ->
            ParsedMatch("debit", m.group(1), null, null)
        }
    )

    fun parse(title: String, text: String, sourceApp: String, postTime: Long): TransactionCandidate? {
        val fullText = "$title $text".replace("\n", " ").replace(Regex("\\s+"), " ")

        // First pass: Skip obvious non-financial messages like OTPs
        if (fullText.contains("OTP", ignoreCase = true) && !fullText.contains("debited", ignoreCase = true)) {
            return null
        }

        var match: ParsedMatch? = null
        for ((pattern, extractor) in rules) {
            val matcher = pattern.matcher(fullText)
            if (matcher.find()) {
                try {
                    match = extractor(matcher)
                    break
                } catch (e: Exception) {
                    continue
                }
            }
        }

        if (match == null) return null

        val cleanAmount = match.amountStr.replace(",", "")
        val amountRupees = cleanAmount.toDoubleOrNull() ?: return null
        val amountPaise = (amountRupees * 100).roundToLong()

        // Ignore zero or extremely large false-positive amounts
        if (amountPaise <= 0) return null

        val isoFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        isoFormatter.timeZone = TimeZone.getTimeZone("UTC")
        val detectedAt = isoFormatter.format(Date(postTime))

        return TransactionCandidate(
            id = "cand_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10),
            type = match.type,
            amount = amountPaise,
            counterparty = match.counterparty,
            detectedAt = detectedAt,
            sourceApp = sourceApp,
            raw = fullText.trim(),
            referenceId = match.referenceId
        )
    }
}
