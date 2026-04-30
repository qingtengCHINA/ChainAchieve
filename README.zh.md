# ChainAchieve

**学习 · 完成 · 赚取。** — 一个基于 Web3 的学习成就代币化平台。教师通过 Bags.fm 发行可交易的 SPL 成就代币；学生完成课程任务后自动收到链上代币奖励；教师通过 Bags 费用分享协议持续获得版税。

本项目为 **The Bags Hackathon** 参赛作品，运行于 Solana Devnet。

---

## 核心逻辑

```
教师                          学生
  │                              │
  ├─ 创建课程                    ├─ 连接 Phantom 钱包
  ├─ Bags SDK 铸造 SPL 代币      ├─ 浏览课程 & 查看任务
  ├─ 添加任务 + 设置代币奖励     ├─ 完成任务 → 链上转账到钱包
  │                              ├─ 查看成就 & 导出链上简历
  └─ 随时领取版税收益            └─ 积累 on-chain 成就记录
```

1. **教师**创建课程 → Bags SDK 在 Solana Devnet 铸造带元数据的 SPL 代币
2. **教师**添加任务，每个任务设置代币奖励数量（如"观看入门视频 → 100 代币"）
3. **学生**连接 Phantom 钱包，浏览课程，完成任务
4. **平台**为每次任务完成自动签署并发送 SPL 代币转账
5. **学生**可查看已获成就，导出 JSON 格式的链上简历
6. **教师**通过 Bags 费用分享协议领取持续版税

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS + Solana Wallet Adapter |
| 后端 | Node.js + Express + TypeScript + better-sqlite3 |
| 区块链 | Solana Devnet + Bags SDK v1.3.7 + @solana/spl-token |
| 部署 | Fly.io（后端）+ Vercel（前端）|

---

## 目录结构

```
chainachieve/
├── backend/                    # Express API + Bags SDK 集成
│   ├── src/
│   │   ├── routes/
│   │   │   ├── tokens.ts       # 代币信息 & 发行
│   │   │   ├── courses.ts      # 课程列表 & 任务查询
│   │   │   ├── tasks.ts        # 任务 CRUD & 完成触发转账
│   │   │   ├── fees.ts         # 版税 positions & claim 交易
│   │   │   └── resume.ts       # 链上简历导出
│   │   ├── db.ts               # SQLite 数据库 schema & 查询
│   │   ├── sdk.ts              # BagsSDK 单例
│   │   ├── keypair.ts          # 平台密钥对（签名用）
│   │   └── index.ts            # createApp() 工厂函数
│   ├── tests/                  # 14 个 Vitest 测试
│   ├── fly.toml                # Fly.io 部署配置
│   └── Dockerfile
└── frontend/                   # React SPA
    ├── src/
    │   ├── pages/
    │   │   ├── TeacherPage.tsx    # 教师端：创建课程 | 我的课程 | 版税
    │   │   ├── StudentPage.tsx    # 学生端：浏览课程 | 成就
    │   │   └── ResumePage.tsx     # 链上简历 + JSON 导出
    │   ├── components/
    │   │   ├── CourseWizard.tsx   # 3 步骤代币发行向导
    │   │   ├── TaskList.tsx       # 任务完成列表
    │   │   ├── AchievementGrid.tsx # 成就展示
    │   │   └── RoyaltyPanel.tsx   # 版税领取 UI
    │   └── lib/api.ts             # 类型安全的 fetch 封装
    └── vercel.json
```

---

## 本地开发

### 前提条件

- Node.js v20+
- [Phantom 钱包](https://phantom.app/) 浏览器插件（切换到 Devnet）
- Bags API Key（在 [bags.fm](https://bags.fm) 申请）
- Helius API Key（在 [helius.dev](https://helius.dev) 申请）

### 安装

```bash
git clone https://github.com/你的用户名/ChainAchieve.git
cd ChainAchieve
npm install
```

### 配置环境变量

复制并填写：

```bash
cp .env.example .env
```

`.env` 内容：

```env
BAGS_API_KEY=bags_prod_xxxxxxxxxxxx
HELIUS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PLATFORM_PRIVATE_KEY=你的Solana平台私钥（Base58格式）
PLATFORM_PUBLIC_KEY=对应的公钥
PORT=3001
```

> ⚠️ 生成平台密钥对：`solana-keygen new --outfile platform-keypair.json`，然后转换为 Base58。平台密钥用于代签 SPL 代币转账，请妥善保管，勿提交到 git。

### 启动

```bash
# 启动后端（监听 :3001）
npm run dev:backend

# 启动前端（监听 :5173，/api 自动代理到 :3001）
npm run dev:frontend
```

打开 [http://localhost:5173](http://localhost:5173) 即可使用。

### 运行测试

```bash
npm test
# 后端：14 个测试（db / tokens / tasks / fees / health）
# 前端：2 个组件测试（CourseWizard 向导流程）
```

---

## 使用指南

### 教师端

1. 点击右上角 **Connect Wallet** 连接 Phantom（Devnet）
2. 进入 **Teacher** 页面
3. **Create Course** 标签页 → 填写课程名称、Symbol、描述、封面图 URL
4. 点击 **Next** → Bags SDK 会在链上创建代币元数据
5. 添加若干任务（每个任务设置标题、描述、代币奖励数量）
6. 点击 **Continue** → 任务保存到数据库
7. 完成后跳转到 **My Courses** 查看 Mint 地址
8. **Royalties** 标签页 → 随时查看和领取版税

### 学生端

1. 连接 Phantom 钱包（Devnet）
2. 进入 **Courses** 页面 → 浏览所有课程
3. 点击课程 → 查看任务列表
4. 点击任务旁的 **Complete** → 链上转账到你的钱包
5. **Achievements** 标签页查看已获得的成就代币
6. **My Resume** 页面 → 查看完整链上成就记录，点击 **Export JSON** 导出

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tokens/info` | 通过 Bags SDK 创建代币元数据 |
| POST | `/api/tokens/launch` | 链上发行代币 |
| GET | `/api/courses` | 获取所有课程列表 |
| GET | `/api/courses/:id/tasks` | 获取课程任务列表 |
| POST | `/api/courses/:id/tasks` | 添加任务 |
| POST | `/api/tasks/:id/complete` | 标记任务完成 + 链上代币转账 |
| GET | `/api/student/completions` | 学生完成记录查询 |
| GET | `/api/resume` | 获取钱包的链上简历 JSON |
| GET | `/api/fees/positions` | 查询可领取版税 |
| POST | `/api/fees/claim-txs` | 获取版税 claim 交易（未签名） |

---

## 部署

### 后端 → Fly.io

```bash
cd backend
fly launch      # 首次部署
fly secrets set BAGS_API_KEY=xxx HELIUS_API_KEY=xxx PLATFORM_PRIVATE_KEY=xxx PLATFORM_PUBLIC_KEY=xxx
fly deploy
```

### 前端 → Vercel

```bash
cd frontend
vercel --prod
# 在 Vercel 控制台设置环境变量（如需要）
```

`frontend/vercel.json` 已配置 `/api/*` 请求转发到后端，以及 SPA 路由重写。

---

## 开源协议

MIT License — 欢迎 fork、star、提 issue、提 PR。

---

## 致谢

- [Bags.fm](https://bags.fm) — 提供代币发行与费用分享 SDK
- [Helius](https://helius.dev) — Solana RPC 服务
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter) — 钱包连接
- [The Bags Hackathon](https://bags.fm) — 本项目的诞生背景
