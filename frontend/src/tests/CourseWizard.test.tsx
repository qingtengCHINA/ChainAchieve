import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CourseWizard } from '../components/CourseWizard';

vi.mock('../lib/api', () => ({
  api: {
    createTokenInfo: vi.fn(async () => ({
      courseId: 'course-abc',
      tokenMint: 'So11111111111111111111111111111111111111112',
      metadataUrl: 'https://meta.json',
    })),
    addTask: vi.fn(async (_id: string, body: { title: string }) => ({
      id: 'task-1',
      courseId: 'course-abc',
      title: body.title,
      description: '',
      tokenReward: 100,
      sortOrder: 0,
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

  it('advances to step 2 after filling and submitting step 1', async () => {
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
