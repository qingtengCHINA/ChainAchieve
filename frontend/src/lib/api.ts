const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
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
    req<FeePosition[]>(`/fees/positions?wallet=${encodeURIComponent(wallet)}`),
  getClaimTxs: (wallet: string, tokenMint: string) =>
    req<{ transactions: string[] }>('/fees/claim-txs', {
      method: 'POST', body: JSON.stringify({ wallet, tokenMint }),
    }),
  getStudentCompletions: (wallet: string) =>
    req<StudentCompletion[]>(`/student/completions?wallet=${encodeURIComponent(wallet)}`),
};

export interface Course {
  id: string;
  name: string;
  symbol: string;
  description: string;
  teacherWallet: string;
  mintAddress: string | null;
  launchSignature: string | null;
}

export interface Task {
  id: string;
  courseId: string;
  title: string;
  description: string;
  tokenReward: number;
  sortOrder: number;
}

export interface FeePosition {
  baseMint: string;
  claimableDisplayAmount: number;
  totalClaimableLamportsUserShare: number;
}

export interface StudentCompletion {
  taskId: string;
  taskTitle: string;
  courseName: string;
  courseId: string;
  txSignature: string | null;
  completedAt: number;
}

interface CreateTokenInfoBody {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  teacherWallet: string;
}

interface LaunchTokenBody {
  courseId: string;
  configKey: string;
  initialBuyLamports: number;
}

interface AddTaskBody {
  title: string;
  description: string;
  tokenReward: number;
}
