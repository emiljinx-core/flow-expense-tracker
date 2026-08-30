import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class TestRegex {
    public static void main(String[] args) {
        String[] fullTexts = {
            "Sent to You devika sunil paid you 10",
            " devika sunil paid you 10",
            "devika sunil paid you 10"
        };
        
        for (String fullText : fullTexts) {
            System.out.println("Text: '" + fullText + "'");
            Pattern pattern1a = Pattern.compile("(?i)([a-zA-Z0-9\\s]+?)\\s+paid\\s+you\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?");
            Matcher m1a = pattern1a.matcher(fullText);
            if (m1a.find()) {
                System.out.println("Match 1a: person=" + m1a.group(1) + ", amount=" + m1a.group(2));
            } else {
                System.out.println("No match 1a");
            }

            Pattern pattern4c = Pattern.compile("(?i)paid\\s+([a-zA-Z0-9\\s]+?)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)(?:\\s*rupees?)?(?:\\s+using|\\s+on|\\s+ref|\\s*-|\\s*$)");
            Matcher m4c = pattern4c.matcher(fullText);
            if (m4c.find()) {
                System.out.println("Match 4c: person=" + m4c.group(1) + ", amount=" + m4c.group(2));
            } else {
                System.out.println("No match 4c");
            }
            System.out.println("---");
        }
    }
}
