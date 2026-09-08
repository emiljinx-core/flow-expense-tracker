<div style="display:flex; align-items:center;">
<img src="resources/icon.png" align="left" width="100" hspace="15" vspace="10">

# FLOW

A transaction tells you where your money went. FLOW helps you remember why.

</div>
<br/>

[![Download FLOW APK](https://img.shields.io/badge/Download-FLOW%20APK-success?style=for-the-badge&logo=android)](https://github.com/emiljinx-core/flow-expense-tracker/blob/master/FLOW.apk)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![Status](https://img.shields.io/badge/status-active%20development-blue)](#project-status)
[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github)](https://github.com/emiljinx-core/flow-expense-tracker)

---

## Why FLOW?

Most banking and payment apps are good at telling you *how much* moved and *where* — something like:

> ₹500 — ABC Store

That's fine in the moment. But weeks later, that line tells you almost nothing. Was it groceries? A gift? A one-off? The amount and merchant survive; the reason doesn't.

FLOW was built to fix that gap — to turn a bare transaction into an expense record that still means something later. Everything else in the app grew out of that one idea: detecting transactions automatically so you don't have to re-enter them, letting you review and add context before they're saved, and organizing that context into categories, budgets, and insights.

---

## Screenshots

<div style="display:flex;">
<img src="docs/screenshots/home.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/add-expense.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/detection.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/budget.png" width="19%">
<img style="margin-left:10px;" src="docs/screenshots/insights.png" width="19%">
</div>

---

## What FLOW Does

FLOW combines manual expense entry with automatic notification-based detection. When a payment notification comes in, FLOW parses it and hands it to you for review — you confirm it, add a category and description, and it becomes a real expense record. From there, budgets and spending insights are built on top of that history.

## Key Features

| Feature | Description |
|---|---|
| Automatic transaction detection | Parses relevant payment/banking notifications on-device |
| Review before saving | Nothing is added to your ledger without confirmation |
| Expense tracking | Manual and detected expenses |
| Credit tracking | Incoming money — salary, transfers, refunds |
| Categories & descriptions | Add the context a raw transaction is missing |
| Budget tracking | Monthly budgets with carry-forward |
| Spending insights | Top categories, month-over-month trends |
| Duplicate detection | Avoids logging the same transaction twice |
| Local SQLite storage | All data lives on your device |
| Backup & restore | Local, user-controlled JSON export/import |

---

## How It Works

```
Bank / Payment Notification
        ↓
Android Notification Listener
        ↓
Transaction Detection
        ↓
User Review
        ↓
Add Context / Category / Description
        ↓
Save to Local Ledger
        ↓
History / Budget / Insights
```

Detected transactions aren't added blindly — they wait for review, where you can confirm, edit, or dismiss them before anything is saved.

---

## Privacy

FLOW is local-first. Expense data is stored on-device using SQLite, and there's no server-side database. Notification access is required for automatic detection, and granting it can expose notification content to the app — only enable it if you're comfortable with that trade-off.

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS
**Mobile:** Capacitor, Android, Kotlin
**Storage:** SQLite, Capacitor Preferences

---

## Project Structure

```
flow/
├── android/
│   └── app/
│       └── src/main/java/com/nothing/expensetracker/
│           ├── ExpenseNotificationService.kt
│           ├── TransactionParser.kt
│           ├── NotificationBridgePlugin.kt
│           └── TransactionOverlayService.kt
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── database/
│   │   └── repository/
│   ├── plugins/
│   └── routes/
│
├── resources/
├── capacitor.config.ts
├── package.json
└── vite.config.ts
```

---

## Getting Started

```bash
npm install
npm run dev
```

Bun works too, if you'd rather use it (`bun.lock` is included):

```bash
bun install
bun run dev
```

## Building the Android APK

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Download

**[⬇ Download FLOW APK](https://github.com/emiljinx-core/flow-expense-tracker/blob/master/FLOW.apk)**

FLOW isn't on the Play Store — grab the latest APK directly from this repository (Releases coming soon).

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the application
5. Submit a pull request

## License

FLOW is licensed under the [MIT License](LICENSE).

## Project Status

FLOW is an actively developed Android project/prototype. Core tracking, detection, budgets, and insights are implemented; expect rough edges.
