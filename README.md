# APSACS Skardu — School Hub & Class Portal

A modular, secure, and shared web portal for Army Public School & College System (APSACS) Skardu.

## 🚀 Key Features

- **7 Dedicated Screens**:
  - `Home`: Welcome banner, motto *"I Shall Rise & Shine"*, and quick links.
  - `Class`: Session 2025–26 Grade 10-B details, class teacher, and curriculum track.
  - `Students`: Searchable directory with tag chips, instant filtering, and student cards.
  - `Profile`: Detailed classmate profile with hobbies, quotes, and privacy controls.
  - `About School`: Researched FBISE affiliation, facilities grid, campus photo gallery, and faculty directory.
  - `Superlatives`: Community awards and superlative voting.
  - `Memory Wall`: Class quotes and memories with emoji reactions (`😂`, `❤️`, `🔥`) and reporting.
  - `Admin Panel`: Protected panel for class moderation and review of flagged entries.
- **Enterprise Security**:
  - Zero-vulnerability template rendering: strict `escapeHtml()` on all user-supplied text.
  - Production-ready `firestore.rules` enforcing document ownership, one-vote-per-user, and rate limits.
  - LocalStorage fallback when offline or before Firebase credentials are added.
- **Modular Codebase**:
  - Pure ES Modules (`src/main.js`).
  - No monolithic files: all feature modules are partitioned under 250 lines each.
  - Zero inline styles.

---

## 📁 Project Architecture

```text
school-hub/
├── index.html                    # Single Page Application container
├── firestore.rules               # Production Firestore security & validation rules
├── README.md                     # Documentation & setup guide
├── images/                       # Crest and school emblems
├── src/
│   ├── main.js                   # Application bootstrap
│   ├── config/
│   │   ├── constants.js          # Global limits, thresholds, collection names
│   │   └── firebase.js           # Firebase v10/v11 modular init with local fallback
│   ├── core/
│   │   ├── auth/                 # Google Sign-in / session management
│   │   ├── router/               # Hash-based screen router (#students, #profile, etc.)
│   │   ├── store/                # Centralized state management & Pub-Sub
│   │   └── utils/                # escapeHtml, time, and ID generators
│   ├── components/               # Reusable UI widgets
│   │   ├── card/
│   │   ├── empty-state/
│   │   ├── modal/
│   │   ├── navbar/
│   │   └── toast/
│   ├── features/                 # Modular feature controllers & templates
│   │   ├── admin/
│   │   ├── classes/
│   │   ├── gallery/
│   │   ├── memories/
│   │   ├── students/
│   │   ├── superlatives/
│   │   └── teachers/
│   └── styles/                   # Design system
│       ├── base.css
│       ├── layout.css
│       └── theme.css
```

---

## 🛠️ Firebase Cloud Sync Setup (Phase 2)

The application works out-of-the-box locally with mock persistence. To enable multi-user real-time synchronization across all devices:

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `apsacs-skardu-hub`).
2. **Enable Authentication**:
   - Navigate to **Build > Authentication > Sign-in method**.
   - Enable **Google Provider**.
3. **Enable Firestore Database**:
   - Navigate to **Build > Firestore Database**.
   - Click **Create Database** in **Production mode**.
   - Select a nearby region (e.g., `asia-south1` or `asia-southeast1`).
4. **Deploy Security Rules**:
   - In Firestore > **Rules**, paste the contents of `firestore.rules` and click **Publish**.
5. **Paste Web Config**:
   - In Project Settings > **General > Your apps**, select **Web (</>)**.
   - Copy the configuration object and paste into `src/config/firebase.js`.

---

## 🌐 Deployment (Cloudflare Pages)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Phase 1 modular architecture"
   git branch -M main
   git remote add origin https://github.com/<your-username>/school-hub.git
   git push -u origin main
   ```
2. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
3. Click **Create Application > Pages > Connect to Git**.
4. Select `school-hub`:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `/`
5. Click **Save and Deploy**.
6. **Important**: Add your custom Cloudflare domain (e.g. `yourname.pages.dev`) to **Firebase Console > Authentication > Settings > Authorized domains**, otherwise Google Sign-In will be blocked.
