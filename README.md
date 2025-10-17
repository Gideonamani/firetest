## FireTrack: Firebase + Next.js Practice Playground

FireTrack is a learning project designed to explore the end-to-end workflow of building, testing, and deploying a modern web app with Next.js and Firebase (Auth, Firestore, Storage, Functions, Messaging). The goal is to understand how Firebase Studio, local tools, and collaborative coding assistants fit together.

### Project Vision
- Ship a personal habit tracker that supports user sign-in, daily habit logging, streak insights, and optional sharing with friends.
- Treat Firebase Studio and local development as a unified workflow: build locally with Codex + Emulator Suite, review and iterate in Firebase Studio, then deploy to Firebase Hosting.
- Document decisions and lessons so future Firebase projects spin up quickly.

### Tech Stack
- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS (optional, TBD).
- **Firebase:** Authentication, Firestore, Cloud Functions, Cloud Storage, Cloud Messaging, Emulator Suite, Firebase Hosting.
- **Tooling:** npm scripts, ESLint, Prettier (configure later), GitHub or similar for remote sync.

### Learning Goals
- Practice securing Firestore with per-user rules and validating writes server-side.
- Explore Firebase Studio’s data browser, rule editor, and deployment dashboards.
- Automate deployments via `firebase deploy` once CI/CD needs become clear.
- Understand how to wire Cloud Messaging and scheduled reminders into Next.js flows.

### Planned Milestones
1. Scaffold base UI and set up Firebase config (env handling, Emulator Suite).
2. Implement authentication (email/password + one social provider).
3. Create habit CRUD UI, logging flow, and daily streak calculations.
4. Add user profiles with avatar upload (Firebase Storage) and sharing controls.
5. Introduce reminders via Cloud Functions + Messaging; explore analytics/reporting.
6. Harden security rules, add tests, and polish deployment pipeline.

### Getting Started Locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` while iterating. Firebase emulator setup and environment variable instructions will be added once the Firebase project is initialized.

### Local Development Workflow
- Run `npm run dev` for the Next.js app.
- In a separate terminal, start Firebase services with `npx firebase emulators:start`.
- Firebase Web Frameworks handles SSR builds and Hosting rewrites; deploy with `firebase deploy --only hosting` to generate and upload the Next.js backend (deployed to `europe-west1` because SSR hosting does not yet support `africa-south1`).

### Workflow Notes
- Keep work on `main`; branch off for larger experiments and merge back once tested.
- Always pull latest before starting a session (whether local or in Firebase Studio) to avoid drift.
- Track environment-specific steps and troubleshooting tips in this README or a `/docs` folder.

### Next Actions
- [ ] Initialize Firebase (CLI + Studio) and capture configuration steps.
- [ ] Decide on design system (Tailwind vs. CSS modules).
- [ ] Plan initial data models (`users`, `habits`, `entries`) and draft rules.
- [ ] Create a basic landing page describing the project for quick demos.
