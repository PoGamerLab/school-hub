# School Hub: Audit Report

**Audited:** `School_Website_Project__Test__50de0b.zip` (latest upload)
**Date:** 2026-10-23
**Audience:** the site owner and the coding agent

---

## 1. How this was checked

**Automatically checked (verified by running scripts):**

| Check | Result |
|---|---|
| Syntax check of all 44 JavaScript files | All parse, 0 errors |
| Every relative `import` resolves to a real file and a real export | 0 problems |
| Duplicate `id` attributes in `index.html` | None |
| `getElementById` ids missing from the HTML | None (2 ids are created in JS on purpose) |
| Inline `style="..."` in `index.html` and in JS templates | 0 |
| Template values inserted into HTML without escaping | Scanned; findings in section 3 |

**Read by hand:** `firestore.rules` (all 332 lines), `auth.js`, `router.js`, `onboarding.db.js`, `gate.db.js`, `gate.js` (logic part), `students.modal.js`, `students.render.js`, `admin.members.js`, `siteConfig.js`, the chat, announcement, memories and admin render files (relevant parts), `firestore.js` helpers, `README.md`.

**Not checked in depth:** `gallery.js`, `teachers.js`, `memories.js`, `superlatives.js` and `classes.js` line by line, the CSS files, and `index.html` form fields against the rules.

**Not done:** running the site in a browser, testing the rules in the Firebase emulator or Rules Playground, testing on a real phone. Everything below comes from reading the code and rules, so please confirm each fix with the test tables at the end.

**Severity scale:** Critical = fix before anyone else uses the site. High = fix in the next phase. Medium = fix before launch. Low = polish.

---

## 2. Summary

| ID | Severity | Area | Problem |
|---|---|---|---|
| C1 | Critical | Rules + auth | Any signed-in user can make themselves admin |
| C2 | Critical | Rendering | Stored XSS through the `house` field (can take over any viewer, including admin) |
| H1 | High | Rules | Class isolation is broken; teachers and gallery are public to the internet |
| H2 | High | Chat | Names can be faked, no rate limit, no reporting, heavy read cost |
| H3 | High | Rules | Student updates are barely validated; owner can change `verified` |
| H4 | High | Rules | `users.photoURL` accepts any string |
| H5 | High | Admin | Admin actions are not atomic (half-done states possible) |
| H6 | High | Rules | Announcements and report data are unvalidated |
| M1 | Medium | Forms | Name check accepts English letters only |
| M2 | Medium | Forms | Pre-filled defaults hide missing data |
| M3 | Medium | Gate | Sample questions replace "Setup incomplete" |
| M4 | Medium | Auth | Failed profile load looks like signed-out |
| M5 | Medium | Rules | Audit log can be edited; admin list can be read |
| M6 | Medium | Mobile | Safe-area padding does nothing without `viewport-fit=cover` |
| M7 | Medium | Rendering | Unescaped student name in a dropdown (`students.js`) |
| M8 | Medium | Rules | Drafts have no size limit |
| M9 | Medium | Repo | Admin UIDs hard-coded in a public repo |
| M10 | Medium | Docs | README claims things that are not true |
| L1 | Low | Rendering | Inline `onerror` handlers in gallery and teacher images |
| L2 | Low | Repo | `implemented.txt` clutter, hidden dead nav buttons |
| L3 | Low | UX | Raw error messages shown in toasts |

---

## 3. Findings in detail

### C1. Any signed-in user can become admin (Critical)

**Where:** `firestore.rules` (the `admins/{uid}` rule and the `isAdmin()` helper), `src/core/auth/auth.js`.

**Problem:**
- The rule for `admins/{uid}` allows a write when `request.auth.uid == uid`. So anyone can create their own admin document.
- `isAdmin()` is true when `admins/{uid}` exists, when the UID is in a hard-coded list, or when `users/{uid}.role == 'admin'`.
- `auth.js` also auto-creates `admins/{uid}` for "recognized" admins, which is why the rule was loosened.

**Impact:** a person with any Google account can run one line in the browser console and get full admin power: read the gate answers, approve themselves, delete or edit anything, change the audit log, and switch the site to read-only.

**Fix:**
1. `admins/{uid}`: no client writes. Read only for the owner of that UID or an admin. No listing.
2. Delete the auto-provision code from `auth.js`.
3. Remove `KNOWN_ADMIN_UIDS` from `auth.js` and the hard-coded UIDs from `isAdmin()`.
4. `isAdmin()` means one thing: `admins/{uid}` exists. Remove the `users.role == 'admin'` path.
5. The page decides `isAdmin` only by reading its own `admins/{uid}`.
6. After publishing, the owner opens the `admins` collection in the Firebase console and deletes any UID that is not theirs, checks `users` for unexpected `role: admin`, and changes the gate answers if misuse is possible.

**Test:** in the Rules Playground, as a random UID, creating `admins/<that UID>` must be **denied**.

---

### C2. Stored XSS through the `house` field (Critical)

**Where:** `src/features/students/students.render.js` lines 9 and 78 (`const houseClass = \`house-${house.toLowerCase()}\``), used inside `class="house-badge ${houseClass}"`.

**Problem:** the value of `student.house` is put into an HTML `class` attribute **without escaping**. The security rules do not check what `house` contains (it is only in the allowed-keys list). The form offers a fixed list, but a student can write any text straight to the database. A value such as `x" onmouseover="...` breaks out of the attribute and runs code in every browser that shows that card.

**Impact:** because students and profiles are now visible to the whole school, one student could run code in the browser of every classmate and of the admin. That code can use the viewer's signed-in session. This is the most dangerous bug after C1.

**Fix (do all three):**
1. **Rules:** `house` must be one of the allowed values (Unity, Faith, Discipline, Tolerance, or the final list in `constants.js`). Same for `group` and `category`.
2. **Render:** never build a class name from stored text. Use a lookup table from the allowed value to a fixed class name, and use a default when the value is unknown. Example idea: `Unity` maps to `house-unity`, anything else maps to `house-unknown`.
3. **General rule:** every stored value that goes into an attribute must be passed through `escapeAttr`, and values that become part of a class name must come from a fixed list.

**Test:** write `house = x" onmouseover="alert(1)` through the Rules Playground (denied), and force it into the page data to confirm the render ignores it.

**Defense in depth:** add a Content-Security-Policy `<meta>` tag (see section 5) so a future escaping mistake is much less harmful.

---

### H1. Class isolation is broken and some data is public (High)

**Where:** `firestore.rules`.

**Problems:**
- `inMyClass(classId)` returns true when `classId == ''`. Any active member can create and read documents with an empty `classId`.
- `teachers` and `gallery` have `allow read: if true`, so signed-out visitors on the internet can read them directly. This contradicts the members-only decision.
- `gallery` create does not check the poster's class.
- `classes` documents are publicly readable when active (includes `monitorUid`).
- `students` reads are open to every active member (this part now matches your decision: whole school sees what is shared).

**Fix:**
- Remove the empty-class exception from `inMyClass`.
- `teachers`, `gallery`, `classes`: read by signed-in active members only (classes: any signed-in user, because the gate class picker needs them before approval).
- Keep memories, superlatives, announcements and chat readable by the same class only.

---

### H2. Class chat: spoofing, no limits, no reporting (High)

**Where:** `classChats/{classId}/messages` rules, `classes.chat.js`, `classes.chat.render.js`.

**Problems:**
- No allowed-keys list. A message can carry extra data of any size.
- `authorName` is written by the page (from the Google display name), and the rules do not check it. Anyone can pretend to be a classmate.
- No rate limit. One person can use up the free daily write limit (20,000).
- The chat loads up to 250 messages per open. With a class of 40 this can use many thousands of reads a day.
- No Report button, no mute, no moderation tools for chat.
- The Google display name is shown, not the student's profile name.

**Fix:** see the build spec, Phase C: allowed keys, `authorName` checked against the student profile, a 5-second limit enforced by the rules, mute, reports, 50 messages with Load older, listener only while the chat is open.

---

### H3. Student profile updates are barely validated (High)

**Where:** `students/{uid}` update rule.

**Problems:**
- Only `name`, `bio`, `showInDirectory`, `birthday` and `contact` are checked. `tags`, `favQuote`, `funFact`, `favSubject`, `category`, `house`, `group`, `initials`, `gradientIndex` have no type or size limits on update, and `house` and `group` have none on create either.
- The owner can change `verified` (it is in the allowed list and not locked).
- Admin-created profiles skip validation completely.

**Fix:** use the same full set of checks on create and update, lock `verified`, `ownerUid` and `classId` for owners, and use fixed value lists for `category`, `house` and `group`.

---

### H4. `users.photoURL` accepts any string (High)

**Where:** `users/{uid}` update rule (profile info branch).

**Problem:** `photoURL` can be any text of any size. This must be fixed before profile pictures are added, otherwise people can store large data or tracking links there.

**Fix:** allow only an empty string or a string up to 300 characters that starts with `https://lh3.googleusercontent.com/`.

---

### H5. Admin actions are not atomic (High)

**Where:** `admin.members.js` (approve, delete profile, move class, reset gate).

**Problem:** each action makes two or three separate writes (for example, delete the student, then update the user). If the second write fails, the account is left in a broken state. The audit log entry is also a separate write.

**Fix:** use one batched write per action, including the audit log entry (the page already has `runBatchWrite`).

---

### H6. Announcements and reports are unvalidated (High)

**Where:** `classes/{classId}/announcements`, and the `reports` maps on memories, superlatives and (soon) photos.

**Problems:**
- Announcement create has no allowed-keys list or length limits, and `authorUid` is not forced to equal the signer, so a later delete rule that trusts `authorUid` can be abused.
- Report values (`reports.{uid}`) have no size limits, so someone can store large data in them.

**Fix:** allowed keys, length limits, identity fields forced to the signer, and a small fixed structure for report values (reason from a list, details up to 200 characters).

---

### M1. Name check accepts English letters only (Medium)

**Where:** `students.modal.js` and `onboarding.js` use `/^[a-zA-Z\s\.\-]{3,60}$/`.

**Problem:** names in Urdu script and names with an apostrophe are rejected.

**Fix:** allow letters from any script, spaces, dots, hyphens and apostrophes, 3 to 60 characters (use a Unicode-aware pattern like the one already used in `normalizeAnswer.js`).

---

### M2. Pre-filled defaults hide missing data (Medium)

**Where:** the profile form (`students.modal.js`, onboarding): category defaults to Sports, tags to Cricket, house to Unity, group to Pre-Medical, favorite subject to Computer Science.

**Problem:** a student who just clicks through ends up with false data.

**Fix:** start these fields empty and required.

---

### M3. Gate shows sample questions instead of "Setup incomplete" (Medium)

**Where:** `gate.db.js` (`fetchGateQuestions` returns built-in questions when none are configured).

**Problem:** the "setup incomplete" screen can never appear. Students are shown questions that nobody can answer correctly.

**Fix:** return nothing when the question document is missing, so the gate shows "Setup incomplete, please tell the admin".

---

### M4. Failed profile load looks like signed-out (Medium)

**Where:** `auth.js`, after all retries fail.

**Problem:** the user object stays empty, so the page shows the signed-out landing page and a Sign in button while a Google session still exists.

**Fix:** keep the retry banner and show a clear "could not load" screen, not the landing page.

---

### M5. Audit log is editable and the admin list is readable (Medium)

**Where:** `adminLog` and `admins` rules.

**Problem:** admins can edit or delete log entries. Any signed-in user can read and list `admins`.

**Fix:** `adminLog` create-only (with `actorUid` equal to the signer and `createdAt` equal to request time). `admins` readable by the owner of that UID or an admin only.

---

### M6. Safe-area padding needs `viewport-fit=cover` (Medium)

**Where:** `index.html` viewport meta tag.

**Problem:** the bottom navigation uses `env(safe-area-inset-bottom)`, but on phones with a notch or gesture bar it stays 0 unless the viewport tag includes `viewport-fit=cover`.

**Fix:** `width=device-width, initial-scale=1.0, viewport-fit=cover`.

---

### M7. Unescaped student name in a dropdown (Medium)

**Where:** `students.js` line 78: `<option value="${s.id || s.uid}">${s.name} (${s.house}...)`.

**Problem:** `name` and `house` are inserted without escaping. Browsers mostly neutralize markup inside a `<select>`, so this is less dangerous than C2, but it should still be escaped.

**Fix:** use `escapeHtml` and `escapeAttr`, or build the option elements with `textContent`.

---

### M8. Drafts have no size limit (Medium)

**Where:** `drafts/{uid}` rule checks keys and `step`, but not the `data` map.

**Problem:** a user can store up to a document's maximum size in their draft.

**Fix:** require `data` to be a map with limited keys (the wizard fields only) and each value a string up to 500 characters.

---

### M9. Admin UIDs are hard-coded in a public repo (Medium)

**Where:** `firestore.rules` and `auth.js`.

**Problem:** the admin accounts are identified to everyone. It is not a password, but it is unnecessary and it makes targeting easier. Removing it is part of C1.

---

### M10. README claims are not true (Medium)

**Where:** `README.md` says "Zero-vulnerability template rendering", "rate limits" in the rules, a LocalStorage fallback, 7 screens including a Students tab, and an invite-code join flow.

**Problem:** none of that matches the current code. This misleads you and any future helper.

**Fix:** rewrite the README after the fixes, describing only what exists.

---

### L1 to L3 (Low)

- **L1:** `gallery.render.js` and `teachers.render.js` use inline `onerror="..."`. Move the fallback into JavaScript. It also blocks a strict Content-Security-Policy.
- **L2:** delete `implemented.txt` (it is a copy of the spec). The hidden nav buttons for Students, Memory Wall and Superlatives are dead markup now that these live inside the Classes hub. Remove them or confirm they are still needed.
- **L3:** several toasts show `err.message` straight from Firebase. Show a friendly message and log the details to the console.

---

## 4. What is working well

- The gate, state machine, onboarding wizard with draft autosave, and the activation batch follow the spec and are consistent between the page and the rules.
- The shared `normalizeAnswer` helper is used by both the gate and the admin editor.
- The router guard, loading screen, toast fix, and per-screen listeners are in place.
- Inline styles are gone. All files parse and all imports resolve.
- `escapeHtml` is used in almost every render function, and gradients are stored as an index.
- Firestore index file, Firebase config files, bottom navigation with safe-area styling, announcement banner and read-only banner exist.
- Admin console has Classes & Gate, Moderation, Members, Controls and Audit Log tabs.

---

## 5. Improvements worth adding

1. **Content-Security-Policy.** Add a `<meta http-equiv="Content-Security-Policy">` tag as a second line of defense against XSS. Allow only your own files, `https://www.gstatic.com` scripts, the Firebase and Google endpoints you use, Google Fonts, and `data:` and `https:` images. This needs the inline `onerror` handlers removed first, and the Google sign-in popup must be tested carefully after adding it. GitHub Pages cannot set real headers, so the meta tag is the available option.
2. **Rules tests.** Once stable, add automated rules tests with the Firebase emulator (needs Java and the Firebase CLI) so every fix keeps working.
3. **Backups.** The free plan has no automatic backup. Add an admin Backup tab that exports data to a JSON file, and export manually before big changes.
4. **Privacy notice and consent.** Students are minors. Add a short notice that says who can see what, and get school or parent permission for photos and profiles.
5. **Delete my account.** Let a student delete their own profile, photo and data.
6. **Usage watch.** Check Firebase Usage weekly (free limits: 50,000 reads and 20,000 writes a day) and avoid any feature that loads many documents.
7. **Accessibility.** Labels on all form fields, visible keyboard focus, `aria-live` on toasts, keyboard-friendly modals, enough color contrast.
8. **Error handling.** One shared error handler that shows friendly messages and keeps technical details in the console.
9. **API key hygiene.** In Google Cloud Console, restrict the Firebase web API key to your site address.
10. **Admin code loading.** Confirm the admin module is loaded only after the server confirms admin (the earlier spec asked for this).

---

## 6. Fix order

1. **C1** admin hole, publish, then clean the `admins` and `users` collections by hand.
2. **C2** house XSS (rules, render lookup, escape), plus **M7**.
3. **H1, H3, H4, H6** rules tightening.
4. **H2** chat safety, then **H5** atomic admin actions.
5. **M1 to M6, M8, M9** form, gate, auth, mobile and rules cleanups.
6. Profile pictures (separate build spec).
7. **M10, L1 to L3**, CSP meta tag, README rewrite.
8. Full re-test with two Google accounts in two classes, then a one-class soft launch.

---

## 7. Regression tests after the fixes

| Test | Expected |
|---|---|
| Random signed-in UID creates `admins/<own uid>` | Denied |
| Normal user lists or reads another user's `admins` document | Denied |
| `house` set to text containing a quote or an event handler | Denied by rules, ignored by render |
| Signed-out read of teachers, gallery or classes data | Denied (classes: signed-in only) |
| Create a memory, gallery item or message with empty `classId` | Denied |
| Member of class A reads memories, chat and announcements of class B | Denied |
| Member of class A reads student profiles of class B | Allowed |
| Student update with an extra key or an oversized field | Denied |
| Owner changes own `verified`, `ownerUid` or `classId` | Denied |
| `users.photoURL` set to a non-Google URL | Denied |
| Chat message with `authorName` of someone else | Denied |
| Two chat messages within 5 seconds | Second denied |
| Chat open: count of reads on load | 50 or fewer |
| Announcement from a normal member | Denied |
| Report with a very long details text | Denied |
| `adminLog` update or delete | Denied |
| Admin approve, delete profile, move class with a forced failure on the second write | Nothing partly applied |
| Gate with no questions configured | "Setup incomplete" screen |
| Profile load fails | Retry screen, not the landing page |
| Name in Urdu script or with an apostrophe | Accepted |
| Profile form on first open | No pre-filled category, house, group or tags |
| iPhone with a notch | Bottom nav sits above the gesture bar |
