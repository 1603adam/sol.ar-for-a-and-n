<div align="center">

# ☀️ SOL.AR

### Couple's Date Memory Archive

*A minimalistic, sun-themed web application to log, track, and cherish date memories.*

<br/>

![Framework](https://img.shields.io/badge/FRAMEWORK-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Language](https://img.shields.io/badge/LANGUAGE-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Build](https://img.shields.io/badge/BUILD-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Styling](https://img.shields.io/badge/STYLING-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Database](https://img.shields.io/badge/DATABASE-Firebase%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Auth](https://img.shields.io/badge/AUTH-Anonymous%20Sign--In-FF6F00?style=for-the-badge&logo=firebase&logoColor=white)
![Animation](https://img.shields.io/badge/ANIMATION-Framer%20Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Deploy](https://img.shields.io/badge/DEPLOY-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

![License](https://img.shields.io/badge/LICENSE-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-Active-success?style=for-the-badge)
![Made With](https://img.shields.io/badge/MADE%20WITH-Warmth-orange?style=for-the-badge)

<br/>

**Built for Adam & Nurin** 🧡

</div>

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| ☁️ **Cloud Sync** | Real-time sync across all devices using Firebase Firestore |
| 📸 **Smart Photos** | Auto-compresses large images before upload — fast saves, no size errors |
| 🔒 **Secret Notes** | Hidden messages that reveal with a click and a burst of confetti |
| ☀️ **Sun Theme** | Warm amber palette, floating sparkles, rotating sun backdrop |
| 📅 **Day Counter** | Tracks exactly how many days you've been together |
| 💾 **Backup** | Export/Import your entire archive as JSON |

---

## 🛠️ Tech Stack

```
Frontend    →  React 19 + TypeScript + Vite
Styling     →  Tailwind CSS v4
Animation   →  Framer Motion + Canvas Confetti
Backend     →  Firebase Firestore (real-time NoSQL)
Auth        →  Firebase Anonymous Authentication
Icons       →  Lucide React
Hosting     →  Vercel
```

---

## 🚀 Running Locally

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/sol-ar.git
cd sol-ar
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the dev server**
```bash
npm run dev
```

Open your browser to `http://localhost:5173` ☀️

**4. Build for production**
```bash
npm run build
```

---

## 🔥 Firebase Setup

This project uses Firebase for cloud storage. To configure your own instance:

**Step 1 —** Create a project at [Firebase Console](https://console.firebase.google.com/)

**Step 2 —** Enable **Firestore Database**

**Step 3 —** Enable **Authentication → Anonymous Provider**

**Step 4 —** Update your config in `src/firebase.ts`

**Step 5 —** Apply these Firestore Security Rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /memories/{memoryId} {
      allow read: if request.auth != null 
                  && resource.data.secretKey == "YOUR_SECRET_KEY";
      allow create: if request.auth != null 
                    && request.resource.data.secretKey == "YOUR_SECRET_KEY";
      allow update, delete: if request.auth != null 
                            && resource.data.secretKey == "YOUR_SECRET_KEY";
    }

    match /settings/{settingId} {
      allow read: if request.auth != null 
                  && resource.data.secretKey == "YOUR_SECRET_KEY";
      allow write: if request.auth != null 
                   && request.resource.data.secretKey == "YOUR_SECRET_KEY";
    }
  }
}
```

> ⚠️ **Security Note:** The secret key lives in the client bundle, so it deters casual access but isn't cryptographically private. For stronger privacy, switch to Google/Email login and scope rules to `request.auth.uid`.

---

## 📁 Project Structure

```
src/
├── components/
│   └── AddModal.tsx      # Add/Edit date form with photo compression
├── utils/
│   └── image.ts          # Canvas-based image compressor
├── App.tsx               # Main app, Firestore sync, views
├── firebase.ts           # Firebase config & secret key
├── types.ts              # TypeScript interfaces
└── index.css             # Tailwind + sun-theme animations
```

---

<div align="center">

### 📜 License

Released under the **MIT License**

**© Adam Iskandar 2026** — Built with warmth ☀️

</div>
