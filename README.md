# APSACS Skardu — School Hub & Class Portal

A modular, secure, and shared web portal for Army Public School & College System (APSACS) Skardu.

## 🚀 Key Features

- **7 Dedicated Screens**:
  - `Home`: Welcome banner, motto *"I Shall Rise & Shine"*, and quick links.
  - `Class`: Session 2025–26 Grade 10-B details, active members, proposals, and invite code join flow.
  - `Students`: Searchable directory with tag chips, instant filtering, and student cards.
  - `Profile`: Detailed classmate profile with hobbies, quotes, and privacy controls (hidden birthday/contact options).
  - `About School`: Researched FBISE affiliation, facilities grid, campus photo gallery, and faculty directory.
  - `Superlatives`: Community awards with nominee voting (1 vote per student, un-voting support).
  - `Memory Wall`: Class quotes and moments with short-code reactions (`laugh`, `heart`, `fire`) and auto-hiding report flags.
  - `Admin Panel`: Protected panel for class moderation and review of flagged entries.
- **Enterprise Security**:
  - Zero-vulnerability template rendering: strict `escapeHtml()` on all user-supplied text.
  - Production-ready `firestore.rules` enforcing document ownership, one-vote-per-user, own-key reaction updates, and rate limits.
  - LocalStorage fallback when offline or before Firebase credentials are added.
- **Modular Codebase**:
  - Pure ES Modules (`src/main.js`).
  - No monolithic files: all feature modules are partitioned under 250 lines each.
  - Zero inline styles.

---

## 💻 Local Development

Because the project uses native ES Modules (`<script type="module">`), modern browsers require a local HTTP server (double-clicking `index.html` via `file:///` is blocked by browser CORS security):

```bash
# Option A: using npx serve
npx serve .

# Option B: using Python 3
python -m http.server 8000

# Option C: using VS Code
# Right-click index.html -> "Open with Live Server"
```

Open `http://localhost:8000` (or the port indicated) in your browser.

---

## 🛠️ Firebase Cloud Sync Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `school-hub-apsacs`).
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
6. **Create First Active Class & Secret Code (in Console)**:
   - In Firestore, create collection `classes`, document `10-b`:
     ```json
     {
       "name": "Grade 10 — Section B",
       "grade": "Grade 10",
       "section": "Section B",
       "status": "active",
       "createdBy": "ADMIN_UID",
       "supporterUids": ["ADMIN_UID"],
       "createdAt": "[server timestamp]"
     }
     ```
   - In collection `classSecrets`, document `10-b`:
     ```json
     {
       "code": "[GENERATE_RANDOM_SECRET_CODE]"
     }
     ```
7. **Set Administrator Role (in Console)**:
   - Once you sign in with Google on the site, find your UID in **Authentication > Users**.
   - Create a document in Firestore at `admins/{YOUR_UID}` (can be an empty document `{}`).
   - Your account will automatically have administrative privileges.

---

## 🌐 Deployment (Cloudflare Pages)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete hardened Firestore architecture"
   git push origin main
   ```
2. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
3. Click **Create Application > Pages > Connect to Git**.
4. Select `PoGamerLab/school-hub`:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `/`
5. Click **Save and Deploy**.
6. **Important**: Add your custom Cloudflare domain (e.g. `school-hub.pages.dev`) to **Firebase Console > Authentication > Settings > Authorized domains**, otherwise Google Sign-In will be blocked.
