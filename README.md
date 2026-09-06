<div align="center">

# 📖 Digital Khata (डिजिटल खाता)
### *Enterprise-Grade, Offline-First Digital Business Ledger & Credit Book*

[![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_APK-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB_Local-10B981?style=for-the-badge&logo=dexie&logoColor=white)](https://dexie.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/Yugpatel-09/Digital-Khata/actions)

<p align="center">
  A high-performance, mobile-native bookkeeping web and Android application designed for merchants, shopkeepers, and businesses to track credit (<b>Udhaar / You Gave</b>), payments (<b>Jama / You Got</b>), customer profile ledgers, and financial balances with <b>100% privacy and zero cloud dependency</b>.
</p>

---

[Key Features](#-key-features) •
[App Architecture](#-tech-stack--architecture) •
[Quick Start](#-quick-start) •
[Building Android APK](#-building-the-android-apk) •
[PDF Export & Reminders](#-statement-generation--pdf-export) •
[License](#-license)

</div>

---

## 🌟 Key Features

### 1. 👥 Dedicated Customer / Party Profiles
- Create and organize unlimited party profiles (e.g., *Dharmesh Patel*, phone number, shop address, business notes).
- **Live Running Balance**: Automatically recalculates and displays the running balance after every single transaction.
- **Detailed Profile Ledger**: Chronological transaction history with custom tags, payment modes, and notes.

### 2. 📅 Date-Wise Daily Activity Feed (Dashboard)
- Automatically groups all shop transactions chronologically: **Today**, **Yesterday**, and earlier dates.
- Day-level subtotals displaying total money given vs. money received with net daily balance badges.
- One-tap navigation from any transaction directly into that customer's complete history ledger.

### 3. 📊 Executive Net Outstanding Position
- High-contrast visual card providing an instant overview of your business's financial health:
  - **(+) Net Positive (You'll Get / लेना है)**: Total money customers owe you in vibrant Emerald Green.
  - **(-) Net Negative (You'll Give / देना है)**: Total money you owe vendors in Rose Red.
  - **Visual Ratio Health Bar**: Dual-color ratio bar displaying your collection vs. payable distribution percentage.

### 4. 📄 Instant PDF Ledger Statements
- Generate professional, branded customer account statements with one click.
- Features company header, customer details, complete ledger table (Debits, Credits, Running Balances), totals footer, and authorization stamp line.
- Powered by `jsPDF` and `jspdf-autotable`.

### 5. 💬 1-Click WhatsApp Payment Reminders
- Built-in reminder generator that creates polite, auto-formatted WhatsApp and SMS reminder texts with exact outstanding balance figures.

### 6. 🔒 100% Offline-First & Private Storage
- Powered by **IndexedDB (Dexie.js)** with `navigator.storage.persist()`.
- Data is stored securely on your local device—no remote servers or cloud tracking.
- Built-in **1-Click JSON Backup & Restore** utility in Settings to archive and migrate data anytime.

### 7. 📱 Universal Mobile Viewport & Native APK Ready
- Optimized for all screen sizes (compact Android phones, iPhones, tablets, and desktop).
- Safe-area inset support (`pt-safe`, `pb-safe`) for camera notches and Android gesture navigation bars.
- Packaged with **Capacitor** for native Android APK distribution.

---

## 🛠 Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) + [Vite](https://vite.dev/) | Fast reactivity, modern component tree, and instant HMR |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) | End-to-end type safety across data models and ledger math |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Dark luxury design system, responsive utility classes |
| **Icons & Typography** | Material Symbols & Plus Jakarta Sans | Native mobile look and feel |
| **Local Database** | [Dexie.js](https://dexie.org/) (IndexedDB) | Reactive local-first client database with zero latency |
| **PDF Generation** | `jsPDF` + `jspdf-autotable` | Client-side vector PDF statement rendering |
| **Native Mobile** | [Capacitor 7](https://capacitorjs.com/) | Android project wrapper and APK generation |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | Cloud-based automated APK build pipeline |

---

## 🚀 Quick Start

### Prerequisites
- Node.js `v18+` or `v20+`
- npm `v9+` or `v10+`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Yugpatel-09/Digital-Khata.git

# 2. Navigate to project directory
cd Digital-Khata

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📱 Building the Android APK

This repository is already configured with an Android Capacitor project and a cloud build pipeline.

### Method 1: Automatic Cloud Build via GitHub Actions (Zero Setup)
1. Fork or push to your GitHub repository.
2. Go to the **Actions** tab in GitHub.
3. The **"Build Android APK"** workflow will compile the project automatically.
4. Download the compiled **`DigitalKhata-debug-apk`** artifact directly from the workflow summary!

### Method 2: Build with Android Studio
```bash
# 1. Build web production assets
npm run build

# 2. Sync assets with native Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```
In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 📄 Statement Generation & PDF Export

Every customer profile includes an **Export PDF** button that compiles their entire transaction history into a formal ledger document:

```
+-------------------------------------------------------------+
| DIGITAL KHATA ENTERPRISE                                    |
| OFFICIAL CUSTOMER LEDGER STATEMENT                          |
+-------------------------------------------------------------+
| Customer: Dharmesh Patel          | Total Given: Rs. 8,500  |
| Phone: +91 98250 12345            | Total Got:   Rs. 2,000  |
| Address: Commercial Market        | Balance:     Rs. 6,500  |
+-------------------------------------------------------------+
| # | Date & Time | Particulars | Mode | Debit | Credit | Bal |
| 1 | 2026-09-06  | Supplies    | Cash | 8,500 |   -    | 8500|
| 2 | 2026-09-06  | UPI Payment | UPI  |   -   | 2,000  | 6500|
+-------------------------------------------------------------+
```

---

## 📂 Project Structure

```text
Digital-Khata/
├── .github/
│   └── workflows/
│       └── build-apk.yml          # Automated Cloud APK Compiler
├── android/                       # Native Android Capacitor Project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/               # App launcher icons & splash
│   │   └── build.gradle
│   └── build.gradle
├── public/
│   └── manifest.json              # Web App Manifest for PWA/WebAPK
├── src/
│   ├── components/
│   │   ├── AddCustomerModal.tsx   # Add/Edit party profile dialog
│   │   ├── CustomerProfileView.tsx# Individual ledger & running balance view
│   │   ├── Dashboard.tsx          # Main feed, net metrics & date grouping
│   │   ├── LoginPage.tsx          # Master authentication screen
│   │   └── TransactionModal.tsx   # ₹ Gave / ₹ Got entry modal
│   ├── db/
│   │   └── index.ts               # Dexie IndexedDB schemas & persistence
│   ├── utils/
│   │   └── pdfGenerator.ts        # jsPDF Statement generation engine
│   ├── App.tsx                    # Root mobile shell & router
│   ├── index.css                  # Tailwind styles & OLED dark themes
│   └── main.tsx                   # React root entrypoint
├── capacitor.config.json          # Capacitor configuration
├── tailwind.config.js             # Custom typography & color palette
├── vite.config.ts                 # Vite bundler configuration
└── package.json
```

---

## 🔒 Security & Data Privacy

- **No Remote Telemetry**: Your financial records, phone numbers, and balances never leave your device.
- **Local Persistence**: Built with `navigator.storage.persist()` to safeguard your ledger against browser cache eviction.
- **Backup Portability**: Export your database as a standard `.json` file anytime and restore it across devices seamlessly.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ for modern merchants & businesses.</sub>
</div>
