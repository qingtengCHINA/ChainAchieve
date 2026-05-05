import { createWalletAuthHeaders, type WalletAuth } from './walletAuth';

const BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers, ...rest } = options ?? {};
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }
  const res = await fetch(BASE + path, {
    ...rest,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCourses: (q?: string) =>
    req<Course[]>(`/courses${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCourse: (id: string) => req<Course>(`/courses/${id}`),
  getCourseTasks: (id: string, passcode?: string) => {
    const headers = new Headers();
    if (passcode) headers.set('x-passcode', passcode);
    return req<Task[]>(`/courses/${id}/tasks`, passcode ? { headers } : undefined);
  },
  getCourseStats: (id: string) => req<CourseStats>(`/courses/${id}/stats`),
  deleteTask: async (courseId: string, taskId: string, auth: WalletAuth) => {
    const path = `/courses/${courseId}/tasks/${taskId}`;
    const headers = await createWalletAuthHeaders(auth, 'DELETE', `/api${path}`);
    return req<{ ok: boolean }>(path, { method: 'DELETE', headers });
  },
  getTeacherCourses: (wallet: string) =>
    req<(Course & { stats: CourseStats })[]>(`/teacher/courses?wallet=${encodeURIComponent(wallet)}`),
  updateCourse: async (courseId: string, body: UpdateCourseBody, auth: WalletAuth) => {
    const path = `/courses/${courseId}`;
    const headers = await createWalletAuthHeaders(auth, 'PUT', `/api${path}`);
    return req<Course>(path, { method: 'PUT', body: JSON.stringify(body), headers });
  },
  deleteCourse: async (courseId: string, auth: WalletAuth) => {
    const path = `/courses/${courseId}`;
    const headers = await createWalletAuthHeaders(auth, 'DELETE', `/api${path}`);
    return req<{ ok: boolean }>(path, { method: 'DELETE', headers });
  },
  createTokenInfo: async (body: CreateTokenInfoBody, auth?: WalletAuth) => {
    const path = '/tokens/info';
    const headers = auth
      ? await createWalletAuthHeaders(auth, 'POST', `/api${path}`)
      : undefined;
    return req<{ courseId: string; tokenMint: string; metadataUrl: string; launchSignature?: string }>(path, {
      method: 'POST', body: JSON.stringify(body), headers,
    });
  },
  launchToken: (body: LaunchTokenBody, authHeaders?: Record<string, string>) =>
    req<{ signature: string; courseId: string }>('/tokens/launch', {
      method: 'POST', body: JSON.stringify(body), headers: authHeaders,
    }),
  addTask: async (courseId: string, body: AddTaskBody, auth: WalletAuth) => {
    const path = `/courses/${courseId}/tasks`;
    const headers = await createWalletAuthHeaders(auth, 'POST', `/api${path}`);
    return req<Task>(path, { method: 'POST', body: JSON.stringify(body), headers });
  },
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
  getResume: (wallet: string) =>
    req<ResumeData>(`/resume?wallet=${encodeURIComponent(wallet)}`),
  getLeaderboard: (limit = 20) =>
    req<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`),
  getProfile: (wallet: string) =>
    req<ProfileData>(`/profile?wallet=${encodeURIComponent(wallet)}`),
  upsertProfile: async (body: ProfileData, auth: WalletAuth) => {
    const path = '/profile';
    const headers = await createWalletAuthHeaders(auth, 'PUT', `/api${path}`);
    return req<{ ok: boolean }>(path, { method: 'PUT', body: JSON.stringify(body), headers });
  },
};

export interface Course {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  teacherWallet: string;
  mintAddress: string | null;
  launchSignature: string | null;
  hasPasscode: boolean;
}

export interface CourseStats {
  totalTasks: number;
  studentCount: number;
  totalCompletions: number;
  earnedStudents: number;
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

export interface ResumeData {
  wallet: string;
  generatedAt: number;
  achievements: {
    courseId: string;
    courseName: string;
    taskId: string;
    taskTitle: string;
    completedAt: number;
    txSignature: string | null;
  }[];
}

export interface LeaderboardEntry {
  studentWallet: string;
  completionCount: number;
  courseCount: number;
  latestAt: number;
}

export interface ProfileData {
  wallet: string;
  displayName?: string;
  title?: string;
  bio?: string;
  avatarEmoji?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

interface CreateTokenInfoBody {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  teacherWallet: string;
  passcode?: string;
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

interface UpdateCourseBody {
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  passcode?: string | null;
}
