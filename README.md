# APSACS Skardu — School Hub & Class Portal

A modular, secure, and authenticated school portal for Army Public School & College System (APSACS) Skardu.

---

## 🚀 Architecture & Key Features

- **Classes Hub (`#class`)**:
  - Classrooms grid with live enrollment counts and grade-level filtering.
  - Class detail view with enrolled student roster, real-time class chat, and announcements.
  - **All Students Directory**: School-wide student dictionary with instant search and house chips (Admin only).
  - Admin class management with in-place class editing and creation.
- **Real-Time Class Chat**:
  - Encrypted & rate-limited: 5-second cooldown per user enforced by Firestore security rules via `chatState/{uid}` batched writes.
  - Verified identities: Author name strictly matches verified student profile in Firestore.
  - Community moderation: Built-in message reporting with auto-hide threshold (3+ reports) and administrative mute/deletion.
  - Reading cost optimization: Newest 50 messages pagination with cursor-based load-older button and automatic disconnect after 60 seconds of tab inactivity.
- **Profile Pictures (Zero-Cost In-Firestore Architecture)**:
  - 96×96 thumbnail stored directly in `students/{uid}` (max 8,000 chars) for instant zero-overhead list rendering.
  - 256×256 avatar stored in `avatars/{uid}` (max 40,000 chars) loaded on demand.
  - Client-side crop modal with pan, zoom slider, EXIF metadata stripping, and multi-step JPEG compression.
  - 1-hour update rate limit enforced directly in Firestore rules.
  - Optional Google account photo toggle with school-wide privacy notice.
- **Authentication & Onboarding**:
  - Google Sign-In with status state machine (`needs_gate` -> `needs_profile` -> `active`).
  - School Knowledge Gate: 3 questions with normalized answer validation and attempt cooldowns.
  - Onboarding wizard with auto-saving drafts and Urdu/Unicode name support.
- **Security & Access Control**:
  - Strict Content-Security-Policy (CSP) meta tag.
  - Admin identity determined solely by presence of manual document in `admins/{uid}` in Firestore.
  - Whitelist-validated student records preventing attribute breakout or stored XSS.
  - Class isolation: Class chat, announcements, memories, and superlatives readable only by verified members of that class.
  - Immutable audit logging (`adminLog/{id}`) for all administrative actions.

---

## 💻 Local Development

Because the project uses native ES Modules (`<script type="module">`), modern browsers require a local HTTP server:

```bash
# Option A: using npx serve
npx serve .

# Option B: using Python 3
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

---

## 🛠️ Production Deployment & Rules Setup

1. **Deploy Security Rules**:
   - In Firebase Console > **Firestore Database > Rules**, paste the full contents of `firestore.rules` and click **Publish**.
2. **Promote Admin Account**:
   - In Firestore Console, create a document under `admins/{your-google-uid}` with field `role: "admin"`.
   - Admin access is restricted to console creation only.
3. **Configure Gate Verification**:
   - In Admin Console > **Classes & Gate**, configure the 3 school questions and accepted answers.
