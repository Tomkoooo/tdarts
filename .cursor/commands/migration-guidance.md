# Current Architecture Snapshot

## Framework & Entry Points
- The repository is a Next.js application configured with the App Router (see `src/app/layout.tsx`, `src/app/page.tsx`, and route segments under `src/app`).
- API routes live under `src/app/api/**` and expose both REST-like endpoints and server actions.
- Client/UI components reside primarily in `src/components/**`, structured by feature (e.g., `board/`, `club/`, `tournament/`). Shared UI primitives are in `src/components/ui/`.

## Database Layer
- MongoDB is the current backing store. Connections are managed through `src/lib/mongoose.ts`, which keeps a cached connection and reads `MONGODB_URI`, `MONGODB_DB_NAME`.
- Data models live in `src/database/models/**` (Mongoose schemas). Key schemas:
  - `user.model.ts`: stores username, email, hashed password (bcrypt), verification flags, OAuth metadata. Pre-save hooks enforce validation and synchronize linked player names.
  - `player.model.ts`: tracks player profiles, stats, tournament history, optional `userRef` linking to `User`.
  - Additional models cover tournaments, matches, clubs, leagues, boards, etc.
- Business logic / data access wrappers are inside `src/database/services/**` (e.g., `auth.service.ts`, `tournament.service.ts`, `match.service.ts`). Services combine model access with validation, side effects, and cross-entity updates.

## Authentication & Authorization
- Local auth relies on `UserModel` with bcrypt password hashing in the schema hook. Auth routes/services are placed in `src/app/api/auth/**` and `src/database/services/auth.service.ts`.
- OAuth (Google) is supported via stored `googleId` and `authProvider` fields.
- Password reset, verification codes are stored inside the `codes` object embedded in user documents.
- Some routes use middleware helpers from `src/middleware/errorHandle.ts` and `src/lib/auth.ts`.

## Realtime & Utilities
- WebSocket support is defined in `src/lib/socket.ts` and `src/lib/socketApi.ts`, with pending match operations orchestrated in services.
- Utilities in `src/lib/utils.ts` and specialized helper files (e.g., `featureFlags.ts`, `mailer.ts`).
- Scripts in `scripts/` handle maintenance tasks (MMR migration, board migration, stat resets).

---

# Migration Roadmap to shadcn + Appwrite

## Goals & Target Stack
- Replace the existing UI with a fresh Next.js project scaffolded using the latest `create-next-app`, integrate shadcn/ui for component primitives, and adopt Appwrite for authentication, database, and potentially functions.

## Step-by-Step Plan
1. **Bootstrap New Frontend Base**
   - Initialize a new Next.js 14+ project (App Router) with TypeScript and Tailwind CSS support.
   - Install shadcn/ui: run `npx shadcn-ui@latest init`, configure the chosen theme, and import required components.
   - Configure layout, theming, and shared UI primitives that will replace `src/components/ui/**`.

2. **Integrate Appwrite SDK**
   - Add Appwrite Web SDK for client/browser interactions (`npm install appwrite`).
   - Set up the Appwrite endpoint/project IDs via environment variables.
   - Create service wrappers for common operations (auth, user profiles) akin to legacy `auth.service.ts`, but leveraging Appwrite.
   - For server-side needs, use Appwrite Functions or Appwrite’s REST APIs with API keys stored securely (e.g., Next.js Route Handlers or Edge Functions).

3. **Map Legacy Features to Appwrite**
   - **Auth:** Replace local bcrypt flow with Appwrite Email/Password auth. Support OAuth by configuring Appwrite’s built-in providers.
   - **Data:** Recreate collections in Appwrite Database to mirror existing models (users are stored in Appwrite Users; player profiles stored in a dedicated collection referencing `userId`).
   - **Realtime:** Evaluate Appwrite Realtime subscriptions or maintain a custom socket server if necessary.
   - **Feature Flags, Mail, etc.:** Migrate to Appwrite equivalents or external services; rewrite helper utilities accordingly.

4. **Data Migration Strategy**
   - Export existing MongoDB data (users, players, tournaments) via scripts or Mongo export tools.
   - **Users:** Import into Appwrite Users using Admin SDK:
     - Preserve legacy user IDs by passing them to `Users.create(userId, email, password, name)`.
     - Because Appwrite requires plain passwords, generate temporary passwords, flag users to reset, and trigger Appwrite’s password recovery flow.
     - Optionally build a bridging function: on first login, verify legacy password via old DB, then set Appwrite password and flag them as migrated.
   - **Player Profiles:** For each player document, create an Appwrite database document with the same fields, linking `userRef` to the associated Appwrite user ID.
   - **Other Collections:** Convert incrementally (clubs, tournaments, matches). Consider whether to migrate historical records or archive them.
   - **Testing:** Run migration in a staging Appwrite project first. Validate data integrity and auth flows before production cutover.

5. **Decommission Legacy Services**
   - Once Appwrite covers auth and database, remove old Mongoose models/services.
   - Replace API routes with Appwrite-backed route handlers or direct client calls to Appwrite.
   - Update scripts to use Appwrite APIs or Functions.

6. **Deployment & Rollout**
   - Launch the new Next.js + Appwrite app in parallel (staging), perform QA.
   - Plan a coordinated switchover: freeze writes on legacy MongoDB, run final migration, update DNS/environment to point clients to the new stack.

---

# Repository Reset Instructions

1. **Backup/Tag (Optional but Recommended)**
   - Create a tag or backup branch before wiping: `git tag legacy-main` or `git branch backup/v3` to preserve the old state.

2. **Clean Working Tree**
   ```bash
   git checkout v3            # or main, depending on target branch
   git pull                   # ensure up to date
   git clean -fdx             # remove untracked files (optional)
   ```

3. **Remove Project Files While Preserving Git History**
   ```bash
   rm -rf *                   # macOS/Linux
   rm -rf .* 2>/dev/null &
   ```
   - On Windows PowerShell: `Remove-Item * -Recurse -Force` and `Remove-Item .* -Recurse -Force`.
   - Ensure `.git/` remains intact.

4. **Commit the Clean Slate (Optional)**
   - Stage deletion: `git add -A`
   - Commit: `git commit -m "chore: reset repository"`

5. **Pull Down New Template**
   - Clone or copy the Next.js Appwrite starter template contents into the repo (e.g., `npx create-next-app@latest .` or `git clone <appwrite-template> temp && mv temp/* .`).
   - Install dependencies: `npm install` or `pnpm install`.
   - Configure environment variables for Appwrite (endpoint, project ID, API key).

6. **Initial Commit & Push**
   ```bash
   git add -A
   git commit -m "feat: bootstrap nextjs + shadcn + appwrite"
   git push origin <branch>
   ```

7. **Document the Migration**
   - Update project `README.md` with new stack instructions.
   - Keep this migration guidance in `docs/` for future reference.
