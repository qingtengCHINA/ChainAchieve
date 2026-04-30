# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ChainAchieve** — Web3 learning achievement tokenization platform built for The Bags Hackathon. Teachers launch SPL achievement tokens via Bags SDK; students earn token shares by completing tasks; teachers collect perpetual royalties via Bags fee-sharing. Full MVP is implemented.

## Architecture

- **Monorepo**: npm workspaces — `backend/` (Express/Node.js/TypeScript) + `frontend/` (React/Vite)
- **Database**: SQLite via better-sqlite3 v12.9.0 (v9.x fails on Node v25)
- **Blockchain**: Solana Devnet + Bags SDK v1.3.7 + @solana/spl-token
- **Tests**: Vitest throughout — 14 backend tests + 2 frontend component tests

## Environment

Credentials are stored in `.env` (gitignored):

| Variable | Source |
|----------|--------|
| `BAGS_API_KEY` | Bags production API key (`bags_prod_*`) |
| `HELIUS_API_KEY` | Helius Solana RPC |
| `PLATFORM_PRIVATE_KEY` | Base58 keypair for signing token launches and SPL transfers |
| `PLATFORM_PUBLIC_KEY` | Corresponding public key |
| `PORT` | Backend port (default 3001) |

## Key Technical Notes

### Bags SDK v1.3.7 Constructor
```typescript
new BagsSDK(apiKey, connection, commitment)  // positional args, NOT object
```
Key methods: `sdk.tokenLaunch.createTokenInfoAndMetadata()`, `sdk.tokenLaunch.createLaunchTransaction()`, `sdk.config.createBagsFeeShareConfig()`, `sdk.fee.getAllClaimablePositions()`, `sdk.fee.getClaimTransactions()`

### Testability Pattern
`createApp(testDb?: DB)` accepts an injected `:memory:` database — avoids `vi.mock` TDZ issues with module-level variables. All backend tests use this pattern.

### React Dual-Instance Fix (Workspace Monorepo)
Root `node_modules` can have a different React version than `frontend/node_modules`. Fixed by:
1. Pinning React 18 in root `package.json` `dependencies`
2. `resolve.alias` in `vite.config.ts` pointing `react`/`react-dom` to `../node_modules/react`

### Valid Solana Test Addresses
Use `'So11111111111111111111111111111111111111112'` (wrapped SOL) — not arbitrary strings. Wrong base58 length throws at `new PublicKey()`.

## Commands

```bash
npm install          # install all workspaces
npm run dev:backend  # backend on :3001
npm run dev:frontend # frontend on :5173 (proxies /api → :3001)
npm test             # all 16 tests
```

## File Map

```
backend/src/
  types.ts          # Course, Task, Completion interfaces
  db.ts             # SQLite schema + queries (includes imageUrl column)
  sdk.ts            # BagsSDK singleton + getConnection()
  keypair.ts        # getPlatformKeypair() from base58
  index.ts          # createApp(testDb?) factory
  routes/
    tokens.ts       # POST /info, POST /launch
    courses.ts      # GET /courses, GET /courses/:id/tasks
    tasks.ts        # POST /tasks, POST /tasks/:id/complete + SPL transfer
    fees.ts         # GET /positions, POST /claim-txs
    resume.ts       # GET /resume

frontend/src/
  lib/api.ts        # Typed fetch wrapper + exported interfaces
  pages/
    TeacherPage.tsx  # Tabs: Create Course | My Courses | Royalties
    StudentPage.tsx  # Tabs: Browse Courses | Achievements
    ResumePage.tsx   # On-chain resume + JSON export
  components/
    CourseWizard.tsx    # 3-step token launch wizard
    TaskList.tsx        # Task completion list
    AchievementGrid.tsx # Earned achievement display
    RoyaltyPanel.tsx    # Fee-share claim UI
    WalletButton.tsx    # Phantom connect button
```
