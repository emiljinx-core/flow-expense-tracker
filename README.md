<p align="center">
  <img src="resources/icon.png" width="120" alt="FLOW" />
</p>

<h1 align="center">FLOW</h1>

<p align="center">
  A local-first, monochrome expense tracker for Android — logging not just <i>how much</i> you spent, but <i>why</i>.
</p>

<p align="center">
  <a href="https://github.com/emiljinx-core/flow-expense-tracker/releases"><img src="https://img.shields.io/github/v/release/emiljinx-core/flow-expense-tracker?include_prereleases&label=version&sort=semver&style=flat-square&color=black" alt="Latest release"></a>
  &nbsp;
  <a href="https://github.com/emiljinx-core/flow-expense-tracker/stargazers"><img src="https://img.shields.io/github/stars/emiljinx-core/flow-expense-tracker?style=flat-square&color=black" alt="Stars"></a>
  &nbsp;
  <a href="https://github.com/emiljinx-core/flow-expense-tracker/issues"><img src="https://img.shields.io/github/issues/emiljinx-core/flow-expense-tracker?style=flat-square&color=black" alt="Issues"></a>
  &nbsp;
  <a href="#-license"><img src="https://img.shields.io/badge/license-none%20yet-lightgrey?style=flat-square" alt="License: none yet"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor">
  <img src="https://img.shields.io/badge/SQLite-local--first-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
</p>

<p align="center">
  <a href="https://github.com/emiljinx-core/flow-expense-tracker/releases"><img src="https://img.shields.io/badge/Download-FLOW.apk-000000?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" height="40"></a>
</p>

<p align="center">
  <i>🎥 Demo video coming soon — will be embedded here.</i>
</p>

---

## 🖼️ Screenshots

<p align="center">
  <img src="docs/screenshots/home.png" width="19%">
  <img src="docs/screenshots/add-expense.png" width="19%">
  <img src="docs/screenshots/detection.png" width="19%">
  <img src="docs/screenshots/budget.png" width="19%">
  <img src="docs/screenshots/insights.png" width="19%">
</p>

*(add your five screenshots to `docs/screenshots/` with these filenames, or update the paths above)*

---

## Table of Contents

- [Overview](#overview)
- [Features](#-features)
- [Core Workflow](#core-workflow)
- [Automatic Transaction Detection](#automatic-transaction-detection-detail)
- [Transaction Confirmation](#transaction-confirmation-detail)
- [Expense and Credit Management](#expense-and-credit-management)
- [Budget Tracking](#budget-tracking-detail)
- [Spending Insights](#spending-insights-detail)
- [History and Categories](#history-and-categories)
- [Backup and Restore](#backup-and-restore-detail)
- [Local Data Storage](#local-data-storage)
- [Privacy](#-privacy)
- [Tech Stack](#-tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Android Notification Flow](#android-notification-flow)
- [Getting Started](#-getting-started)
- [Building the Android APK](#building-the-android-apk)
- [Installing the APK](#installing-the-apk)
- [Testing](#testing)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)
- [Star History](#-star-history)
- [Project Status](#-project-status)

---

## Overview

FLOW is a local expense ledger with Android transaction detection.

The main detection workflow is:

```
Payment / Bank Notification
          |
          v
Android Notification Listener
          |
          v
Native Notification Bridge
          |
          v
Pending Transaction Queue
          |
          v
FLOW Transaction Overlay
          |
          v
User Reviews / Edits
          |
          v
Local SQLite Storage
          |
          v
Expenses / Credits / Budgets / Insights
```

FLOW supports both manual entries and detected transactions. Detected transactions are presented for review before being stored by the React application.

---

## ✨ Features

| | |
|---|---|
| 💸 **Expense Tracking** | Add, edit, delete — full control over every entry |
| 💰 **Credit Tracking** | Log salary & transfers into Account or Cash |
| 🔔 **Auto-Detection** | Reads bank/payment notifications, no manual entry needed |
| ✅ **Confirm-Before-Save** | Nothing hits your ledger without your review |
| 🧭 **Duplicate Detection** | Warns you before you log the same spend twice |
| 📊 **Budget Tracking** | Monthly limits, carry-forward, overspend alerts |
| 📈 **Spending Insights** | Top category, month-over-month trends, daily average |
| 🗄️ **Backup & Restore** | Local JSON export/import with a restore preview |
| 🧹 **One-Tap Reset** | Wipe the ledger, keep the app |

### Expense Tracking

- Add expenses manually
- Edit existing expenses
- Delete expenses
- Store amount, receiver, category, description, payment source, timestamp, origin, and source application

### Credit Tracking

FLOW records incoming money such as salary or transfers. Credits can be assigned to:

- Account
- Cash

The balance is calculated from credits minus expenses.

### Automatic Transaction Detection

On Android, FLOW can receive supported transaction notifications and extract information such as:

- Transaction type
- Amount
- Counterparty
- Source application
- Suggested category
- Suggested description
- Detection timestamp
- Original notification text

### Transaction Confirmation

Detected transactions appear in a confirmation overlay where the user can review or edit:

- Amount
- Person / receiver
- Category
- Description
- Payment type / destination

Nothing is saved until the transaction is confirmed.

### Duplicate Detection

The transaction overlay checks for possible duplicates using the transaction amount and a short time window, then warns the user when a similar transaction was recently recorded.

### Budget Tracking

FLOW supports:

- Monthly budgets
- Current-month spending
- Remaining budget
- Overspending detection
- Budget percentage
- Carry-forward calculations
- Budget history

### Spending Insights

The application calculates:

- Top spending category
- Increase/decrease compared with the previous month
- Average daily spending

### Backup and Restore

FLOW supports local JSON backup and restoration of application data, including expenses, credits, categories, budget information, and settings. A restore preview identifies incoming records before they are imported.

### Data Reset

The Settings section includes a **Clear all data** action. It removes stored ledger data and restores the default categories so the application returns to a clean, new-app state.

---

## Core Workflow

**Manual Expense**

```
Home
  ↓
Add expense
  ↓
Enter amount
  ↓
Select receiver/person
  ↓
Select category
  ↓
Add description
  ↓
Select payment type
  ↓
Save
```

**Manual Credit**

```
Home
  ↓
Add amount
  ↓
Enter amount
  ↓
Select destination
  ↓
Add source/note
  ↓
Save
```

**Detected Transaction**

```
Payment notification
        ↓
Android detection
        ↓
Pending transaction
        ↓
Transaction overlay
        ↓
Review / edit
        ↓
Save or dismiss
```

---

## Automatic Transaction Detection (Detail)

Android transaction detection is handled outside the normal React UI layer.

The application uses a native notification listener and communicates detected transactions to the React layer through a Capacitor bridge.

Native monetary values are represented in paise and converted to rupees at the React UI boundary.

Example:

```
50000 paise
    ↓
₹500
```

Using integer paise in the persistence layer avoids common floating-point precision problems when storing monetary values.

---

## Transaction Confirmation (Detail)

For **debit** transactions, the overlay can display:

- Amount
- Receiver
- Detection time
- Possible duplicate warning
- Category
- Description
- Payment type

For **credit** transactions, it can display:

- Amount
- Detection time
- Source/note
- Destination

The detected timestamp is retained when the transaction is saved.

---

## Expense and Credit Management

An expense contains fields such as:

```
Expense
├── id
├── amount
├── person
├── category
├── description
├── source
├── createdAt
├── origin
└── sourceApp
```

A credit contains:

```
Credit
├── id
├── amount
├── target
├── note
├── createdAt
├── origin
└── sourceApp
```

The `origin` field distinguishes:

- `manual`
- `detected`

### Balance Calculation

```
Account Balance
= Account Credits - Account Expenses

Cash Balance
= Cash Credits - Cash Expenses

Total Balance
= Account Balance + Cash Balance
```

---

## Budget Tracking (Detail)

The budget system calculates available money using the monthly budget and carry-forward information.

Conceptually:

```
Available Budget
= Monthly Budget + Carry Forward

Remaining
= Available Budget - Current Month Spending
```

The UI indicates whether the user is within budget or over budget.

---

## Spending Insights (Detail)

FLOW derives basic insights from locally stored expenses.

**Top Category** — The category with the highest spending during the current month.

**Change vs Previous Month** — Category spending is compared with the previous month.

**Average Daily Spend**

```
Current Month Spending
----------------------
Number of Active Days
```

---

## History and Categories

The history section displays recorded expenses and provides access to individual expense details.

The default categories are:

- Food
- Transport
- Shopping
- Education
- Bills

Users can add custom categories. The **Clear all data** action removes custom ledger data and restores these default categories.

---

## Backup and Restore (Detail)

### Backup

The application serializes the current state into JSON. The backup can contain:

- Expenses
- Credits
- Categories
- Monthly budget
- Budget history
- Settings
- Schema version
- Export timestamp

### Restore

Before importing a backup, FLOW creates a restore preview. The preview can identify:

- New expenses
- Existing expenses
- New credits
- New categories
- Existing categories
- Budget availability

The restore process avoids blindly importing matching duplicate records.

---

## Local Data Storage

FLOW uses a local-first persistence model.

On Android, ledger data is stored using SQLite through Capacitor Community SQLite.

The database is:

```
expense_tracker.db
```

The database contains tables for:

- `expenses`
- `credits`
- `categories`
- `budget_history`
- `monthly_budget`

Application settings are stored using Capacitor Preferences.

Monetary values are stored as integer paise in SQLite.

Example:

```
₹500.00 → 50000
```

---

## 🔐 Privacy

FLOW is designed around local storage.

The current application does not use a server-side ledger database or application account for storing the user's expense data.

Notification access is required for automatic transaction detection. Because notification access can expose payment-related notification content to the application, users should grant this permission only when they are comfortable doing so.

---

## 🧰 Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS

**Mobile**
- Capacitor
- Android

**Storage**
- SQLite
- Capacitor Preferences

**Native Plugins**

The Android build currently uses:

- `@capacitor-community/sqlite`
- `@capacitor/filesystem`
- `@capacitor/preferences`
- `@capacitor/share`

**UI**

The application uses a custom monochrome technical design system with compact controls, technical labels, numerical displays, borders, and minimal visual elements.

---

## Architecture

The application separates UI, state management, and persistence.

```
React UI
   |
   v
Store / State Layer
   |
   v
Repository Abstraction
   |
   +-----------------------+
   |                       |
   v                       v
SQLiteRepository      WebMockRepository
   |                       |
   v                       v
SQLite DB              Web storage
```

On Android, the repository resolves to the SQLite implementation. In the web environment, the web repository implementation is used. This keeps persistence details separate from the UI.

---

## Project Structure

A simplified project structure is:

```
flow/
├── android/
│   └── app/
│       └── src/
│           └── main/
│               └── java/com/nothing/expensetracker/
│                   ├── AppStateTracker.java
│                   ├── MainActivity.java
│                   ├── ExpenseNotificationService.kt
│                   ├── NotificationBridgePlugin.kt
│                   ├── TransactionParser.kt
│                   ├── TransactionOverlayService.kt
│                   ├── PendingQueue.kt
│                   └── backup/
│                       └── BackupWorker.kt
│
├── public/
│
├── resources/
│   └── icon.png
│
├── src/
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseSheets.tsx
│   │   └── DetectionOverlay.tsx
│   │
│   ├── hooks/
│   │   ├── use-backup-manager.ts
│   │   └── use-notification-listener.ts
│   │
│   ├── lib/
│   │   ├── store.tsx
│   │   ├── types.ts
│   │   ├── format.ts
│   │   ├── utils.ts
│   │   ├── database/
│   │   └── repository/
│   │       ├── SQLiteRepository.ts
│   │       ├── WebMockRepository.ts
│   │       ├── types.ts
│   │       ├── money.ts
│   │       └── index.ts
│   │
│   ├── plugins/
│   │   ├── backup-manager/
│   │   └── notification-listener/
│   │
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── landing.tsx
│   │   ├── home.tsx
│   │   ├── budget.tsx
│   │   ├── history.tsx
│   │   ├── insights.tsx
│   │   └── settings.tsx
│   │
│   ├── capacitor-main.tsx
│   ├── main.tsx
│   ├── router.tsx
│   └── styles.css
│
├── capacitor.config.ts
├── capacitor.vite.config.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── index.html
└── FLOW.apk
```

The exact structure can change as development continues.

---

## Android Notification Flow

The Android-specific flow is conceptually:

```
Android Notification
        |
        v
Notification Listener
        |
        v
Transaction Parsing
        |
        v
Native Pending Queue
        |
        v
NotificationBridge
        |
        v
React Store
        |
        v
TransactionOverlay
```

After a transaction has been processed or dismissed, the application acknowledges it through the native bridge so it is not repeatedly presented as pending.

---

## 🚀 Getting Started

### Requirements

- Node.js
- npm or Bun
- Android Studio
- Android SDK
- JDK compatible with the project's Gradle configuration
- Capacitor CLI

For Android testing:

- Android device or emulator
- USB debugging enabled when deploying directly to a physical device

### Install Dependencies

From the project root:

```bash
git clone https://github.com/emiljinx-core/flow-expense-tracker.git
cd flow-expense-tracker
npm install
```

If the project is managed with Bun, Bun commands can be used instead.

### Running the Web Version

Start the development server:

```bash
npm run dev
```

Vite will provide a local development URL.

### Production Web Build

Create a production build with:

```bash
npm run build
```

The generated files are placed in `dist/`.

---

## Building the Android APK

**1. Build the web application**

```bash
npm run build
```

**2. Sync with Android**

```bash
npx cap sync android
```

If using Bun:

```bash
bun run cap sync android
```

**3. Build the debug APK**

From the `android` directory:

```bash
.\gradlew.bat assembleDebug
```

The APK will be generated at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Create a Convenient Copy

From the project root:

```powershell
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" ".\FLOW.apk"
```

This creates `FLOW.apk` in the project root.

Alternatively, grab a pre-built APK directly from the [Releases page](https://github.com/emiljinx-core/flow-expense-tracker/releases) — no build required.

---

## Installing the APK

The APK can be transferred to another Android phone using USB, cloud storage, or a messaging/file-transfer application.

Android may require permission to install applications from the source used to open the APK.

After installation, open FLOW and configure the required Android notification access if automatic transaction detection is being used.

---

## Testing

The current development build has been tested through the following workflow:

1. Production web build completed successfully.
2. Capacitor Android synchronization completed successfully.
3. Android debug APK built successfully with Gradle.
4. The resulting APK was installed on a second Android device.
5. Core application functionality was tested on that device.
6. The application was confirmed to work on the second device.

The Android Gradle build completed with:

```
BUILD SUCCESSFUL
```

---

## ⚠️ Known Limitations

**Notification Parsing**
Transaction detection depends on the structure and content of notifications generated by payment and banking applications. Different applications can use different notification formats, so detection and parsing may not be identical across every provider.

**Android Permissions**
Automatic transaction detection requires the appropriate Android notification access. If access is disabled, automatic detection will not work.

**Device-Specific Background Behavior**
Android manufacturers can apply battery optimization and background restrictions that affect notification listener behavior.

**Web Environment**
The browser version cannot reproduce all native Android notification functionality.

---

## 🔮 Future Improvements

- Support for additional banking and payment notification formats
- More robust transaction parsing
- Improved transaction categorization
- More advanced duplicate detection
- More detailed spending analytics
- Additional backup/export formats
- Automated backup workflows
- Improved onboarding
- Better Android permission guidance
- Signed production APK releases
- Automated unit and integration tests

These are potential future improvements and are not necessarily part of the current release.

---

## 🤝 Contributing

A typical development workflow is:

1. Fork the [repository](https://github.com/emiljinx-core/flow-expense-tracker)
2. Create a feature branch
3. Make your changes
4. Run the application
5. Run the production build
6. Test Android functionality when relevant
7. Commit the changes
8. Open a pull request

Before submitting changes, ensure that the project still builds successfully. Bug reports and feature ideas are welcome via [Issues](https://github.com/emiljinx-core/flow-expense-tracker/issues).

---

## 📄 License

This project does not currently have a license file. Without one, default copyright applies and no permissions are granted to reuse, modify, or redistribute this code beyond viewing it on GitHub.

A license (e.g. MIT, Apache-2.0, GPLv3) will be added in a future update.

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=emiljinx-core/flow-expense-tracker&type=Date)](https://star-history.com/#emiljinx-core/flow-expense-tracker&Date)

---

## 🚦 Project Status

> Functional Android prototype — actively evolving, not yet a stable release.

Current functionality includes:

- Local expense tracking
- Credit tracking
- Account and cash balances
- Budget tracking
- Spending insights
- Expense history
- Categories
- Backup and restore
- Android notification-based transaction detection
- Transaction confirmation
- Local SQLite persistence
- Complete data reset
- Android APK generation

The current APK has been successfully built and tested on a second Android device.
