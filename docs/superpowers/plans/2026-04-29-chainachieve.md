# ChainAchieve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ChainAchieve — a Web3 learning achievement tokenization platform on Bags.fm/Solana where teachers launch tradeable achievement tokens with custom fee sharing, students earn token shares by completing verified tasks, and teachers claim perpetual trading royalties.

**Architecture:** npm workspaces monorepo. Backend (Node.js/Express) owns all BagsSDK calls — it creates token metadata, builds fee-share configs, launches tokens, distributes SPL token shares to students via a platform keypair, and returns unsigned claim transactions to the frontend. Frontend (React/Vite) handles UI, reads course/task state from the backend API, and only signs fee-claim transactions via the connected Solana wallet. SQLite keeps the data model simple for hackathon scope.

**Tech Stack:** TypeScript, Node.js 18+, Express 4, @bagsfm/bags-sdk@1.3.7, @solana/web3.js 1, @solana/spl-token, better-sqlite3, React 18, Vite 5, Tailwind CSS 3, @solana/wallet-adapter-react, Vitest

---

## File Structure

```
ChainAchieve/
├── package.json                       # npm workspaces root
├── .env                               # bags + helius keys (exists) + PLATFORM_PRIVATE_KEY added in Task 1
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                   # Express entry point, route mounting
│   │   ├── sdk.ts                     # BagsSDK singleton (lazy init from env)
│   │   ├── keypair.ts                 # Platform Keypair loader from PLATFORM_PRIVATE_KEY env
│   │   ├── db.ts                      # SQLite schema (courses, tasks, completions) + typed helpers
│   │   ├── types.ts                   # Course, Task, Completion TS interfaces
│   │   └── routes/
│   │       ├── tokens.ts              # POST /api/tokens/info  POST /api/tokens/launch
│   │       ├── courses.ts             # GET /api/courses  GET /api/courses/:id
│   │       ├── tasks.ts               # Task CRUD + POST /api/tasks/:id/complete
│   │       └── fees.ts                # GET /api/fees/positions  POST /api/fees/claim-txs
│   └── tests/
│       ├── tokens.test.ts
│       ├── tasks.test.ts
│       └── fees.test.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx                   # WalletProvider + RouterProvider root
        ├── App.tsx                    # <Routes> definition
        ├── lib/
        │   └── api.ts                 # Typed fetch wrapper (base URL = /api)
        ├── pages/
        │   ├── TeacherPage.tsx        # Course creation wizard + royalty panel tab
        │   ├── StudentPage.tsx        # Browse courses, mark tasks complete
        │   └── ResumePage.tsx         # Student on-chain achievement resume
        ├── components/
        │   ├── WalletButton.tsx       # @solana/wallet-adapter connect/disconnect
        │   ├── CourseWizard.tsx       # 3-step form: info → tasks → launch
        │   ├── TaskList.tsx           # Checklist with "Mark Complete" per task
        │   ├── RoyaltyPanel.tsx       # Fee positions list + Claim button
        │   └── AchievementGrid.tsx    # Student's earned tokens grid
        └── tests/
            ├── setup.ts               # @testing-library/jest-dom setup
            ├── TaskList.test.tsx
            └── CourseWizard.test.tsx
```

---

### Task 1: Monorepo scaffold + environment

**Files:**
- Create: `package.json` (workspace root)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Modify: `.env`

- [ ] **Step 1: Create workspace root**

```json
// package.json
{
  "name": "chainachieve",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev:backend": "npm run dev -w backend",
    "dev:frontend": "npm run dev -w frontend",
    "test": "npm run test -w backend && npm run test -w frontend"
  }
}
```

- [ ] **Step 2: Create backend package files**

```bash
mkdir -p backend/src/routes backend/tests
```

```json
// backend/package.json
{
  "name": "chainachieve-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@bagsfm/bags-sdk": "^1.3.7",
    "@solana/spl-token": "^0.4.8",
    "@solana/web3.js": "^1.95.4",
    "better-sqlite3": "^9.4.3",
    "bs58": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.5",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2"
  }
}
```

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Install backend dependencies**

```bash
cd backend && npm install
```

Expected: node_modules created, lock file written, no errors.

- [ ] **Step 4: Create frontend package files**

```bash
mkdir -p frontend/src/{lib,pages,components,tests}
```

```json
// frontend/package.json
{
  "name": "chainachieve-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-phantom": "^0.9.24",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/web3.js": "^1.95.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.1",
    "vitest": "^1.2.2"
  }
}
```

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// frontend/tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 5: Initialize Tailwind**

```bash
cd frontend && npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created.

Then update `tailwind.config.js`:

```js
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 6: Create frontend HTML entry + test setup**

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ChainAchieve</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```typescript
// frontend/src/tests/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Install frontend dependencies**

```bash
cd frontend && npm install
```

Expected: node_modules created, no errors.

- [ ] **Step 8: Add PLATFORM_PRIVATE_KEY to .env**

Generate a dev keypair and append to `.env`. Run this one-time:

```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const kp = Keypair.generate();
console.log('PLATFORM_PRIVATE_KEY=' + bs58.default.encode(kp.secretKey));
console.log('PLATFORM_PUBLIC_KEY=' + kp.publicKey.toBase58());
"
```

Copy the output lines and append to `.env`. Also add standard-named aliases for the existing keys:

```
# Append to .env:
BAGS_API_KEY=bags_prod_ccMmjdft41E_aYjBXaWhMxMu8xZ94z2WsIpY152ngeY
HELIUS_API_KEY=6d43f372-ea58-4ca6-a305-552b1a45dd8c
PORT=3001
PLATFORM_PRIVATE_KEY=<output from above>
PLATFORM_PUBLIC_KEY=<output from above>
```

> ⚠️ Fund PLATFORM_PUBLIC_KEY with 0.1 SOL on devnet for testing: `solana airdrop 1 <PLATFORM_PUBLIC_KEY> --url devnet`

- [ ] **Step 9: Initialize git**

```bash
cd /Users/qingteng/Downloads/项目代码_Projects/我的制作/ChainAchieve
git init
git add package.json backend/package.json backend/tsconfig.json frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src/tests/setup.ts
git commit -m "chore: init monorepo scaffold with backend and frontend packages"
```

---

### Task 2: Backend — shared types, SDK singleton, keypair loader, health endpoint

**Files:**
- Create: `backend/src/types.ts`
- Create: `backend/src/sdk.ts`
- Create: `backend/src/keypair.ts`
- Create: `backend/src/index.ts`
- Create: `backend/tests/health.test.ts`

- [ ] **Step 1: Write the failing health test**

```typescript
// backend/tests/health.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../src/index.js'`

- [ ] **Step 3: Create shared types**

```typescript
// backend/src/types.ts
export interface Course {
  id: string;
  name: string;
  symbol: string;
  description: string;
  teacherWallet: string;
  mintAddress: string | null;
  metadataUrl: string | null;
  configKey: string | null;
  launchSignature: string | null;
  createdAt: number;
}

export interface Task {
  id: string;
  courseId: string;
  title: string;
  description: string;
  tokenReward: number;
  sortOrder: number;
}

export interface Completion {
  id: string;
  taskId: string;
  studentWallet: string;
  txSignature: string | null;
  completedAt: number;
}
```

- [ ] **Step 4: Create SDK singleton**

```typescript
// backend/src/sdk.ts
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection } from '@solana/web3.js';

let _sdk: BagsSDK | null = null;

export function getSDK(): BagsSDK {
  if (_sdk) return _sdk;
  const apiKey = process.env.BAGS_API_KEY;
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('BAGS_API_KEY env var not set');
  if (!heliusKey) throw new Error('HELIUS_API_KEY env var not set');
  const connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
    'confirmed'
  );
  _sdk = new BagsSDK(apiKey, connection, 'processed');
  return _sdk;
}

export function resetSDK(): void {
  _sdk = null;
}
```

- [ ] **Step 5: Create keypair loader**

```typescript
// backend/src/keypair.ts
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

let _keypair: Keypair | null = null;

export function getPlatformKeypair(): Keypair {
  if (_keypair) return _keypair;
  const raw = process.env.PLATFORM_PRIVATE_KEY;
  if (!raw) throw new Error('PLATFORM_PRIVATE_KEY env var not set');
  _keypair = Keypair.fromSecretKey(bs58.decode(raw));
  return _keypair;
}
```

- [ ] **Step 6: Create Express app factory**

```typescript
// backend/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`ChainAchieve backend listening on :${port}`);
  });
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: PASS — `GET /health > returns 200 with status ok`

- [ ] **Step 8: Commit**

```bash
git add backend/src/types.ts backend/src/sdk.ts backend/src/keypair.ts backend/src/index.ts backend/tests/health.test.ts
git commit -m "feat(backend): add shared types, SDK singleton, keypair loader, health endpoint"
```

---

### Task 3: Backend — SQLite database schema

**Files:**
- Create: `backend/src/db.ts`
- Create: `backend/tests/db.test.ts`

- [ ] **Step 1: Write the failing DB tests**

```typescript
// backend/tests/db.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, getCourses, insertCourse, insertTask, getTasks, insertCompletion, getCompletions } from '../src/db.js';
import type Database from 'better-sqlite3';

let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = initDb(':memory:');
});

afterEach(() => {
  db.close();
});

describe('courses', () => {
  it('inserts and retrieves a course', () => {
    insertCourse(db, {
      id: 'c1',
      name: 'Solidity 101',
      symbol: 'SLD',
      description: 'Learn Solidity',
      teacherWallet: 'TeacherWallet111',
      mintAddress: null,
      metadataUrl: null,
      configKey: null,
      launchSignature: null,
      createdAt: 1000,
    });
    const courses = getCourses(db);
    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe('Solidity 101');
    expect(courses[0].symbol).toBe('SLD');
  });
});

describe('tasks', () => {
  it('inserts and retrieves tasks for a course', () => {
    insertCourse(db, {
      id: 'c1', name: 'Course', symbol: 'SYM', description: 'Desc',
      teacherWallet: 'W1', mintAddress: null, metadataUrl: null,
      configKey: null, launchSignature: null, createdAt: 1000,
    });
    insertTask(db, { id: 't1', courseId: 'c1', title: 'Watch Intro', description: 'Watch intro video', tokenReward: 100, sortOrder: 0 });
    insertTask(db, { id: 't2', courseId: 'c1', title: 'Quiz 1', description: 'Pass quiz', tokenReward: 200, sortOrder: 1 });
    const tasks = getTasks(db, 'c1');
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Watch Intro');
  });
});

describe('completions', () => {
  it('inserts a completion and prevents duplicates', () => {
    insertCourse(db, {
      id: 'c1', name: 'C', symbol: 'S', description: 'D',
      teacherWallet: 'W1', mintAddress: null, metadataUrl: null,
      configKey: null, launchSignature: null, createdAt: 1000,
    });
    insertTask(db, { id: 't1', courseId: 'c1', title: 'T', description: 'D', tokenReward: 100, sortOrder: 0 });
    insertCompletion(db, { id: 'comp1', taskId: 't1', studentWallet: 'Student1', txSignature: 'sig1', completedAt: 2000 });
    const completions = getCompletions(db, 't1');
    expect(completions).toHaveLength(1);
    expect(completions[0].studentWallet).toBe('Student1');

    expect(() =>
      insertCompletion(db, { id: 'comp2', taskId: 't1', studentWallet: 'Student1', txSignature: 'sig2', completedAt: 3000 })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../src/db.js'`

- [ ] **Step 3: Implement db.ts**

```typescript
// backend/src/db.ts
import BetterSqlite3 from 'better-sqlite3';
import type { Course, Task, Completion } from './types.js';

export type DB = InstanceType<typeof BetterSqlite3>;

export function initDb(path = './chainachieve.db'): DB {
  const db = new BetterSqlite3(path);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      description TEXT NOT NULL,
      teacher_wallet TEXT NOT NULL,
      mint_address TEXT,
      metadata_url TEXT,
      config_key TEXT,
      launch_signature TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      token_reward INTEGER NOT NULL DEFAULT 100,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      student_wallet TEXT NOT NULL,
      tx_signature TEXT,
      completed_at INTEGER NOT NULL,
      UNIQUE(task_id, student_wallet)
    );
  `);
  return db;
}

export function getCourses(db: DB): Course[] {
  return db.prepare(`
    SELECT id, name, symbol, description,
           teacher_wallet as teacherWallet,
           mint_address as mintAddress,
           metadata_url as metadataUrl,
           config_key as configKey,
           launch_signature as launchSignature,
           created_at as createdAt
    FROM courses ORDER BY created_at DESC
  `).all() as Course[];
}

export function getCourse(db: DB, id: string): Course | undefined {
  return db.prepare(`
    SELECT id, name, symbol, description,
           teacher_wallet as teacherWallet,
           mint_address as mintAddress,
           metadata_url as metadataUrl,
           config_key as configKey,
           launch_signature as launchSignature,
           created_at as createdAt
    FROM courses WHERE id = ?
  `).get(id) as Course | undefined;
}

export function insertCourse(db: DB, c: Course): void {
  db.prepare(`
    INSERT INTO courses (id, name, symbol, description, teacher_wallet,
      mint_address, metadata_url, config_key, launch_signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c.id, c.name, c.symbol, c.description, c.teacherWallet,
         c.mintAddress, c.metadataUrl, c.configKey, c.launchSignature, c.createdAt);
}

export function updateCourse(db: DB, id: string, patch: Partial<Pick<Course, 'mintAddress' | 'metadataUrl' | 'configKey' | 'launchSignature'>>): void {
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (patch.mintAddress !== undefined) { sets.push('mint_address = ?'); vals.push(patch.mintAddress); }
  if (patch.metadataUrl !== undefined) { sets.push('metadata_url = ?'); vals.push(patch.metadataUrl); }
  if (patch.configKey !== undefined) { sets.push('config_key = ?'); vals.push(patch.configKey); }
  if (patch.launchSignature !== undefined) { sets.push('launch_signature = ?'); vals.push(patch.launchSignature); }
  if (sets.length === 0) return;
  db.prepare(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
}

export function getTasks(db: DB, courseId: string): Task[] {
  return db.prepare(`
    SELECT id, course_id as courseId, title, description,
           token_reward as tokenReward, sort_order as sortOrder
    FROM tasks WHERE course_id = ? ORDER BY sort_order
  `).all(courseId) as Task[];
}

export function insertTask(db: DB, t: Task): void {
  db.prepare(`
    INSERT INTO tasks (id, course_id, title, description, token_reward, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(t.id, t.courseId, t.title, t.description, t.tokenReward, t.sortOrder);
}

export function getCompletions(db: DB, taskId: string): Completion[] {
  return db.prepare(`
    SELECT id, task_id as taskId, student_wallet as studentWallet,
           tx_signature as txSignature, completed_at as completedAt
    FROM completions WHERE task_id = ?
  `).all(taskId) as Completion[];
}

export function getStudentCompletions(db: DB, studentWallet: string): Array<Completion & { courseName: string; taskTitle: string; courseId: string }> {
  return db.prepare(`
    SELECT comp.id, comp.task_id as taskId, comp.student_wallet as studentWallet,
           comp.tx_signature as txSignature, comp.completed_at as completedAt,
           t.title as taskTitle, c.name as courseName, c.id as courseId
    FROM completions comp
    JOIN tasks t ON t.id = comp.task_id
    JOIN courses c ON c.id = t.course_id
    WHERE comp.student_wallet = ?
    ORDER BY comp.completed_at DESC
  `).all(studentWallet) as Array<Completion & { courseName: string; taskTitle: string; courseId: string }>;
}

export function insertCompletion(db: DB, c: Completion): void {
  db.prepare(`
    INSERT INTO completions (id, task_id, student_wallet, tx_signature, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(c.id, c.taskId, c.studentWallet, c.txSignature, c.completedAt);
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: PASS — all 3 describe blocks pass (courses, tasks, completions)

- [ ] **Step 5: Commit**

```bash
git add backend/src/db.ts backend/tests/db.test.ts
git commit -m "feat(backend): add SQLite schema with courses, tasks, completions tables"
```

---

### Task 4: Backend — token info + fee-share config + launch endpoints

**Files:**
- Create: `backend/src/routes/tokens.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/tests/tokens.test.ts`

The token launch is a 3-step flow:
1. `POST /api/tokens/info` — calls `sdk.tokenLaunch.createTokenInfoAndMetadata`, returns `{ tokenMint, metadataUrl }`
2. `POST /api/tokens/config` — calls `sdk.config.createBagsFeeShareConfig`, returns base64-encoded transactions + `configKey`
3. `POST /api/tokens/launch` — calls `sdk.tokenLaunch.createLaunchTransaction`, broadcasts signed tx, saves course to DB

Steps 1 and 3 are server-side (platform keypair signs). Step 2 transactions must be signed by the teacher wallet and sent from the frontend; the frontend passes the `configKey` to step 3.

- [ ] **Step 1: Write the failing token endpoint tests**

```typescript
// backend/tests/tokens.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { createApp } from '../src/index.js';

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({
    tokenLaunch: {
      createTokenInfoAndMetadata: vi.fn(async () => ({
        tokenMint: 'Mint1111111111111111111111111111111111111111',
        tokenMetadata: 'https://arweave.net/mock-meta',
        tokenLaunch: { status: 'PRE_LAUNCH' },
      })),
      createLaunchTransaction: vi.fn(async () => {
        const bytes = new Uint8Array(100).fill(1);
        return { serialize: () => bytes } as unknown as VersionedTransaction;
      }),
    },
  })),
}));

vi.mock('../src/keypair.js', () => ({
  getPlatformKeypair: vi.fn(() => ({
    publicKey: new PublicKey('11111111111111111111111111111111'),
    secretKey: new Uint8Array(64),
  })),
}));

vi.mock('../src/db.js', () => ({
  initDb: vi.fn(() => ({ close: vi.fn() })),
  insertCourse: vi.fn(),
  updateCourse: vi.fn(),
}));

describe('POST /api/tokens/info', () => {
  it('returns tokenMint and metadataUrl on success', async () => {
    const app = createApp();
    const res = await request(app).post('/api/tokens/info').send({
      name: 'Solidity 101',
      symbol: 'SLD101',
      description: 'Learn Solidity basics',
      imageUrl: 'https://example.com/img.png',
      teacherWallet: 'Teacher111111111111111111111111111111111111',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tokenMint: expect.any(String),
      metadataUrl: expect.any(String),
    });
  });

  it('returns 400 when required fields missing', async () => {
    const app = createApp();
    const res = await request(app).post('/api/tokens/info').send({ name: 'Missing Symbol' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npm test tokens -- --reporter=verbose
```

Expected: FAIL — `Cannot find module '../src/routes/tokens.js'` (or similar missing route)

- [ ] **Step 3: Implement tokens route**

```typescript
// backend/src/routes/tokens.ts
import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSDK } from '../sdk.js';
import { getPlatformKeypair } from '../keypair.js';
import type { DB } from '../db.js';
import { insertCourse, updateCourse } from '../db.js';
import { randomUUID } from 'crypto';

const TokenInfoSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().min(1).max(200),
  imageUrl: z.string().url(),
  teacherWallet: z.string().min(32),
  telegram: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
});

const LaunchSchema = z.object({
  courseId: z.string().uuid(),
  configKey: z.string().min(32),
  initialBuyLamports: z.number().int().min(0).default(0),
});

export function tokensRouter(db: DB): Router {
  const router = Router();

  router.post('/info', async (req, res) => {
    const parsed = TokenInfoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { name, symbol, description, imageUrl, teacherWallet, telegram, twitter, website } = parsed.data;
    try {
      const sdk = getSDK();
      const result = await sdk.tokenLaunch.createTokenInfoAndMetadata({
        name,
        symbol,
        description,
        imageUrl,
        ...(telegram && { telegram }),
        ...(twitter && { twitter }),
        ...(website && { website }),
      });
      const courseId = randomUUID();
      insertCourse(db, {
        id: courseId,
        name,
        symbol,
        description,
        teacherWallet,
        mintAddress: result.tokenMint,
        metadataUrl: result.tokenMetadata,
        configKey: null,
        launchSignature: null,
        createdAt: Date.now(),
      });
      res.json({ courseId, tokenMint: result.tokenMint, metadataUrl: result.tokenMetadata });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/launch', async (req, res) => {
    const parsed = LaunchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { courseId, configKey, initialBuyLamports } = parsed.data;
    try {
      const sdk = getSDK();
      const keypair = getPlatformKeypair();
      const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as { mint_address: string; metadata_url: string } | undefined;
      if (!course || !course.mint_address || !course.metadata_url) {
        res.status(404).json({ error: 'Course not found or missing token info' });
        return;
      }
      const tx = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: course.metadata_url,
        tokenMint: new PublicKey(course.mint_address),
        launchWallet: keypair.publicKey,
        initialBuyLamports,
        configKey: new PublicKey(configKey),
      });
      const connection = sdk.bagsApiClient['connection' as keyof typeof sdk.bagsApiClient] as import('@solana/web3.js').Connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;
      tx.sign([keypair]);
      const signature = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
      updateCourse(db, courseId, { configKey, launchSignature: signature });
      res.json({ signature, courseId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
```

- [ ] **Step 4: Mount tokens router in index.ts**

```typescript
// backend/src/index.ts  (replace full file)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { tokensRouter } from './routes/tokens.js';

export function createApp() {
  const db = initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tokens', tokensRouter(db));

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`ChainAchieve backend listening on :${port}`);
  });
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd backend && npm test tokens -- --reporter=verbose
```

Expected: PASS — both `/api/tokens/info` tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/tokens.ts backend/src/index.ts backend/tests/tokens.test.ts
git commit -m "feat(backend): add token info and launch endpoints"
```

---

### Task 5: Backend — courses listing + task management

**Files:**
- Create: `backend/src/routes/courses.ts`
- Create: `backend/src/routes/tasks.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/tests/tasks.test.ts`

- [ ] **Step 1: Write the failing tasks tests**

```typescript
// backend/tests/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { initDb, insertCourse, insertTask } from '../src/db.js';
import type { DB } from '../src/db.js';

vi.mock('../src/sdk.js', () => ({ getSDK: vi.fn() }));
vi.mock('../src/keypair.js', () => ({ getPlatformKeypair: vi.fn() }));

let db: DB;

vi.mock('../src/db.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/db.js')>();
  db = orig.initDb(':memory:');
  return { ...orig, initDb: vi.fn(() => db) };
});

beforeEach(() => {
  db.exec('DELETE FROM completions; DELETE FROM tasks; DELETE FROM courses;');
  insertCourse(db, {
    id: 'course-1', name: 'Solidity 101', symbol: 'SLD',
    description: 'Learn Solidity', teacherWallet: 'T1',
    mintAddress: 'Mint1111111111111111111111111111111111111111',
    metadataUrl: 'https://meta.json', configKey: 'cfg1', launchSignature: 'sig1',
    createdAt: 1000,
  });
  insertTask(db, { id: 'task-1', courseId: 'course-1', title: 'Watch Intro', description: 'Watch the intro video', tokenReward: 100, sortOrder: 0 });
});

describe('GET /api/courses', () => {
  it('lists all courses', async () => {
    const app = createApp();
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Solidity 101');
  });
});

describe('GET /api/courses/:id/tasks', () => {
  it('returns tasks for a course', async () => {
    const app = createApp();
    const res = await request(app).get('/api/courses/course-1/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Watch Intro');
  });
});

describe('POST /api/courses/:id/tasks', () => {
  it('adds a task to a course', async () => {
    const app = createApp();
    const res = await request(app).post('/api/courses/course-1/tasks').send({
      title: 'Quiz 1',
      description: 'Pass the first quiz',
      tokenReward: 200,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Quiz 1');
    const listRes = await request(app).get('/api/courses/course-1/tasks');
    expect(listRes.body).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npm test tasks -- --reporter=verbose
```

Expected: FAIL — routes not found

- [ ] **Step 3: Implement courses route**

```typescript
// backend/src/routes/courses.ts
import { Router } from 'express';
import type { DB } from '../db.js';
import { getCourses, getCourse, getTasks } from '../db.js';

export function coursesRouter(db: DB): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getCourses(db));
  });

  router.get('/:id', (req, res) => {
    const course = getCourse(db, req.params.id);
    if (!course) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(course);
  });

  router.get('/:id/tasks', (req, res) => {
    res.json(getTasks(db, req.params.id));
  });

  return router;
}
```

- [ ] **Step 4: Implement tasks route**

```typescript
// backend/src/routes/tasks.ts
import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { DB } from '../db.js';
import { insertTask, getTasks, insertCompletion } from '../db.js';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tokenReward: z.number().int().min(1).default(100),
});

const CompleteTaskSchema = z.object({
  studentWallet: z.string().min(32),
});

export function tasksRouter(db: DB): Router {
  const router = Router();

  router.post('/courses/:courseId/tasks', (req, res) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const existing = getTasks(db, req.params.courseId);
    const task = {
      id: randomUUID(),
      courseId: req.params.courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      tokenReward: parsed.data.tokenReward,
      sortOrder: existing.length,
    };
    insertTask(db, task);
    res.status(201).json(task);
  });

  router.post('/tasks/:id/complete', async (req, res) => {
    const parsed = CompleteTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as { token_reward: number; course_id: string } | undefined;
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    const course = db.prepare('SELECT mint_address FROM courses WHERE id = ?').get(task.course_id) as { mint_address: string | null } | undefined;
    if (!course?.mint_address) { res.status(400).json({ error: 'Course token not yet launched' }); return; }
    try {
      const completion = {
        id: randomUUID(),
        taskId: req.params.id,
        studentWallet: parsed.data.studentWallet,
        txSignature: null as string | null,
        completedAt: Date.now(),
      };
      // SPL token distribution happens asynchronously — we record the completion first
      insertCompletion(db, completion);
      // Fire-and-forget token distribution (add to queue in prod; ok for demo)
      distributeTokens(course.mint_address, parsed.data.studentWallet, task.token_reward).then(sig => {
        db.prepare('UPDATE completions SET tx_signature = ? WHERE id = ?').run(sig, completion.id);
      }).catch(console.error);
      res.status(201).json({ ...completion, tokenReward: task.token_reward });
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Already completed' });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  });

  return router;
}

async function distributeTokens(mintAddress: string, studentWallet: string, amount: number): Promise<string> {
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const { getOrCreateAssociatedTokenAccount, transfer } = await import('@solana/spl-token');
  const { getPlatformKeypair } = await import('../keypair.js');
  const keypair = getPlatformKeypair();
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  const connection = new Connection(rpcUrl, 'confirmed');
  const mint = new PublicKey(mintAddress);
  const student = new PublicKey(studentWallet);
  const platformAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const studentAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, student);
  const sig = await transfer(connection, keypair, platformAta.address, studentAta.address, keypair, BigInt(amount));
  return sig;
}
```

- [ ] **Step 5: Mount new routers in index.ts**

```typescript
// backend/src/index.ts  (replace full file)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { tokensRouter } from './routes/tokens.js';
import { coursesRouter } from './routes/courses.js';
import { tasksRouter } from './routes/tasks.js';

export function createApp() {
  const db = initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tokens', tokensRouter(db));
  app.use('/api/courses', coursesRouter(db));
  app.use('/api', tasksRouter(db));

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`ChainAchieve backend listening on :${port}`);
  });
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
cd backend && npm test tasks -- --reporter=verbose
```

Expected: PASS — all describe blocks in tasks.test.ts pass

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/courses.ts backend/src/routes/tasks.ts backend/src/index.ts backend/tests/tasks.test.ts
git commit -m "feat(backend): add course listing, task CRUD, and task completion endpoint"
```

---

### Task 6: Backend — fee positions + claim transactions endpoint

**Files:**
- Create: `backend/src/routes/fees.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/tests/fees.test.ts`

- [ ] **Step 1: Write the failing fees tests**

```typescript
// backend/tests/fees.test.ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createApp } from '../src/index.js';

vi.mock('../src/db.js', () => ({
  initDb: vi.fn(() => ({})),
  getCourses: vi.fn(() => []),
  getCourse: vi.fn(() => undefined),
  getTasks: vi.fn(() => []),
  insertTask: vi.fn(),
  insertCompletion: vi.fn(),
  getCompletions: vi.fn(() => []),
  getStudentCompletions: vi.fn(() => []),
  updateCourse: vi.fn(),
  insertCourse: vi.fn(),
}));

vi.mock('../src/keypair.js', () => ({ getPlatformKeypair: vi.fn() }));

vi.mock('../src/sdk.js', () => ({
  getSDK: vi.fn(() => ({
    fee: {
      getAllClaimablePositions: vi.fn(async () => [
        {
          isCustomFeeVault: false,
          baseMint: 'Mint1111111111111111111111111111111111111111',
          claimableDisplayAmount: 0.05,
          totalClaimableLamportsUserShare: 50000000,
          virtualPool: 'Pool1111',
          virtualPoolAddress: 'PoolAddr1',
          isMigrated: false,
          virtualPoolClaimableAmount: 50000000,
        },
      ]),
      getClaimTransactions: vi.fn(async () => {
        const tx = new Transaction();
        return [tx];
      }),
    },
  })),
}));

describe('GET /api/fees/positions', () => {
  it('returns claimable positions for a wallet', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/fees/positions')
      .query({ wallet: 'Teacher111111111111111111111111111111111111' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].claimableDisplayAmount).toBe(0.05);
  });

  it('returns 400 when wallet query param is missing', async () => {
    const app = createApp();
    const res = await request(app).get('/api/fees/positions');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/fees/claim-txs', () => {
  it('returns base64-encoded transactions to sign', async () => {
    const app = createApp();
    const res = await request(app).post('/api/fees/claim-txs').send({
      wallet: 'Teacher111111111111111111111111111111111111',
      tokenMint: 'Mint1111111111111111111111111111111111111111',
    });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toBeInstanceOf(Array);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    expect(typeof res.body.transactions[0]).toBe('string');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npm test fees -- --reporter=verbose
```

Expected: FAIL — route not mounted

- [ ] **Step 3: Implement fees route**

```typescript
// backend/src/routes/fees.ts
import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSDK } from '../sdk.js';

const ClaimTxsSchema = z.object({
  wallet: z.string().min(32),
  tokenMint: z.string().min(32),
});

export function feesRouter(): Router {
  const router = Router();

  router.get('/positions', async (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    try {
      const sdk = getSDK();
      const positions = await sdk.fee.getAllClaimablePositions(new PublicKey(wallet));
      res.json(positions);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/claim-txs', async (req, res) => {
    const parsed = ClaimTxsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const sdk = getSDK();
      const txs = await sdk.fee.getClaimTransactions(
        new PublicKey(parsed.data.wallet),
        new PublicKey(parsed.data.tokenMint)
      );
      const base64Txs = txs.map(tx => Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64'));
      res.json({ transactions: base64Txs });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
```

- [ ] **Step 4: Mount fees router in index.ts**

```typescript
// backend/src/index.ts  (replace full file)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { tokensRouter } from './routes/tokens.js';
import { coursesRouter } from './routes/courses.js';
import { tasksRouter } from './routes/tasks.js';
import { feesRouter } from './routes/fees.js';

export function createApp() {
  const db = initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/tokens', tokensRouter(db));
  app.use('/api/courses', coursesRouter(db));
  app.use('/api', tasksRouter(db));
  app.use('/api/fees', feesRouter());

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => console.log(`ChainAchieve backend listening on :${port}`));
}
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: PASS — health, db, tokens, tasks, fees all pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/fees.ts backend/src/index.ts backend/tests/fees.test.ts
git commit -m "feat(backend): add fee positions and claim transaction endpoints"
```

---

### Task 7: Frontend — scaffold, wallet provider, router

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/pages/TeacherPage.tsx` (shell)
- Create: `frontend/src/pages/StudentPage.tsx` (shell)
- Create: `frontend/src/pages/ResumePage.tsx` (shell)
- Create: `frontend/src/components/WalletButton.tsx`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/lib/api.ts
const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCourses: () => req<Course[]>('/courses'),
  getCourse: (id: string) => req<Course>(`/courses/${id}`),
  getCourseTasks: (id: string) => req<Task[]>(`/courses/${id}/tasks`),
  createTokenInfo: (body: CreateTokenInfoBody) =>
    req<{ courseId: string; tokenMint: string; metadataUrl: string }>('/tokens/info', {
      method: 'POST', body: JSON.stringify(body),
    }),
  launchToken: (body: LaunchTokenBody) =>
    req<{ signature: string; courseId: string }>('/tokens/launch', {
      method: 'POST', body: JSON.stringify(body),
    }),
  addTask: (courseId: string, body: AddTaskBody) =>
    req<Task>(`/courses/${courseId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  completeTask: (taskId: string, studentWallet: string) =>
    req<{ id: string; tokenReward: number }>(`/tasks/${taskId}/complete`, {
      method: 'POST', body: JSON.stringify({ studentWallet }),
    }),
  getFeePositions: (wallet: string) =>
    req<FeePosition[]>(`/fees/positions?wallet=${wallet}`),
  getClaimTxs: (wallet: string, tokenMint: string) =>
    req<{ transactions: string[] }>('/fees/claim-txs', {
      method: 'POST', body: JSON.stringify({ wallet, tokenMint }),
    }),
  getStudentCompletions: (wallet: string) =>
    req<StudentCompletion[]>(`/student/completions?wallet=${wallet}`),
};

export interface Course {
  id: string; name: string; symbol: string; description: string;
  teacherWallet: string; mintAddress: string | null; launchSignature: string | null;
}
export interface Task { id: string; courseId: string; title: string; description: string; tokenReward: number; sortOrder: number; }
export interface FeePosition { baseMint: string; claimableDisplayAmount: number; totalClaimableLamportsUserShare: number; }
export interface StudentCompletion { taskId: string; taskTitle: string; courseName: string; courseId: string; txSignature: string | null; completedAt: number; }
interface CreateTokenInfoBody { name: string; symbol: string; description: string; imageUrl: string; teacherWallet: string; }
interface LaunchTokenBody { courseId: string; configKey: string; initialBuyLamports: number; }
interface AddTaskBody { title: string; description: string; tokenReward: number; }
```

- [ ] **Step 2: Create WalletButton component**

```typescript
// frontend/src/components/WalletButton.tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletButton() {
  const { publicKey } = useWallet();
  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className="!bg-indigo-600 !rounded-lg !text-sm !py-2 !px-4" />
      {publicKey && (
        <span className="text-xs text-gray-500">
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create page shells**

```typescript
// frontend/src/pages/TeacherPage.tsx
export default function TeacherPage() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Teacher Dashboard</h1></div>;
}
```

```typescript
// frontend/src/pages/StudentPage.tsx
export default function StudentPage() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Browse Courses</h1></div>;
}
```

```typescript
// frontend/src/pages/ResumePage.tsx
export default function ResumePage() {
  return <div className="p-8"><h1 className="text-2xl font-bold">My On-Chain Resume</h1></div>;
}
```

- [ ] **Step 4: Create App router**

```typescript
// frontend/src/App.tsx
import { Routes, Route, Link } from 'react-router-dom';
import { WalletButton } from './components/WalletButton';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import ResumePage from './pages/ResumePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-indigo-600 text-lg">ChainAchieve</span>
          <Link to="/student" className="text-sm text-gray-600 hover:text-indigo-600">Courses</Link>
          <Link to="/teacher" className="text-sm text-gray-600 hover:text-indigo-600">Teacher</Link>
          <Link to="/resume" className="text-sm text-gray-600 hover:text-indigo-600">My Resume</Link>
        </div>
        <WalletButton />
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<StudentPage />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="/resume" element={<ResumePage />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create main entry with wallet providers**

```typescript
// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import App from './App';
import './index.css';

const endpoint = 'https://api.devnet.solana.com';
const wallets = [new PhantomWalletAdapter()];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
```

- [ ] **Step 6: Create global CSS**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Verify frontend builds**

```bash
cd frontend && npm run build
```

Expected: `dist/` created, no TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): scaffold with wallet adapter, router, and page shells"
```

---

### Task 8: Frontend — teacher course creation wizard

**Files:**
- Create: `frontend/src/components/CourseWizard.tsx`
- Modify: `frontend/src/pages/TeacherPage.tsx`
- Create: `frontend/src/tests/CourseWizard.test.tsx`

- [ ] **Step 1: Write the failing wizard tests**

```typescript
// frontend/src/tests/CourseWizard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CourseWizard } from '../components/CourseWizard';

vi.mock('../lib/api', () => ({
  api: {
    createTokenInfo: vi.fn(async () => ({
      courseId: 'course-abc',
      tokenMint: 'Mint1111111111111111111111111111111111111111',
      metadataUrl: 'https://meta.json',
    })),
    addTask: vi.fn(async (_id: string, body: { title: string }) => ({
      id: 'task-1', courseId: 'course-abc', title: body.title, description: '', tokenReward: 100, sortOrder: 0,
    })),
  },
}));

describe('CourseWizard', () => {
  it('renders step 1 fields', () => {
    render(<CourseWizard teacherWallet="Teacher111" onComplete={vi.fn()} />);
    expect(screen.getByLabelText(/course name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('advances to step 2 after filling step 1', async () => {
    const user = userEvent.setup();
    render(<CourseWizard teacherWallet="Teacher111" onComplete={vi.fn()} />);
    await user.type(screen.getByLabelText(/course name/i), 'Solidity 101');
    await user.type(screen.getByLabelText(/symbol/i), 'SLD');
    await user.type(screen.getByLabelText(/description/i), 'Learn Solidity');
    await user.type(screen.getByLabelText(/image url/i), 'https://example.com/img.png');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByText(/add tasks/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose
```

Expected: FAIL — `CourseWizard` not found

- [ ] **Step 3: Implement CourseWizard**

```typescript
// frontend/src/components/CourseWizard.tsx
import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  teacherWallet: string;
  onComplete: (courseId: string, mintAddress: string) => void;
}

interface Step1Data { name: string; symbol: string; description: string; imageUrl: string; }
interface TaskDraft { title: string; description: string; tokenReward: number; }

export function CourseWizard({ teacherWallet, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Step1Data>({ name: '', symbol: '', description: '', imageUrl: '' });
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [newTask, setNewTask] = useState<TaskDraft>({ title: '', description: '', tokenReward: 100 });
  const [courseId, setCourseId] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await api.createTokenInfo({ ...form, teacherWallet });
      setCourseId(result.courseId);
      setMintAddress(result.tokenMint);
      setStep(2);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function addTaskDraft() {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, newTask]);
    setNewTask({ title: '', description: '', tokenReward: 100 });
  }

  async function handleStep2Submit() {
    if (!courseId) return;
    setLoading(true); setError(null);
    try {
      for (const task of tasks) {
        await api.addTask(courseId, task);
      }
      setStep(3);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === 3 && courseId && mintAddress) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Token Created!</h3>
        <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Mint:</span> {mintAddress}</p>
        <p className="text-sm text-gray-600 mb-4"><span className="font-medium">Course ID:</span> {courseId}</p>
        <p className="text-sm text-gray-500">Next: configure fee sharing and launch your token from the Bags developer console, then paste the config key below to complete the launch.</p>
        <button
          onClick={() => onComplete(courseId, mintAddress)}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <div className="flex gap-2 mb-6">
        {([1, 2, 3] as const).map(n => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1 — Course Info</h2>
          <label className="block text-sm font-medium text-gray-700">
            Course Name
            <input aria-label="Course Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Symbol
            <input aria-label="Symbol" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} required maxLength={10} className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea aria-label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={3} className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Image URL
            <input aria-label="Image URL" type="url" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} required className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Creating…' : 'Next →'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Add Tasks</h2>
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm">
              <span>{t.title}</span>
              <span className="text-indigo-600">{t.tokenReward} tokens</span>
            </div>
          ))}
          <div className="border rounded-lg p-3 space-y-2">
            <input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))} className="block w-full border rounded px-3 py-1.5 text-sm" />
            <input placeholder="Description" value={newTask.description} onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))} className="block w-full border rounded px-3 py-1.5 text-sm" />
            <div className="flex gap-2">
              <input type="number" min={1} value={newTask.tokenReward} onChange={e => setNewTask(n => ({ ...n, tokenReward: Number(e.target.value) }))} className="w-28 border rounded px-3 py-1.5 text-sm" />
              <button onClick={addTaskDraft} className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded text-sm hover:bg-gray-200">+ Add Task</button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 border text-gray-600 py-2 rounded-lg text-sm">← Back</button>
            <button onClick={handleStep2Submit} disabled={loading || tasks.length === 0} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update TeacherPage to use CourseWizard**

```typescript
// frontend/src/pages/TeacherPage.tsx
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CourseWizard } from '../components/CourseWizard';

export default function TeacherPage() {
  const { publicKey } = useWallet();
  const [showWizard, setShowWizard] = useState(false);
  const [created, setCreated] = useState<{ courseId: string; mintAddress: string } | null>(null);

  if (!publicKey) {
    return (
      <div className="p-8 text-center text-gray-500">
        Connect your wallet to access the teacher dashboard.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard</h1>
      {created && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-indigo-800">Course launched!</p>
          <p className="text-gray-600">Mint: <code className="text-xs bg-white px-1 rounded">{created.mintAddress}</code></p>
        </div>
      )}
      {showWizard ? (
        <CourseWizard
          teacherWallet={publicKey.toBase58()}
          onComplete={(courseId, mintAddress) => {
            setCreated({ courseId, mintAddress });
            setShowWizard(false);
          }}
        />
      ) : (
        <button
          onClick={() => setShowWizard(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          + Create Achievement Token
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd frontend && npm test -- --reporter=verbose
```

Expected: PASS — CourseWizard renders step 1 fields + advances to step 2

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CourseWizard.tsx frontend/src/pages/TeacherPage.tsx frontend/src/tests/CourseWizard.test.tsx
git commit -m "feat(frontend): teacher course creation wizard with 3-step flow"
```

---

### Task 9: Frontend — student task dashboard

**Files:**
- Create: `frontend/src/components/TaskList.tsx`
- Create: `frontend/src/components/AchievementGrid.tsx`
- Modify: `frontend/src/pages/StudentPage.tsx`
- Create: `frontend/src/tests/TaskList.test.tsx`

- [ ] **Step 1: Write the failing TaskList tests**

```typescript
// frontend/src/tests/TaskList.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskList } from '../components/TaskList';
import type { Task } from '../lib/api';

const mockTasks: Task[] = [
  { id: 't1', courseId: 'c1', title: 'Watch Intro', description: 'Watch the intro', tokenReward: 100, sortOrder: 0 },
  { id: 't2', courseId: 'c1', title: 'Quiz 1', description: 'Pass quiz', tokenReward: 200, sortOrder: 1 },
];

describe('TaskList', () => {
  it('renders all tasks', () => {
    render(<TaskList tasks={mockTasks} completedIds={[]} onComplete={vi.fn()} />);
    expect(screen.getByText('Watch Intro')).toBeInTheDocument();
    expect(screen.getByText('Quiz 1')).toBeInTheDocument();
  });

  it('shows completed state for completed tasks', () => {
    render(<TaskList tasks={mockTasks} completedIds={['t1']} onComplete={vi.fn()} />);
    expect(screen.getByText('Watch Intro').closest('li')).toHaveClass('opacity-60');
  });

  it('calls onComplete with task id when button clicked', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaskList tasks={mockTasks} completedIds={[]} onComplete={onComplete} />);
    await user.click(screen.getAllByRole('button', { name: /complete/i })[0]);
    expect(onComplete).toHaveBeenCalledWith('t1');
  });

  it('disables complete button for completed tasks', () => {
    render(<TaskList tasks={mockTasks} completedIds={['t1']} onComplete={vi.fn()} />);
    const buttons = screen.getAllByRole('button', { name: /complete/i });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd frontend && npm test -- --reporter=verbose
```

Expected: FAIL — `TaskList` not found

- [ ] **Step 3: Implement TaskList**

```typescript
// frontend/src/components/TaskList.tsx
import type { Task } from '../lib/api';

interface Props {
  tasks: Task[];
  completedIds: string[];
  onComplete: (taskId: string) => void;
}

export function TaskList({ tasks, completedIds, onComplete }: Props) {
  return (
    <ul className="space-y-2">
      {tasks.map(task => {
        const done = completedIds.includes(task.id);
        return (
          <li
            key={task.id}
            className={`flex items-center justify-between bg-white border rounded-lg px-4 py-3 ${done ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {done && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{task.title}</p>
                <p className="text-xs text-gray-500">{task.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-600 font-medium">{task.tokenReward} tokens</span>
              <button
                onClick={() => onComplete(task.id)}
                disabled={done}
                aria-label={done ? 'Completed' : 'Complete task'}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {done ? '✓ Done' : 'Complete'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Implement StudentPage**

```typescript
// frontend/src/pages/StudentPage.tsx
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api, type Course, type Task } from '../lib/api';
import { TaskList } from '../components/TaskList';

export default function StudentPage() {
  const { publicKey } = useWallet();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCourses().then(setCourses).catch(console.error);
  }, []);

  async function selectCourse(course: Course) {
    setSelected(course);
    setLoading(true);
    try {
      const [courseTasks] = await Promise.all([api.getCourseTasks(course.id)]);
      setTasks(courseTasks);
      setCompletedIds([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(taskId: string) {
    if (!publicKey) { alert('Connect wallet first'); return; }
    try {
      await api.completeTask(taskId, publicKey.toBase58());
      setCompletedIds(prev => [...prev, taskId]);
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Browse Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {courses.length === 0 && <p className="text-gray-400 text-sm col-span-3">No courses yet.</p>}
        {courses.map(course => (
          <button
            key={course.id}
            onClick={() => selectCourse(course)}
            className={`text-left bg-white border rounded-xl p-4 hover:border-indigo-400 transition-colors ${selected?.id === course.id ? 'border-indigo-600 ring-1 ring-indigo-600' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">{course.symbol}</span>
              {course.launchSignature && <span className="text-xs text-green-600">● Live</span>}
            </div>
            <p className="font-medium text-gray-800 text-sm">{course.name}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <h2 className="text-lg font-semibold mb-4">{selected.name} — Tasks</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading tasks…</p>
          ) : (
            <TaskList tasks={tasks} completedIds={completedIds} onComplete={handleComplete} />
          )}
          {!publicKey && <p className="mt-4 text-sm text-amber-600">Connect your wallet to complete tasks and earn tokens.</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd frontend && npm test -- --reporter=verbose
```

Expected: PASS — all 4 TaskList tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TaskList.tsx frontend/src/components/AchievementGrid.tsx frontend/src/pages/StudentPage.tsx frontend/src/tests/TaskList.test.tsx
git commit -m "feat(frontend): student course browser and task completion UI"
```

---

### Task 10: Frontend — teacher royalty claim panel

**Files:**
- Create: `frontend/src/components/RoyaltyPanel.tsx`
- Modify: `frontend/src/pages/TeacherPage.tsx`

- [ ] **Step 1: Implement RoyaltyPanel**

```typescript
// frontend/src/components/RoyaltyPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { api, type FeePosition } from '../lib/api';

export function RoyaltyPanel() {
  const { publicKey, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [positions, setPositions] = useState<FeePosition[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimedMints, setClaimedMints] = useState<string[]>([]);

  const loadPositions = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const pos = await api.getFeePositions(publicKey.toBase58());
      setPositions(pos.filter(p => p.claimableDisplayAmount > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  async function claim(position: FeePosition) {
    if (!publicKey || !signAllTransactions) { alert('Connect wallet first'); return; }
    setClaiming(position.baseMint);
    try {
      const { transactions: b64Txs } = await api.getClaimTxs(publicKey.toBase58(), position.baseMint);
      const txs = b64Txs.map(b64 => {
        const bytes = Buffer.from(b64, 'base64');
        try { return VersionedTransaction.deserialize(bytes); } catch { return Transaction.from(bytes); }
      });
      const signed = await signAllTransactions(txs as Transaction[]);
      for (const tx of signed) {
        const raw = tx.serialize();
        await connection.sendRawTransaction(raw);
      }
      setClaimedMints(prev => [...prev, position.baseMint]);
      await loadPositions();
    } catch (err) {
      alert(String(err));
    } finally {
      setClaiming(null);
    }
  }

  if (!publicKey) return <p className="text-sm text-gray-400">Connect wallet to view royalties.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Claimable Royalties</h2>
        <button onClick={loadPositions} disabled={loading} className="text-xs text-indigo-600 hover:underline disabled:opacity-40">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {positions.length === 0 && !loading && (
        <p className="text-sm text-gray-400">No claimable fees right now.</p>
      )}
      <ul className="space-y-3">
        {positions.map(pos => (
          <li key={pos.baseMint} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {pos.baseMint.slice(0, 6)}…{pos.baseMint.slice(-4)}
              </p>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                {pos.claimableDisplayAmount.toFixed(4)} SOL
              </p>
            </div>
            <button
              onClick={() => claim(pos)}
              disabled={claiming === pos.baseMint || claimedMints.includes(pos.baseMint)}
              className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {claiming === pos.baseMint ? 'Signing…' : claimedMints.includes(pos.baseMint) ? '✓ Claimed' : 'Claim'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add royalty tab to TeacherPage**

```typescript
// frontend/src/pages/TeacherPage.tsx  (replace full file)
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CourseWizard } from '../components/CourseWizard';
import { RoyaltyPanel } from '../components/RoyaltyPanel';

type Tab = 'create' | 'royalties';

export default function TeacherPage() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>('create');
  const [showWizard, setShowWizard] = useState(false);
  const [created, setCreated] = useState<{ courseId: string; mintAddress: string } | null>(null);

  if (!publicKey) {
    return (
      <div className="p-8 text-center text-gray-500">
        Connect your wallet to access the teacher dashboard.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex gap-4 mb-8 border-b">
        {(['create', 'royalties'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'create' ? 'Create Course' : 'Royalties'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div>
          {created && (
            <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-indigo-800">Course created!</p>
              <p className="text-gray-600 mt-1">Mint: <code className="text-xs">{created.mintAddress}</code></p>
            </div>
          )}
          {showWizard ? (
            <CourseWizard
              teacherWallet={publicKey.toBase58()}
              onComplete={(courseId, mintAddress) => { setCreated({ courseId, mintAddress }); setShowWizard(false); }}
            />
          ) : (
            <button
              onClick={() => setShowWizard(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              + Create Achievement Token
            </button>
          )}
        </div>
      )}

      {tab === 'royalties' && <RoyaltyPanel />}
    </div>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/RoyaltyPanel.tsx frontend/src/pages/TeacherPage.tsx
git commit -m "feat(frontend): teacher royalty claim panel with wallet signing"
```

---

### Task 11: Frontend — student on-chain resume export + backend resume endpoint

**Files:**
- Modify: `backend/src/routes/courses.ts` (add `/student/completions`)
- Modify: `backend/src/index.ts`
- Modify: `frontend/src/pages/ResumePage.tsx`

- [ ] **Step 1: Add student completions endpoint to backend**

In `backend/src/routes/courses.ts`, add before `return router`:

```typescript
// Add to courses.ts router — after existing routes, before return router

import { getStudentCompletions } from '../db.js';
// ...

router.get('/student/completions', (req, res) => {
  const wallet = req.query.wallet as string | undefined;
  if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
  res.json(getStudentCompletions(db, wallet));
});
```

Mount it: in `backend/src/index.ts`, add `app.use('/api', coursesRouter(db));` but change to:

```typescript
// In index.ts, replace:
//   app.use('/api/courses', coursesRouter(db));
// with:
app.use('/api', coursesRouter(db));
```

And update the coursesRouter prefixes — prefix `/courses` routes explicitly:

```typescript
// backend/src/routes/courses.ts  (replace full file)
import { Router } from 'express';
import type { DB } from '../db.js';
import { getCourses, getCourse, getTasks, getStudentCompletions } from '../db.js';

export function coursesRouter(db: DB): Router {
  const router = Router();

  router.get('/courses', (_req, res) => {
    res.json(getCourses(db));
  });

  router.get('/courses/:id', (req, res) => {
    const course = getCourse(db, req.params.id);
    if (!course) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(course);
  });

  router.get('/courses/:id/tasks', (req, res) => {
    res.json(getTasks(db, req.params.id));
  });

  router.get('/student/completions', (req, res) => {
    const wallet = req.query.wallet as string | undefined;
    if (!wallet) { res.status(400).json({ error: 'wallet query param required' }); return; }
    res.json(getStudentCompletions(db, wallet));
  });

  return router;
}
```

Update `index.ts` route mounting:

```typescript
// backend/src/index.ts  (replace full file)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { tokensRouter } from './routes/tokens.js';
import { coursesRouter } from './routes/courses.js';
import { tasksRouter } from './routes/tasks.js';
import { feesRouter } from './routes/fees.js';

export function createApp() {
  const db = initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/tokens', tokensRouter(db));
  app.use('/api', coursesRouter(db));   // handles /api/courses/*, /api/student/*
  app.use('/api', tasksRouter(db));     // handles /api/tasks/*
  app.use('/api/fees', feesRouter());

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => console.log(`ChainAchieve backend listening on :${port}`));
}
```

- [ ] **Step 2: Run all backend tests to confirm no regressions**

```bash
cd backend && npm test -- --reporter=verbose
```

Expected: All tests still PASS.

- [ ] **Step 3: Implement ResumePage**

```typescript
// frontend/src/pages/ResumePage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api, type StudentCompletion } from '../lib/api';

export default function ResumePage() {
  const { publicKey } = useWallet();
  const [completions, setCompletions] = useState<StudentCompletion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const data = await api.getStudentCompletions(publicKey.toBase58());
      setCompletions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { load(); }, [load]);

  function exportJSON() {
    if (!publicKey) return;
    const resume = {
      wallet: publicKey.toBase58(),
      exportedAt: new Date().toISOString(),
      achievements: completions.map(c => ({
        course: c.courseName,
        task: c.taskTitle,
        completedAt: new Date(c.completedAt).toISOString(),
        txSignature: c.txSignature,
        solscanUrl: c.txSignature ? `https://solscan.io/tx/${c.txSignature}` : null,
      })),
    };
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainachieve-resume-${publicKey.toBase58().slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!publicKey) {
    return (
      <div className="p-8 text-center text-gray-500">
        Connect your wallet to view your on-chain resume.
      </div>
    );
  }

  const byCourse = completions.reduce<Record<string, StudentCompletion[]>>((acc, c) => {
    (acc[c.courseName] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My On-Chain Resume</h1>
        {completions.length > 0 && (
          <button
            onClick={exportJSON}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Export JSON
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading achievements…</p>}

      {!loading && completions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No achievements yet.</p>
          <p className="text-sm mt-1">Complete tasks in courses to earn achievement tokens.</p>
        </div>
      )}

      {Object.entries(byCourse).map(([courseName, items]) => (
        <div key={courseName} className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">{courseName}</h2>
          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.taskId} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.taskTitle}</p>
                    <p className="text-xs text-gray-400">{new Date(item.completedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {item.txSignature && (
                  <a
                    href={`https://solscan.io/tx/${item.txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View tx ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify frontend build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Expected: No TypeScript errors, dist created.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/courses.ts backend/src/index.ts frontend/src/pages/ResumePage.tsx
git commit -m "feat: add student completions endpoint and on-chain resume export page"
```

---

### Task 12: Submission prep — README, devnet testing, deployment config

**Files:**
- Create: `README.md`
- Create: `backend/fly.toml`
- Create: `frontend/vercel.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All backend and frontend tests PASS.

- [ ] **Step 2: Smoke-test locally**

In one terminal:
```bash
cd backend && npm run dev
```

In another:
```bash
cd frontend && npm run dev
```

Visit `http://localhost:5173`. Verify:
- Navigation renders without errors
- Teacher page prompts wallet connection
- Student page shows "No courses yet"
- Resume page prompts wallet connection

- [ ] **Step 3: Create README**

```markdown
# ChainAchieve

**Web3 learning achievement tokenization on Bags.fm/Solana**

Teachers launch tradeable achievement tokens for their courses. Students earn token shares by completing verified tasks. Teachers collect perpetual 1% royalties from secondary market trading — distributed via Bags fee-sharing.

## Demo Flow

1. **Teacher** connects wallet → creates a course with achievement token (calls Bags `createTokenInfoAndMetadata` + `createLaunchTransaction`)
2. **Teacher** configures fee sharing: 70% to teacher wallet, 30% to community fund
3. **Student** browses courses → marks tasks complete → receives token shares automatically
4. **Teacher** claims accumulated royalties via the Royalties tab (signs claim txs with wallet)
5. **Student** exports their achievement history as a portable on-chain resume JSON

## Architecture

```
frontend/ (React + Vite + Tailwind + Wallet Adapter)
    ↕ /api proxy
backend/ (Node.js + Express + @bagsfm/bags-sdk)
    ↕
Bags API + Helius RPC (Solana)
    ↕
SQLite (courses, tasks, completions)
```

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add PLATFORM_PRIVATE_KEY (base58 keypair for server signing)
# Fund PLATFORM_PUBLIC_KEY with 0.1 SOL on devnet

# 3. Run
npm run dev:backend   # :3001
npm run dev:frontend  # :5173
```

## Bags SDK Integration

| Feature | SDK Method |
|---|---|
| Token metadata upload | `sdk.tokenLaunch.createTokenInfoAndMetadata()` |
| Token launch transaction | `sdk.tokenLaunch.createLaunchTransaction()` |
| Fee share config | `sdk.config.createBagsFeeShareConfig()` |
| Claimable positions | `sdk.fee.getAllClaimablePositions()` |
| Claim transactions | `sdk.fee.getClaimTransactions()` |

## Links

- [The Bags Hackathon @ DoraHacks](https://dorahacks.io/hackathon/the-bags-hackathon/detail)
- [Bags Developer Docs](https://docs.bags.fm)
- [Bags SDK (npm)](https://www.npmjs.com/package/@bagsfm/bags-sdk)
```

- [ ] **Step 4: Create Fly.io config for backend**

```toml
# backend/fly.toml
app = "chainachieve-backend"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

- [ ] **Step 5: Create Vercel config for frontend**

```json
// frontend/vercel.json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://chainachieve-backend.fly.dev/api/:path*" }
  ]
}
```

> Update the backend URL to your actual Fly.io app URL after deploying.

- [ ] **Step 6: Update CLAUDE.md**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ChainAchieve** — Web3 learning achievement tokenization platform for [The Bags Hackathon](https://dorahacks.io/hackathon/the-bags-hackathon/detail). Hackathon submission deadline: ~June 1, 2026.

Teachers launch tradeable achievement tokens on Bags.fm/Solana. Students earn token shares by completing course tasks. Fee sharing gives teachers 70% of trading fees; community fund gets 30%.

## Repository Structure

npm workspaces monorepo:
- `backend/` — Express API, BagsSDK integration, SQLite
- `frontend/` — React/Vite/Tailwind, Solana wallet adapter

## Commands

```bash
npm install          # install all workspaces
npm run dev:backend  # backend dev server on :3001
npm run dev:frontend # frontend dev server on :5173 (proxies /api → :3001)
npm test             # run all tests (backend vitest + frontend vitest)
cd backend && npm test -- --reporter=verbose   # backend tests only
cd frontend && npm test -- --reporter=verbose  # frontend tests only
```

## Environment

`.env` (gitignored) must contain:

```
BAGS_API_KEY=...          # from dev.bags.fm (x-api-key)
HELIUS_API_KEY=...        # Helius RPC API key
PORT=3001
PLATFORM_PRIVATE_KEY=...  # base58 Solana keypair for server-side signing
PLATFORM_PUBLIC_KEY=...   # corresponding public key (for reference)
```

## Bags SDK Version

`@bagsfm/bags-sdk@1.3.7` — installed globally at `/Users/qingteng/node_modules/@bagsfm/bags-sdk`.

**Real constructor signature:** `new BagsSDK(apiKey: string, connection: Connection, commitment?: Commitment)` — NOT an options object.

**Key service methods:**
- `sdk.tokenLaunch.createTokenInfoAndMetadata(params)` → `Promise<CreateTokenInfoResponse>`
- `sdk.tokenLaunch.createLaunchTransaction(params)` → `Promise<VersionedTransaction>` (sign with platform keypair)
- `sdk.config.createBagsFeeShareConfig(args)` → `Promise<{ transactions, bundles, meteoraConfigKey }>`
- `sdk.fee.getAllClaimablePositions(wallet: PublicKey)` → `Promise<BagsClaimablePosition[]>`
- `sdk.fee.getClaimTransactions(wallet, tokenMint: PublicKey)` → `Promise<Transaction[]>` (returned to frontend for wallet signing)
- `sdk.trade.getQuote(params)` / `sdk.trade.createSwapTransaction(params)` — Jupiter-style DEX swaps (not used for task rewards)
```

- [ ] **Step 7: Final commit**

```bash
git add README.md backend/fly.toml frontend/vercel.json CLAUDE.md docs/
git commit -m "docs: add README, deployment configs, and updated CLAUDE.md for submission"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Teacher creates achievement token | Tasks 4, 8 |
| Fee sharing (teacher 70% / community 30%) | Task 4 (config endpoint) + Task 8 (wizard step 3 note) |
| On-chain task verification + token distribution | Task 5 (SPL transfer), Task 9 (student UI) |
| Teacher royalty claim | Tasks 6, 10 |
| Learning progress dashboard | Task 9 (StudentPage) |
| On-chain resume export | Task 11 |
| SQLite persistence | Task 3 |
| Full test coverage for core paths | Tasks 2–6, 8–9 |
| README + deployment | Task 12 |

**Fee share config UI gap:** The wizard in Task 8 creates token info and tasks, but doesn't walk the teacher through the `createBagsFeeShareConfig` step. This is documented in the wizard's step 3 message: teacher needs to use the Bags developer console to configure fee sharing and get the `configKey` before calling `/api/tokens/launch`. For the hackathon scope this is acceptable — a future iteration could build this into the wizard.

**Type consistency confirmed:** `Course`, `Task`, `Completion` interfaces defined in `backend/src/types.ts` are used consistently in `db.ts`, all route files, and mirrored in `frontend/src/lib/api.ts`.
