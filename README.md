<div align="center">

# FLOW

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![Status](https://img.shields.io/badge/status-active%20development-blue)](#project-status)
[![Built with Capacitor](https://img.shields.io/badge/built%20with-Capacitor-119EFF?logo=capacitor&logoColor=white)](#)

[![Download FLOW APK](https://img.shields.io/badge/Download-FLOW%20APK-success?style=for-the-badge&logo=android)](YOUR_GITHUB_RELEASE_URL)

</div>

<br/>

<div style="display:flex; align-items:center;">
<img src="resources/icon.png" align="left" width="120" hspace="15" vspace="10">

**FLOW** is a local-first expense tracker for Android built to remove the friction from everyday transaction tracking. Instead of relying on you to remember and manually re-enter every UPI payment or bank transfer, FLOW listens for relevant payment and banking notifications on your device, extracts the transaction details, and presents them to you for review — nothing is added to your ledger without your confirmation.

</div>

<br/>

> ⚠️ FLOW is not currently available on the Google Play Store. Download the latest build from the [Releases](YOUR_GITHUB_RELEASE_URL) page.

---

## Screenshots

> _Screenshot paths below are placeholders — replace with actual images once available in `docs/screenshots/`._

<div style="display:flex;">

<img src="docs/screenshots/home.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/add-expense.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/detection.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/budget.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/insights.png" width="19%">

</div>

---

## Why We Built FLOW

Traditional expense tracking puts the entire burden on the user's memory. The typical flow looks like this:

```
Payment
  ↓
Remember the transaction
  ↓
Open expense tracker
  ↓
Enter amount
  ↓
Enter person / merchant
  ↓
Choose category
  ↓
Save
```

That's a lot of steps for something that should take seconds — and in practice, most people abandon manual tracking within a few weeks because it simply doesn't scale to daily life.

FLOW starts from a different observation: **your phone already knows a payment happened.** Every UPI transaction, bank transfer, or card payment triggers a notification. So why re-enter what the phone already told you?

```
Payment
  ↓
Bank / payment notification
  ↓
FLOW detects the notification
  ↓
Transaction information is extracted
  ↓
User reviews the transaction
  ↓
User confirms
  ↓
Transaction is stored locally
```

Importantly, FLOW is **not** designed to silently log everything it sees. Detected transactions are surfaced for review, and nothing reaches your ledger without your explicit confirmation. The goal is to remove repetitive data entry — not your control over your own financial records.

---

## What is FLOW?

FLOW is a local-first Android expense tracker that combines manual entry with automatic transaction detection:

- Log manual expenses and credits (incoming money) directly.
- Automatically detect relevant payment/banking notifications on your device.
- Review, edit, or dismiss detected transactions before they're saved.
- Organize spending with categories, monthly budgets, and basic insights.
- Keep all ledger data stored locally on the device.
- Use the app without creating an account — no login required for core functionality.

---

## Why FLOW is Different

### Automatic Transaction Detection
FLOW can detect and parse relevant Android payment and banking notifications, reducing how often you need to manually type in a transaction.

### Review Before Save
Detected transactions land in a review step, not directly in your ledger. Nothing is recorded without confirmation.

### Local First
Your expense data is stored locally on your device rather than requiring a cloud account or remote server.

### Simple Expense Management
Expenses, credits, categories, budgets, and insights are all managed within a straightforward interface.

### User Control
FLOW assists with detection and extraction — you make the final call on what gets saved.

---

## Features

| Feature | Description |
|---|---|
| **Expense tracking** | Log manual expenses with amount, category, and description. |
| **Credit tracking** | Record incoming money such as salary or transfers. |
| **Account & cash balances** | Track balances separately across account-based and cash payments. |
| **Notification-based detection** | Automatically detect relevant payment/banking notifications. |
| **Transaction review** | Confirm, edit, or dismiss detected transactions before saving. |
| **Duplicate detection** | Avoid recording the same transaction twice. |
| **Categories** | Organize expenses and credits by category. |
| **Monthly budgets** | Set and track spending limits per month. |
| **Spending insights** | View basic breakdowns of your spending patterns. |
| **Expense history** | Browse past transactions. |
| **Local SQLite persistence** | All ledger data is stored in a local SQLite database. |
| **Backup & restore** | Export and re-import your data locally. |
| **Complete data reset** | Wipe all local data and start fresh. |

---

## How FLOW Works

### Manual Expense

```
Home
  ↓
Add Expense
  ↓
Enter Amount
  ↓
Select Person
  ↓
Select Category
  ↓
Add Description
  ↓
Select Payment Type
  ↓
Save
```

### Detected Transaction

```
Payment
  ↓
Android Notification
  ↓
Notification Listener
  ↓
Transaction Parsing
  ↓
Pending Transaction
  ↓
Review Overlay
  ↓
Confirm / Edit / Dismiss
  ↓
Local Ledger
```

---

## Automatic Transaction Detection

FLOW uses Android's `NotificationListenerService` to receive relevant notification events from payment and banking apps installed on the device. When a relevant notification arrives, FLOW attempts to extract:

- Transaction type (expense or credit)
- Amount
- Counterparty, where available
- Source application
- Detection timestamp
- Original notification text
- Reference ID, where available

Notification formats vary significantly between banks and payment providers, so parsing is rule-based and cannot guarantee correct extraction for every notification format. When parsing fails or is incomplete, the transaction is still surfaced for manual review and correction.

> **Planned:** more intelligent on-device transaction understanding. This is a future improvement and is **not** part of the current implementation.

---

## Transaction Confirmation

Every detected transaction goes through a review step before it becomes part of your ledger:

```
Notification
  ↓
Detected transaction
  ↓
Review
  ↓
Edit if necessary
  ↓
Confirm
  ↓
Save
```

This prevents incorrect or incomplete notification parsing from silently turning into a financial record. During review, you can edit fields such as:

- Amount
- Person / receiver
- Category
- Description
- Payment type
- Destination (for credits)

---

## Expenses, Credits and Balances

### Expenses
Both manually entered and automatically detected outgoing transactions.

### Credits
Incoming money such as salary, transfers, or refunds.

### Balance

```
Account Balance = Account Credits − Account Expenses
Cash Balance    = Cash Credits − Cash Expenses
Total Balance   = Account Balance + Cash Balance
```

---

## Budgets and Spending Insights

### Budget Calculation

```
Monthly Budget + Carry Forward = Available Budget
Available Budget − Current Spending = Remaining Budget
```

### Insights

- Top spending category
- Comparison with previous month
- Average daily spending

---

## Privacy and Data

- FLOW follows a **local-first** design — the expense ledger is stored on your device.
- No account is required for core usage.
- Notification access is required to enable automatic transaction detection.
- Granting notification access can expose notification content to the application — only enable this permission if you're comfortable with that trade-off.
- You control whether a detected transaction is actually saved to your ledger.
- Backup and restore are handled locally and remain under your control.

---

## Backup and Restore

FLOW supports local backup and restore via JSON export/import. A backup can include:

- Expenses
- Credits
- Categories
- Budget information
- Settings
- Schema version
- Export timestamp

Restore includes a preview step so you can review what will be imported before it's applied, rather than blindly merging in matching or duplicate records.

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS

### Mobile
- Capacitor
- Android

### Native Android
- Kotlin
- Android `NotificationListenerService`

### Storage
- SQLite
- Capacitor Preferences

### Capacitor Plugins
_List only the plugins actually present in `package.json` / `capacitor.config.ts`._

---

## Architecture

**Application layer:**

```
React UI
  ↓
State / Store
  ↓
Repository Layer
  ↓
SQLite Repository
  ↓
SQLite Database
```

**Notification detection layer:**

```
Android Notification
  ↓
Notification Listener
  ↓
Transaction Parser
  ↓
Pending Queue
  ↓
Capacitor Notification Bridge
  ↓
React Application
  ↓
Transaction Review
  ↓
SQLite
```

The React UI handles presentation and user interaction, the repository layer abstracts data access, and the SQLite database is the single source of truth for local persistence. On the native side, the notification listener captures relevant events, a parser extracts structured data, and a Capacitor bridge passes pending transactions into the React app for review.

---

## Project Structure

```
flow/
├── android/                # Native Android project (Capacitor shell)
│   └── app/
├── src/
│   ├── components/         # React UI components
│   ├── hooks/               # React hooks
│   ├── lib/
│   │   ├── database/        # SQLite access layer
│   │   └── repository/      # Data repositories
│   ├── plugins/             # Capacitor plugin bridges
│   └── routes/               # TanStack Router routes
├── public/
├── resources/                # App icons and static assets
├── capacitor.config.ts
├── package.json
└── ...
```

---

## Getting Started

### Requirements

- Node.js
- Android Studio
- Android SDK
- JDK compatible with the project's Gradle configuration
- An Android device or emulator for native testing

### Installation

```bash
npm install
```

### Run Web Version

```bash
npm run dev
```

### Build Web Version

```bash
npm run build
```

---

## Building the Android APK

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

The resulting debug APK is generated under `android/app/build/outputs/apk/debug/`.

---

## Installing the APK

1. Enable **Install from Unknown Sources** on your Android device (or allow it for your file manager/browser when prompted).
2. Transfer the generated `.apk` file to your device.
3. Open the file and follow the installation prompt.

---

## Testing / Current Validation

FLOW has been validated through:

- Production web build verification
- Capacitor synchronization checks
- Android Gradle build
- APK installation and manual testing on a second Android device
- Manual verification of core functionality (expenses, credits, budgets, notification detection, backup/restore)

There is currently no automated unit or integration test suite.

---

## Known Limitations

- Notification formats differ between banks and payment providers, so parsing accuracy varies.
- Automatic detection depends on the device's notification access permission being granted.
- Manufacturer-specific background restrictions (e.g. aggressive battery optimization) may affect notification listening reliability.
- The web version cannot reproduce Android's notification listener functionality.
- Current notification parsing is rule-based, not AI/ML-based.
- Not every transaction notification is guaranteed to parse correctly.

---

## Roadmap

**Current**
- [x] Manual expense tracking
- [x] Credit tracking
- [x] Budget tracking
- [x] Spending insights
- [x] Notification-based transaction detection
- [x] Transaction confirmation
- [x] Local SQLite persistence
- [x] Backup and restore

**Future**
- [ ] Support more notification formats
- [ ] Improve transaction categorization
- [ ] More advanced duplicate detection
- [ ] On-device intelligent transaction understanding
- [ ] Play Store release
- [ ] Automated tests

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the project
5. Build the Android app when relevant
6. Commit your changes
7. Open a pull request

### Issues
If you run into a bug, please open an issue with:

- A clear description of the problem
- Screenshots, if applicable
- Relevant logs
- Steps to reproduce

---

## License

FLOW is licensed under the [MIT License](LICENSE).

---

## Project Status

FLOW is currently an actively developed Android project/prototype. Core expense tracking, local persistence, budgeting, insights, backup/restore, and notification-based transaction detection are implemented. AI-assisted transaction understanding and a Play Store release are planned but not yet available.
