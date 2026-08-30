# FLOW

<p align="center">
  <img src="resources/icon.png" width="140" alt="FLOW Logo">
</p>

<h1 align="center">FLOW</h1>

<p align="center">
  <b>A local-first expense tracker for Android</b>
</p>

<p align="center">
  Track expenses. Detect transactions. Stay in control.
</p>

<p align="center">
  <a href="#download">Download</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Development</a>
</p>

---

## About

**FLOW** is a local-first expense tracker designed for Android.

Instead of requiring users to manually enter every transaction, FLOW can detect payment and banking notifications and turn them into **pending transactions** that the user can review before saving.

The goal is simple:

> **Your financial data stays on your device, while transaction tracking becomes almost effortless.**

FLOW currently focuses on:

- Fast manual expense tracking
- Credit/income tracking
- Automatic transaction detection
- Transaction confirmation
- Budget tracking
- Spending insights
- Local SQLite storage
- Local backup and restore

---

# Download

## Android APK

You can download the latest available APK directly from this repository:

<p align="center">

<a href="https://github.com/emiljinx-core/flow-expense-tracker/blob/master/FLOW.apk?raw=true">
  <img src="https://img.shields.io/badge/Download-FLOW%20APK-000000?style=for-the-badge&logo=android&logoColor=white" alt="Download FLOW APK">
</a>

</p>

Or download it from the repository:

**[Download FLOW.apk](https://github.com/emiljinx-core/flow-expense-tracker/blob/master/FLOW.apk?raw=true)**

> The current APK is a development/debug build. It is not currently distributed as a signed production release.

---

# Screenshots

<p align="center">
  <img src="docs/screenshots/home.png" width="18%" alt="FLOW Home">
  <img src="docs/screenshots/add-expense.png" width="18%" alt="Add Expense">
  <img src="docs/screenshots/detection.png" width="18%" alt="Transaction Detection">
  <img src="docs/screenshots/budget.png" width="18%" alt="Budget">
  <img src="docs/screenshots/insights.png" width="18%" alt="Insights">
</p>

---

# Features

| Feature | Description |
|---|---|
| **Expense Tracking** | Add, edit and delete expenses |
| **Credit Tracking** | Track incoming money such as salary and transfers |
| **Automatic Detection** | Detect supported payment/banking notifications |
| **Transaction Review** | Review detected transactions before saving |
| **Duplicate Detection** | Helps prevent recording the same transaction twice |
| **Budget Tracking** | Set monthly budgets and monitor spending |
| **Spending Insights** | View spending trends and category breakdowns |
| **Local Storage** | Store financial data locally using SQLite |
| **Backup & Restore** | Export and restore data using local JSON backups |
| **Cash & Account Balances** | Track money across different destinations |

---

# Automatic Transaction Detection

One of FLOW's main features is its Android notification detection system.

Instead of manually entering every payment:

```text
Payment
   ↓
Bank / Payment App
   ↓
Notification
   ↓
Android Notification Listener
   ↓
Transaction Parser
   ↓
Pending Transaction
   ↓
Review & Edit
   ↓
Save
