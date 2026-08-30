import java.util.regex.Pattern

fun main() {
    val fullText = "Sent to You devika sunil paid you 10"
    
    val pattern1a = Pattern.compile("(?i)([a-zA-Z0-9\\s]+?)\\s+paid\\s+you\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?")
    val m1a = pattern1a.matcher(fullText)
    if (m1a.find()) {
        println("Match 1a: person=${m1a.group(1)}, amount=${m1a.group(2)}")
    } else {
        println("No match 1a")
    }

    val pattern4c = Pattern.compile("(?i)paid\\s+([a-zA-Z0-9\\s]+?)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)")
    val m4c = pattern4c.matcher(fullText)
    if (m4c.find()) {
        println("Match 4c: person=${m4c.group(1)}, amount=${m4c.group(2)}")
    } else {
        println("No match 4c")
    }
}
