import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDb, getCourses, insertCourse, insertTask, getTasks,
  insertCompletion, getCompletions,
} from '../src/db.js';
import type { DB } from '../src/db.js';

let db: DB;

beforeEach(() => {
  db = initDb(':memory:');
});

afterEach(() => {
  db.close();
});

describe('courses', () => {
  it('inserts and retrieves a course', () => {
    insertCourse(db, {
      id: 'c1', name: 'Solidity 101', symbol: 'SLD',
      description: 'Learn Solidity', teacherWallet: 'TeacherWallet111',
      mintAddress: null, metadataUrl: null, configKey: null,
      launchSignature: null, createdAt: 1000,
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
