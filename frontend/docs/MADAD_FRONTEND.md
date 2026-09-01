# MADAD — Frontend Implementation Plan

**Owner:** Abdullah Amir
**Stack:** React Native (Expo — use Expo, not bare React Native, it removes a huge amount of native build/signing pain you don't have time for in a hackathon), TypeScript
**Backend API base URL:** `http://<backend-host>:8000/api` — port **`8000`**, matches `MADAD_BACKEND.md` exactly. During development against Muhammad Ahmad's local machine, this will be his machine's local network IP, not `localhost` (a phone/simulator can't reach your teammate's `localhost`) — get his actual dev IP or use `ngrok`/a deployed Alibaba Cloud endpoint early so you're not blocked later.
**Expo dev server port:** **`8081`** (Expo's default Metro bundler port — leave this as default, no reason to change it).

---

## 0. Primary Repository Structure (shared — identical in all three role files)

```bash
madad/
├── backend/                  ← Muhammad Ahmad owns this
├── frontend/                 ← YOU own everything in this folder
├── database/                 ← Yasir owns this
├── docs/
│   └── API_CONTRACT.md
├── .gitignore
└── README.md
```

**Golden rule:** you only edit files inside `frontend/`. If an API response doesn't match what's documented below, don't guess or reverse-engineer it from the backend code — message Muhammad Ahmad and get the contract fixed at the source, so `docs/API_CONTRACT.md` stays the single truth all three of you build against.

## 1. Your Secondary Structure (inside `frontend/`)

```bash
frontend/
├── App.tsx
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ReportInboxScreen.tsx
│   │   ├── ReportReviewScreen.tsx        # the extraction-review/edit step
│   │   ├── ManualReportEntryScreen.tsx   # structured form entry
│   │   ├── MapScreen.tsx
│   │   ├── AllocationPlanScreen.tsx
│   │   └── DispatchDetailScreen.tsx
│   ├── components/
│   │   ├── UrgencyBadge.tsx
│   │   ├── SiteCard.tsx
│   │   ├── DispatchCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── PrimaryButton.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx              # React Navigation stack + role-based routing
│   ├── api/
│   │   ├── client.ts                     # axios instance, base URL, auth header injection
│   │   ├── reports.ts
│   │   ├── sites.ts
│   │   ├── depots.ts
│   │   ├── plan.ts
│   │   └── dispatch.ts
│   ├── types/
│   │   └── index.ts                      # TypeScript interfaces mirroring API_CONTRACT.md exactly
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   └── context/
│       └── AuthContext.tsx
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── onboarding/
├── app.json
├── package.json                    # exact pinned versions in API_CONTRACT.md — copy from there, don't freelance
├── package.json                    # exact pinned versions in API_CONTRACT.md — copy from there, don't freelance
├── tsconfig.json
└── .env.example
```

**Why this shape:** `api/` is split into one file per resource (mirrors the backend's route split exactly, so anyone can find the call for a given feature instantly), `types/` is the single place TypeScript interfaces live so a change to the API contract only needs one file updated, and `theme/` centralizes spacing/color values so you're never hardcoding a padding number twice.

---

## 2. API Contract

**The full, authoritative spec — every field, type, status code, and error shape — now lives in `API_CONTRACT.md` at the repo root. This section is not a substitute for it.** Read `API_CONTRACT.md` before writing any `api/*.ts` file. If what the backend actually returns doesn't match it, that's a bug to report to Muhammad Ahmad, not something to quietly work around in your code — a silent workaround is exactly how the two of you end up integrated-but-wrong on demo day.

**Build strategy so you're never blocked waiting on Muhammad Ahmad:** for every screen below, create a `mocks/` fixture file matching the response shapes in `API_CONTRACT.md` exactly, and wire your screen against the mock first. Swapping a mock for the real call later is a one-line change in `api/*.ts` — building against the agreed contract now means you and Muhammad Ahmad can work in true parallel from day one.

### Session / auth handling (this is the part that most often causes silent backend↔frontend breakage — read carefully)

- On successful login, store `access_token`, `role`, `center_id`, and `center_name` in `AuthContext`, and persist them to `expo-secure-store` (not plain `AsyncStorage` — the token shouldn't sit in unencrypted storage) so the coordinator isn't logged out every time the app restarts.
- `api/client.ts` must attach `Authorization: Bearer <token>` to every request automatically via an axios request interceptor — don't add this header manually in each individual `api/*.ts` file, that's exactly the kind of duplication that causes one forgotten header and a mysterious `401` on one screen only.
- Add a response interceptor in `api/client.ts` that catches any `401` globally, clears `AuthContext`, and redirects to Login — this is what handles an expired token gracefully instead of every screen needing its own expired-token logic.
- **Corner case Muhammad Ahmad's backend must also honor:** tokens should have a stated expiry (put it in `MADAD_BACKEND.md`'s `.env.example` as `JWT_EXPIRY_MINUTES`) that both of you agree on — if the frontend assumes a token lasts all day and the backend expires it in 30 minutes, that mismatch shows up as "the app randomly kicks me out," which is exactly the kind of integration gap that's invisible until someone hits it live.

---

## 3. Reconciling This Screen Flow With the Original Walkthrough (this was flagged as unclear — settling it here explicitly)

The original layman walkthrough (Bilal opening his dashboard at 7:00 AM) starts **after** login — it deliberately skipped the very first, one-time "before you're a regular user" moment, because that walkthrough was about a normal working day, not day one. Here's the piece that was missing, stated explicitly so there's no more ambiguity:

**There is no self-registration screen in this app, and there should not be one.** Coordinator accounts are provisioned ahead of time by Yasir via `database/seed_data.sql` (see `MADAD_DATABASE.md`) — a coordinator is handed a center code, username, and password by whoever's running the support center, the same way you'd be handed institutional login credentials for any internal tool, not sign up for one yourself. This is also the more realistic design for a real relief organization: you don't want just anyone able to create a coordinator account that can dispatch real resources.

**So the actual full first-time flow is:** Onboarding (Screen 1, shown once — Expo's `AsyncStorage` flag `hasSeenOnboarding` controls whether it shows again) → Login (Screen 2, using pre-provisioned credentials) → Dashboard (Screen 3, this is where the original walkthrough begins). Every screen from Screen 3 onward is exactly what that walkthrough describes. If your teammate reads only the walkthrough and only this screen list, they should now land on the same mental model — that gap is closed.

## 4. Screens, In Build Order

### Screen 1 — Onboarding (2–3 slides, before login)

Purpose: first impression, sets tone. Keep it to 2–3 slides max, skippable from slide one (a "Skip" text link, top-right, always visible).

- **Slide 1:** app name "Madad" large and centered, one-line tagline underneath, simple illustration (a stylized map pin or hands — nothing literal/graphic given the subject matter is disaster relief; avoid anything that could read as distressing imagery).
- **Slide 2:** one sentence on what the app does — "See every report, plan every route, in real time."
- **Slide 3:** "Get Started" primary button → Login screen.
- **Design:** minimalist, generous whitespace, one accent color only (pick a calm blue or teal — avoid red/orange as the dominant onboarding color even though they're your urgency colors elsewhere, since onboarding should feel calm, not alarming).

### Screen 2 — Login

- Fields: Center Code (dropdown or text input, autocapitalize characters), Username, Password.
- Single primary button: "Log In", full-width, 48dp height minimum (Android touch-target guideline — don't go smaller).
- On success: store `access_token` + `center_id` in `AuthContext`, navigate to Dashboard.
- **Corner case:** show a specific, human error message for wrong credentials vs. network failure — "Incorrect username or password" is a different message from "Can't reach the server, check your connection." Don't merge these into one generic error; whoever's using this in the field needs to know which one it is.

### Screen 3 — Dashboard (the home screen after login)

Layout: three large tappable cards, stacked vertically, each with an icon, a title, and a live count badge:

1. **"Pending Reports"** — badge shows count awaiting review → Report Inbox
2. **"Active Sites"** — badge shows count of unserved sites → Map
3. **"Today's Dispatches"** — badge shows count in progress → Dispatch list

- Padding: 20dp horizontal screen margin, 16dp vertical gap between cards, 16dp internal card padding.
- Also include a small floating action button, bottom-right, for "+ New Report" → Manual Report Entry (this is your stand-in for the future SMS pipeline — make it fast to reach, since it may get used a lot in the demo).
- **Depot inventory strip — do not skip this, it's the screen's fourth required element, not optional polish.** Below the three cards, a horizontal scrollable strip of small depot summary chips, each showing depot name and a compact resource count (e.g., "Depot A — 400 food, 2 boats, 1 ambulance"), fetched from `GET /api/depots?center_id=`. This is what makes the original walkthrough's 7:30 AM moment — "checking what he actually has" — real on screen. Without it, that specific beat of the demo has nothing to point to.

### Corner cases for this screen specifically

- If `GET /api/depots` or any of the three count endpoints fails, show the affected card/strip in a visibly degraded state (a small "unable to load" inline note, not a blank card and not a full-screen error) — one failed network call shouldn't take down the whole dashboard.

### Screen 4 — Report Inbox

- Simple vertical list, each row: raw text preview (2 lines, truncated), timestamp, a small "Process" button.
- Tap "Process" → calls `/extract` → navigates to Report Review screen with the result.
- **Corner case:** show a loading spinner state on the specific row being processed, not a full-screen blocker — the coordinator should be able to keep scanning other reports while one is processing.

### Screen 5 — Report Review (the human-in-the-loop step — this is the most important screen in the app)

- Shows extracted fields as **editable** form inputs, not read-only text: location name, population (numeric stepper), needs (multi-select chips), urgency flags (multi-select chips), confidence (read-only badge).
- If `geocode_status: unmatched` came back from the backend, show a map with a draggable pin instead of a text field for location, and require the coordinator to drop the pin before the "Confirm" button becomes enabled — never let an unmatched location get confirmed with no coordinates at all.
- Two buttons: "Confirm" (primary, calls `PATCH /reports/{id}`) and "Discard" (secondary, ghost-styled, for false/duplicate reports).
- **Design principle to hold onto for this screen specifically:** every field the AI extracted should look editable at a glance (a light border, a subtle "AI-suggested" tag) — the coordinator must never mistake this for a finished, locked record.

### Screen 6 — Manual Report Entry (structured form)

- Fields, in this order: Location (searchable dropdown pulling from the gazetteer, falls back to a map-pin picker if not found), Estimated Headcount (numeric input — this maps to `estimated_population` server-side, see `API_CONTRACT.md`; the field is labeled "Headcount" in the UI since that's the natural term for a coordinator filling this in by hand), Severity (single-select: Low/Medium/High/Critical, rendered as colored segmented buttons, not a plain dropdown — severity should be visually obvious, not buried in text; this value is stored and factored into prioritization, it is not decorative), Needs (multi-select chips, same component as Screen 5 for consistency), Contact Number (optional text input).
- One primary "Submit" button.
- This is the primary intake path for now — build and polish it fully, it is not a lesser feature than the AI extraction flow.

### Screen 7 — Map

- Full-screen map (`react-native-maps` with an OpenStreetMap tile provider — do not use the default Google provider, it requires an API key/billing you don't have).
- **Technical specifics, do this on Day 1, not Day 4 — it has real setup cost if discovered late:** `react-native-maps`'s default provider is Google on Android unless explicitly overridden. Set `provider={null}` (or omit the `provider` prop entirely) on the `MapView` component and render a `UrlTile` child pointing at an OSM tile server (e.g., `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, respecting their usage policy for a low-traffic demo). No `app.json` Google Maps API key config block is needed at all if you do this correctly — if you find yourself adding a Google API key anywhere in `app.json`, stop, that's the wrong path. Test on a physical Android device early, not just the simulator, since tile rendering behavior has historically differed between the two.
- **Technical specifics, do this on Day 1, not Day 4 — it has real setup cost if discovered late:** `react-native-maps`'s default provider is Google on Android unless explicitly overridden. Set `provider={null}` (or omit the `provider` prop entirely) on the `MapView` component and render a `UrlTile` child pointing at an OSM tile server (e.g., `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, respecting their usage policy for a low-traffic demo). No `app.json` Google Maps API key config block is needed at all if you do this correctly — if you find yourself adding a Google API key anywhere in `app.json`, stop, that's the wrong path. Test on a physical Android device early, not just the simulator, since tile rendering behavior has historically differed between the two.
- Site markers color-coded by urgency: red = medical/critical, orange = food/water shortage, yellow = general.
- Depot markers, distinct icon/color from sites.
- Tapping a site marker opens a bottom sheet (not a full navigation push — keep the map visible underneath) showing the `SiteCard` component with headcount, needs, and a "View in Plan" link.
- A toggle button, top-right: "Show Damaged Roads" — overlays red dashed lines from `/api/roads/damaged`.

### Screen 8 — Allocation Plan

- Ranked vertical list (rank number large and visible on the left of each row), each row expandable to show the `reasoning` string from the API — this is what makes the plan feel like a reviewed proposal, not a black box, exactly mirroring the trust design from the backend.
- Each row has a "Confirm Dispatch" button → calls `/api/dispatch`, then navigates to Dispatch Detail.
- **Corner case:** after a `/plan/replan` call, animate the specific rows that changed (a brief highlight color transition) rather than silently re-sorting the whole list — the coordinator should visually see what moved and why, not have to spot the difference themselves.

### Screen 9 — Dispatch Detail

- Vehicle/resources loaded, route map (small embedded map, not full-screen), ETA.
- **Two status buttons, not one, matching the dispatch lifecycle exactly:** "Mark En Route" (calls `PATCH /api/dispatch/{id}/status` with `{"status": "en_route"}`) shown while status is `planned`, then replaced by "Mark Delivered" once status is `en_route`. Don't collapse this to a single button — the schema explicitly supports the three-state progression (`planned → en_route → delivered`), and the coordinator genuinely needs to distinguish "a truck left the depot" from "the truck actually arrived," since those are different operational facts during an active response.
- **Cut from this build: `expo-print`.** A native print module has unpredictable behavior on Android under time pressure and isn't worth the setup risk this week. Replace with a simple, well-formatted read-only summary view (the same information — vehicle, load, route, ETA, timestamp) plus a "Share" button using Expo's built-in `Share` API to send the summary as plain text/screenshot via any installed app. Same practical outcome for the demo, zero native build risk.

---

## 5. Design System (apply consistently across every screen above — don't reinvent per screen)

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32 (dp) — pick from this scale only, never an arbitrary number like 15 or 22. Store these as named constants in `theme/spacing.ts` (`spacing.sm = 8`, `spacing.md = 16`, etc.) and import them everywhere rather than hardcoding numbers inline.
- **Screen margins:** 20dp horizontal on every screen, consistently.
- **Touch targets:** minimum 48dp height on every button/tappable row — this is an Android accessibility guideline, not a suggestion.
- **Color palette:** one calm primary (blue/teal) for navigation/buttons, three urgency colors reserved _only_ for urgency badges/markers (red/orange/yellow — never reuse these for decoration elsewhere, or they lose meaning), a neutral gray scale for text/borders/backgrounds. Keep it to this palette — no additional accent colors.
- **Typography:** one font family, three sizes only (Heading 20sp/bold, Body 16sp/regular, Caption 13sp/regular). Resist the urge to introduce a fourth size for "just this one screen."
- **Loading states:** a single shared `LoadingSpinner` component, used everywhere — never a different spinner style per screen.

---

## 6. Environment (`.env.example`)

```bash
API_BASE_URL=http://<backend-dev-ip>:8000/api
```

## 7. Local Run

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your Android device, or press `a` for an Android emulator. Metro bundler runs on port `8081` by default — if that port is already taken on your machine, Expo will prompt you to use another one; if that happens, tell the team immediately since it doesn't affect backend integration but it's worth everyone knowing.
