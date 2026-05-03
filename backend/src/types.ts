export interface Course {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
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
  status?: 'pending' | 'completed' | 'failed';
}
