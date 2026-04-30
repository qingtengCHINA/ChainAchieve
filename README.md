# ChainAchieve

**Learn. Complete. Earn.** — A Web3 learning platform where teachers launch tradeable achievement tokens via Bags.fm and students earn token shares by completing course tasks. Every task completion triggers an on-chain SPL token transfer; every completed course mints into an on-chain resume.

Built for The Bags Hackathon (Solana Devnet).

## How It Works

1. **Teacher** creates a course → Bags SDK mints a SPL token with metadata on Solana Devnet
2. **Teacher** adds tasks with token rewards (e.g. "Watch intro video → 100 tokens")
3. **Student** connects Phantom wallet, browses courses, completes tasks
4. **Platform** signs and sends SPL token transfers for each completion
5. **Student** views earned achievements as an on-chain resume, exportable as JSON
6. **Teacher** claims perpetual fee-share royalties via the Bags fee-sharing protocol

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + Solana Wallet Adapter |
| Backend | Node.js + Express + TypeScript + better-sqlite3 |
| Blockchain | Solana Devnet + Bags SDK v1.3.7 + @solana/spl-token |
| Infra | Fly.io (backend) + Vercel (frontend) |

## Monorepo Layout

```
chainachieve/
├── backend/          # Express API + Bags SDK integration
│   ├── src/
│   │   ├── routes/   # tokens, courses, tasks, fees, resume
│   │   ├── db.ts     # SQLite schema + queries
│   │   ├── sdk.ts    # BagsSDK singleton
│   │   └── keypair.ts
│   ├── tests/        # 14 Vitest tests
│   ├── fly.toml
│   └── Dockerfile
└── frontend/         # React SPA
    ├── src/
    │   ├── pages/    # TeacherPage, StudentPage, ResumePage
    │   ├── components/
    │   │   ├── CourseWizard.tsx   # 3-step token launch wizard
    │   │   ├── TaskList.tsx       # Task completion UI
    │   │   ├── AchievementGrid.tsx
    │   │   └── RoyaltyPanel.tsx   # Fee-share claim UI
    │   └── lib/api.ts
    ├── tests/        # 2 Vitest component tests
    └── vercel.json
```

## Local Development

```bash
# Install all dependencies
npm install

# Copy and fill in credentials
cp .env.example .env   # set BAGS_API_KEY, HELIUS_API_KEY, PLATFORM_PRIVATE_KEY

# Run backend (port 3001)
npm run dev:backend

# Run frontend (port 5173, proxies /api → 3001)
npm run dev:frontend

# Run all tests
npm test
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BAGS_API_KEY` | Bags production API key (`bags_prod_*`) |
| `HELIUS_API_KEY` | Helius Solana RPC key |
| `PLATFORM_PRIVATE_KEY` | Base58 keypair that signs token launches and SPL transfers |
| `PLATFORM_PUBLIC_KEY` | Corresponding public key |
| `PORT` | Backend port (default 3001) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tokens/info` | Create token metadata via Bags SDK |
| POST | `/api/tokens/launch` | Launch token on-chain |
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/:id/tasks` | List tasks for a course |
| POST | `/api/courses/:id/tasks` | Add a task |
| POST | `/api/tasks/:id/complete` | Mark task complete + transfer tokens |
| GET | `/api/student/completions` | Get student's completion history |
| GET | `/api/resume` | Get on-chain resume JSON for a wallet |
| GET | `/api/fees/positions` | Get claimable fee positions |
| POST | `/api/fees/claim-txs` | Get unsigned claim transactions |

## Deploy

```bash
# Backend → Fly.io
cd backend && fly deploy

# Frontend → Vercel
cd frontend && vercel --prod
```

## Tests

```
npm test
# Backend: 14 tests (db, tokens, tasks, fees, health)
# Frontend: 2 component tests (CourseWizard wizard flow)
```
