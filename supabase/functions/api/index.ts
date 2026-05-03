import { BagsSDK } from '@bagsfm/bags-sdk';
import * as ed25519 from '@noble/ed25519';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';
import { Buffer } from 'node:buffer';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet, x-message, x-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

let sdk: BagsSDK | null = null;
let connection: Connection | null = null;
let platformKeypair: Keypair | null = null;

const UpdateCourseSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  symbol: z.string().min(1).max(10).optional(),
  description: z.string().min(1).max(200).optional(),
  imageUrl: z.string().optional(),
  passcode: z.string().regex(/^[A-Za-z0-9]{8}$/).optional().nullable(),
});

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tokenReward: z.number().int().min(1).default(100),
});

const CompleteTaskSchema = z.object({
  studentWallet: z.string().min(32),
});

const TokenInfoSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  description: z.string().min(1).max(200),
  imageUrl: z.string().optional(),
  teacherWallet: z.string().min(32),
  passcode: z.string().regex(/^[A-Za-z0-9]{8}$/).optional(),
  telegram: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
});

const LaunchSchema = z.object({
  courseId: z.string().uuid(),
  configKey: z.string().optional(),
  initialBuyLamports: z.number().int().min(0).default(0),
});

const ClaimTxsSchema = z.object({
  wallet: z.string().min(32),
  tokenMint: z.string().min(32),
});

const ProfileSchema = z.object({
  wallet: z.string().min(32),
  displayName: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  bio: z.string().max(300).optional(),
  avatarEmoji: z.string().max(8).optional(),
  twitter: z.string().max(50).optional(),
  github: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const route = normalizeRoute(req);
    const method = req.method.toUpperCase();

    if (method === 'GET' && route === '/health') return json({ status: 'ok' });

    if (method === 'GET' && route === '/courses') return listCourses(req);
    if (method === 'GET' && /^\/courses\/[^/]+$/.test(route)) return getCourse(route);
    if (method === 'GET' && /^\/courses\/[^/]+\/tasks$/.test(route)) return listTasks(req, route);
    if (method === 'GET' && /^\/courses\/[^/]+\/stats$/.test(route)) return getCourseStatsRoute(route);
    if (method === 'GET' && route === '/teacher/courses') return listTeacherCourses(req);
    if (method === 'PUT' && /^\/courses\/[^/]+$/.test(route)) return updateCourse(req, route);
    if (method === 'DELETE' && /^\/courses\/[^/]+$/.test(route)) return deleteCourse(req, route);
    if (method === 'DELETE' && /^\/courses\/[^/]+\/tasks\/[^/]+$/.test(route)) return deleteTaskRoute(req, route);
    if (method === 'GET' && route === '/leaderboard') return leaderboard(req);
    if (method === 'GET' && route === '/student/completions') return studentCompletions(req);
    if (method === 'GET' && route === '/resume') return resume(req);

    if (method === 'POST' && /^\/courses\/[^/]+\/tasks$/.test(route)) return createTask(req, route);
    if (method === 'POST' && /^\/tasks\/[^/]+\/complete$/.test(route)) return completeTask(req, route);

    if (method === 'POST' && route === '/tokens/info') return createTokenInfo(req, route);
    if (method === 'POST' && route === '/tokens/launch') return launchToken(req, route);
    if (method === 'GET' && route === '/fees/positions') return feePositions(req);
    if (method === 'POST' && route === '/fees/claim-txs') return claimTransactions(req);

    if (method === 'GET' && route === '/profile') return getProfile(req);
    if (method === 'PUT' && route === '/profile') return upsertProfile(req, route);

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error('[api]', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

async function listCourses(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  let query = supabase.from('courses').select('*').order('created_at', { ascending: false });
  if (q) {
    const isWallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
    if (isWallet) {
      query = query.eq('teacher_wallet', q);
    } else {
      const safe = q.replaceAll(',', ' ').replaceAll('%', '\\%');
      query = query.or(`name.ilike.%${safe}%,symbol.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
  }
  const { data, error } = await query;
  if (error) return dbError(error);
  return json((data ?? []).map(courseToApi));
}

async function getCourse(route: string): Promise<Response> {
  const [, id] = route.split('/');
  const course = await getCourseRow(id);
  if (!course) return json({ error: 'Not found' }, 404);
  return json(courseToApi(course));
}

async function listTasks(req: Request, route: string): Promise<Response> {
  const [, courseId] = route.match(/^\/courses\/([^/]+)\/tasks$/) ?? [];
  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Course not found' }, 404);

  if (course.passcode) {
    const submitted = new URL(req.url).searchParams.get('passcode') ?? '';
    if (submitted.toUpperCase() !== course.passcode.toUpperCase()) {
      return json({ error: 'Invalid passcode' }, 403);
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order');
  if (error) return dbError(error);
  return json((data ?? []).map(taskToApi));
}

async function getCourseStatsRoute(route: string): Promise<Response> {
  const [, courseId] = route.match(/^\/courses\/([^/]+)\/stats$/) ?? [];
  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Not found' }, 404);
  return json(await getCourseStats(courseId));
}

async function listTeacherCourses(req: Request): Promise<Response> {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return json({ error: 'wallet query param required' }, 400);

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('teacher_wallet', wallet)
    .order('created_at', { ascending: false });
  if (error) return dbError(error);

  const rows = await Promise.all((data ?? []).map(async (course) => ({
    ...courseToApi(course),
    stats: await getCourseStats(course.id),
  })));
  return json(rows);
}

async function createTask(req: Request, route: string): Promise<Response> {
  const [, courseId] = route.match(/^\/courses\/([^/]+)\/tasks$/) ?? [];
  const parsed = CreateTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Course not found' }, 404);

  const auth = await requireWallet(req, course.teacher_wallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const { count, error: countError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (countError) return dbError(countError);

  const row = {
    id: crypto.randomUUID(),
    course_id: courseId,
    title: parsed.data.title,
    description: parsed.data.description,
    token_reward: parsed.data.tokenReward,
    sort_order: count ?? 0,
  };
  const { data, error } = await supabase.from('tasks').insert(row).select('*').single();
  if (error) return dbError(error);
  return json(taskToApi(data), 201);
}

async function deleteTaskRoute(req: Request, route: string): Promise<Response> {
  const [, courseId, taskId] = route.match(/^\/courses\/([^/]+)\/tasks\/([^/]+)$/) ?? [];
  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Course not found' }, 404);

  const auth = await requireWallet(req, course.teacher_wallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (taskError) return dbError(taskError);
  if (!task) return json({ error: 'Task not found' }, 404);

  const { count, error: countError } = await supabase
    .from('completions')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);
  if (countError) return dbError(countError);
  if ((count ?? 0) > 0) return json({ error: 'Cannot delete a task that already has completions' }, 409);

  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('course_id', courseId);
  if (error) return dbError(error);
  return json({ ok: true });
}

async function updateCourse(req: Request, route: string): Promise<Response> {
  const [, courseId] = route.match(/^\/courses\/([^/]+)$/) ?? [];
  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Course not found' }, 404);

  const auth = await requireWallet(req, course.teacher_wallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const parsed = UpdateCourseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.symbol !== undefined) updates.symbol = parsed.data.symbol;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.imageUrl !== undefined) updates.image_url = parsed.data.imageUrl;
  if ('passcode' in parsed.data) {
    updates.passcode = parsed.data.passcode ? parsed.data.passcode.toUpperCase() : null;
  }

  const { data, error } = await supabase.from('courses').update(updates).eq('id', courseId).select('*').single();
  if (error) return dbError(error);
  return json(courseToApi(data));
}

async function deleteCourse(req: Request, route: string): Promise<Response> {
  const [, courseId] = route.match(/^\/courses\/([^/]+)$/) ?? [];
  const course = await getCourseRow(courseId);
  if (!course) return json({ error: 'Course not found' }, 404);

  const auth = await requireWallet(req, course.teacher_wallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  // Delete tasks and completions in order (completions reference tasks)
  const { data: tasks } = await supabase.from('tasks').select('id').eq('course_id', courseId);
  const taskIds = (tasks ?? []).map((t) => t.id);
  if (taskIds.length > 0) {
    await supabase.from('completions').delete().in('task_id', taskIds);
    await supabase.from('tasks').delete().eq('course_id', courseId);
  }
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) return dbError(error);
  return json({ ok: true });
}

async function completeTask(req: Request, route: string): Promise<Response> {
  const [, taskId] = route.match(/^\/tasks\/([^/]+)\/complete$/) ?? [];
  const parsed = CompleteTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, token_reward, course_id, courses(mint_address, launch_signature)')
    .eq('id', taskId)
    .maybeSingle();
  if (taskError) return dbError(taskError);
  if (!task) return json({ error: 'Task not found' }, 404);

  const course = Array.isArray(task.courses) ? task.courses[0] : task.courses;
  if (!course?.mint_address || !course?.launch_signature) {
    return json({ error: 'Course token not yet launched' }, 400);
  }

  const completion = {
    id: crypto.randomUUID(),
    task_id: taskId,
    student_wallet: parsed.data.studentWallet,
    tx_signature: null,
    completed_at: new Date().toISOString(),
    status: 'pending',
  };
  const { data: reserved, error: reserveError } = await supabase
    .from('completions')
    .insert(completion)
    .select('*')
    .single();
  if (reserveError) {
    if (reserveError.code === '23505') return json({ error: 'Already completed' }, 409);
    return dbError(reserveError);
  }

  try {
    const sig = await distributeTokens(course.mint_address, parsed.data.studentWallet, task.token_reward);
    await supabase
      .from('completions')
      .update({ tx_signature: sig, status: 'completed' })
      .eq('id', reserved.id)
      .eq('status', 'pending');
    return json({ ...completionToApi({ ...reserved, tx_signature: sig, status: 'completed' }), tokenReward: task.token_reward }, 201);
  } catch (err) {
    await supabase.from('completions').update({ status: 'failed' }).eq('id', reserved.id).eq('status', 'pending');
    console.error('[complete task]', err);
    return json({ error: 'Token distribution failed. Please try again.' }, 500);
  }
}

async function createTokenInfo(req: Request, route: string): Promise<Response> {
  const parsed = TokenInfoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const auth = await requireWallet(req, parsed.data.teacherWallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const { name, symbol, description, imageUrl, teacherWallet, passcode, telegram, twitter, website } = parsed.data;

  const sdkImageUrl = imageUrl && /^https?:\/\//i.test(imageUrl)
    ? imageUrl
    : `https://placehold.co/200x200/9fe870/163300.png?text=${encodeURIComponent(symbol.slice(0, 2))}`;

  const normalizedPasscode = passcode ? passcode.toUpperCase() : null;

  try {
    const keypair = getPlatformKeypair();
    const conn = getConnection();

    // Step 1: Create token metadata on Bags API
    const result = await getSDK().tokenLaunch.createTokenInfoAndMetadata({
      name, symbol, description, imageUrl: sdkImageUrl,
      ...(telegram && { telegram }),
      ...(twitter && { twitter }),
      ...(website && { website }),
    });

    const tokenMint = new PublicKey(result.tokenMint);
    const teacherPubkey = new PublicKey(teacherWallet);

    // Step 2: Auto-create fee share config — teacher receives 100% of trading fees
    const feeConfigResult = await getSDK().config.createBagsFeeShareConfig({
      feeClaimers: [{ user: teacherPubkey, userBps: 10000 }],
      payer: keypair.publicKey,
      baseMint: tokenMint,
    });

    // Step 3: Sign and confirm all fee config transactions in sequence
    const { blockhash: fb, lastValidBlockHeight: flvbh } = await conn.getLatestBlockhash();
    for (const tx of feeConfigResult.transactions) {
      tx.message.recentBlockhash = fb;
      tx.sign([keypair]);
      const sig = await conn.sendRawTransaction(tx.serialize());
      await conn.confirmTransaction({ signature: sig, blockhash: fb, lastValidBlockHeight: flvbh });
    }

    const configKey = feeConfigResult.meteoraConfigKey;

    // Step 4: Launch token on-chain
    const launchTx = await getSDK().tokenLaunch.createLaunchTransaction({
      metadataUrl: result.tokenMetadata,
      tokenMint,
      launchWallet: keypair.publicKey,
      initialBuyLamports: 0,
      configKey,
    });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    launchTx.message.recentBlockhash = blockhash;
    launchTx.sign([keypair]);
    const launchSig = await conn.sendRawTransaction(launchTx.serialize());
    await conn.confirmTransaction({ signature: launchSig, blockhash, lastValidBlockHeight });

    // Step 5: Persist course with full launch info
    const courseId = crypto.randomUUID();
    const { error } = await supabase.from('courses').insert({
      id: courseId,
      name, symbol, description,
      image_url: imageUrl ?? '',
      teacher_wallet: teacherWallet,
      mint_address: result.tokenMint,
      metadata_url: result.tokenMetadata,
      passcode: normalizedPasscode,
      config_key: configKey.toBase58(),
      launch_signature: launchSig,
      created_at: new Date().toISOString(),
    });
    if (error) return dbError(error);
    return json({ courseId, tokenMint: result.tokenMint, metadataUrl: result.tokenMetadata, launchSignature: launchSig });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

async function launchToken(req: Request, route: string): Promise<Response> {
  const parsed = LaunchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const course = await getCourseRow(parsed.data.courseId);
  if (!course?.mint_address || !course?.metadata_url) {
    return json({ error: 'Course not found or missing token info' }, 404);
  }
  const auth = await requireWallet(req, course.teacher_wallet, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  try {
    const keypair = getPlatformKeypair();
    const conn = getConnection();
    const tokenMint = new PublicKey(course.mint_address);
    const teacherPubkey = new PublicKey(course.teacher_wallet);

    // Resolve configKey: use stored one, then auto-create if missing
    let configKey: PublicKey;
    if (course.config_key) {
      configKey = new PublicKey(course.config_key);
    } else {
      const feeConfigResult = await getSDK().config.createBagsFeeShareConfig({
        feeClaimers: [{ user: teacherPubkey, userBps: 10000 }],
        payer: keypair.publicKey,
        baseMint: tokenMint,
      });
      const { blockhash: fb, lastValidBlockHeight: flvbh } = await conn.getLatestBlockhash();
      for (const tx of feeConfigResult.transactions) {
        tx.message.recentBlockhash = fb;
        tx.sign([keypair]);
        const sig = await conn.sendRawTransaction(tx.serialize());
        await conn.confirmTransaction({ signature: sig, blockhash: fb, lastValidBlockHeight: flvbh });
      }
      configKey = feeConfigResult.meteoraConfigKey;
    }

    const tx = await getSDK().tokenLaunch.createLaunchTransaction({
      metadataUrl: course.metadata_url,
      tokenMint,
      launchWallet: keypair.publicKey,
      initialBuyLamports: parsed.data.initialBuyLamports,
      configKey,
    });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    tx.message.recentBlockhash = blockhash;
    tx.sign([keypair]);
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
    await supabase
      .from('courses')
      .update({ config_key: configKey.toBase58(), launch_signature: signature })
      .eq('id', parsed.data.courseId);
    return json({ signature, courseId: parsed.data.courseId });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

async function feePositions(req: Request): Promise<Response> {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return json({ error: 'wallet query param required' }, 400);
  try {
    const positions = await getSDK().fee.getAllClaimablePositions(new PublicKey(wallet));
    return json(positions);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

async function claimTransactions(req: Request): Promise<Response> {
  const parsed = ClaimTxsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  try {
    const txs = await getSDK().fee.getClaimTransactions(
      new PublicKey(parsed.data.wallet),
      new PublicKey(parsed.data.tokenMint),
    );
    return json({
      transactions: txs.map((tx) => Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64')),
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

async function leaderboard(req: Request): Promise<Response> {
  const rawLimit = Number(new URL(req.url).searchParams.get('limit') ?? 20);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const { data, error } = await supabase
    .from('completions')
    .select('student_wallet, completed_at, tasks(course_id)')
    .eq('status', 'completed');
  if (error) return dbError(error);

  const grouped = new Map<string, { studentWallet: string; completionCount: number; courseIds: Set<string>; latestAt: number }>();
  for (const row of data ?? []) {
    const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    const latestAt = new Date(row.completed_at).getTime();
    const entry = grouped.get(row.student_wallet) ?? {
      studentWallet: row.student_wallet,
      completionCount: 0,
      courseIds: new Set<string>(),
      latestAt,
    };
    entry.completionCount += 1;
    if (task?.course_id) entry.courseIds.add(task.course_id);
    entry.latestAt = Math.max(entry.latestAt, latestAt);
    grouped.set(row.student_wallet, entry);
  }

  return json([...grouped.values()]
    .sort((a, b) => b.completionCount - a.completionCount || a.latestAt - b.latestAt)
    .slice(0, limit)
    .map(({ studentWallet, completionCount, courseIds, latestAt }) => ({
      studentWallet,
      completionCount,
      courseCount: courseIds.size,
      latestAt,
    })));
}

async function studentCompletions(req: Request): Promise<Response> {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return json({ error: 'wallet query param required' }, 400);
  return json(await getStudentCompletionRows(wallet));
}

async function resume(req: Request): Promise<Response> {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return json({ error: 'wallet query param required' }, 400);
  const completions = await getStudentCompletionRows(wallet);
  return json({
    wallet,
    generatedAt: Date.now(),
    achievements: completions.map((c) => ({
      courseId: c.courseId,
      courseName: c.courseName,
      taskId: c.taskId,
      taskTitle: c.taskTitle,
      completedAt: c.completedAt,
      txSignature: c.txSignature,
    })),
  });
}

async function getStudentCompletionRows(wallet: string) {
  const { data, error } = await supabase
    .from('completions')
    .select('id, task_id, student_wallet, tx_signature, completed_at, tasks(title, course_id, courses(name))')
    .eq('student_wallet', wallet)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    const course = Array.isArray(task?.courses) ? task.courses[0] : task?.courses;
    return {
      id: row.id,
      taskId: row.task_id,
      studentWallet: row.student_wallet,
      txSignature: row.tx_signature,
      completedAt: new Date(row.completed_at).getTime(),
      taskTitle: task?.title ?? '',
      courseId: task?.course_id ?? '',
      courseName: course?.name ?? '',
    };
  });
}

async function getProfile(req: Request): Promise<Response> {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return json({ error: 'wallet required' }, 400);
  const { data } = await supabase.from('profiles').select('*').eq('wallet', wallet).maybeSingle();
  if (!data) return json({ wallet });
  return json({
    wallet: data.wallet,
    displayName: data.display_name ?? undefined,
    title: data.title ?? undefined,
    bio: data.bio ?? undefined,
    avatarEmoji: data.avatar_emoji ?? undefined,
    twitter: data.twitter ?? undefined,
    github: data.github ?? undefined,
    website: data.website ?? undefined,
  });
}

async function upsertProfile(req: Request, route: string): Promise<Response> {
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const auth = await verifyWalletAuth(req, `/api${route}`);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  if (auth.wallet !== parsed.data.wallet) return json({ error: 'wallet mismatch' }, 403);
  const { wallet, ...fields } = parsed.data;
  const { error } = await supabase.from('profiles').upsert({
    wallet,
    display_name: fields.displayName ?? null,
    title: fields.title ?? null,
    bio: fields.bio ?? null,
    avatar_emoji: fields.avatarEmoji ?? null,
    twitter: fields.twitter ?? null,
    github: fields.github ?? null,
    website: fields.website ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'wallet' });
  if (error) return dbError(error);
  return json({ ok: true });
}

async function getCourseStats(courseId: string) {
  const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id').eq('course_id', courseId);
  if (tasksError) throw tasksError;
  const taskIds = (tasks ?? []).map((task) => task.id);
  if (taskIds.length === 0) {
    return { totalTasks: 0, studentCount: 0, totalCompletions: 0, earnedStudents: 0 };
  }

  const { data: completions, error } = await supabase
    .from('completions')
    .select('student_wallet, task_id')
    .eq('status', 'completed')
    .in('task_id', taskIds);
  if (error) throw error;

  const byStudent = new Map<string, Set<string>>();
  for (const completion of completions ?? []) {
    const set = byStudent.get(completion.student_wallet) ?? new Set<string>();
    set.add(completion.task_id);
    byStudent.set(completion.student_wallet, set);
  }

  return {
    totalTasks: taskIds.length,
    studentCount: byStudent.size,
    totalCompletions: completions?.length ?? 0,
    earnedStudents: [...byStudent.values()].filter((set) => taskIds.every((id) => set.has(id))).length,
  };
}

async function getCourseRow(id: string) {
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function requireWallet(req: Request, expectedWallet: string, expectedPath: string) {
  const auth = await verifyWalletAuth(req, expectedPath);
  if (!auth.ok) return auth;
  if (auth.wallet !== expectedWallet) return { ok: false as const, status: 403, error: 'Not your course' };
  return auth;
}

async function verifyWalletAuth(req: Request, expectedPath: string) {
  const wallet = req.headers.get('x-wallet');
  const signature = req.headers.get('x-signature');
  const message = req.headers.get('x-message');
  if (!wallet || !signature || !message) {
    return { ok: false as const, status: 401, error: 'wallet signature required' };
  }

  let fields: Record<string, string>;
  try {
    const parsed = JSON.parse(message) as Record<string, unknown>;
    fields = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  } catch {
    return { ok: false as const, status: 401, error: 'invalid wallet auth message' };
  }

  const timestamp = Number(fields.timestamp);
  if (
    fields.domain !== 'ChainAchieve' ||
    fields.wallet !== wallet ||
    fields.method !== req.method.toUpperCase() ||
    fields.path !== expectedPath ||
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > 5 * 60 * 1000
  ) {
    return { ok: false as const, status: 401, error: 'invalid wallet auth message' };
  }

  try {
    const publicKey = bs58.decode(wallet);
    const signatureBytes = bs58.decode(signature);
    const verified = await ed25519.verifyAsync(signatureBytes, new TextEncoder().encode(message), publicKey);
    return verified
      ? { ok: true as const, wallet }
      : { ok: false as const, status: 401, error: 'invalid wallet signature' };
  } catch {
    return { ok: false as const, status: 401, error: 'invalid wallet signature' };
  }
}

async function distributeTokens(mintAddress: string, studentWallet: string, amount: number): Promise<string> {
  const keypair = getPlatformKeypair();
  const conn = getConnection();
  const mint = new PublicKey(mintAddress);
  const student = new PublicKey(studentWallet);
  const platformAta = await getOrCreateAssociatedTokenAccount(conn, keypair, mint, keypair.publicKey);
  const studentAta = await getOrCreateAssociatedTokenAccount(conn, keypair, mint, student);
  return transfer(conn, keypair, platformAta.address, studentAta.address, keypair, BigInt(amount));
}

function getSDK(): BagsSDK {
  if (sdk) return sdk;
  const bagsApiKey = Deno.env.get('BAGS_API_KEY');
  if (!bagsApiKey) throw new Error('BAGS_API_KEY env var not set');
  sdk = new BagsSDK(bagsApiKey, getConnection(), 'processed');
  return sdk;
}

function getConnection(): Connection {
  if (connection) return connection;
  const heliusKey = Deno.env.get('HELIUS_API_KEY');
  if (!heliusKey) throw new Error('HELIUS_API_KEY env var not set');
  connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, 'confirmed');
  return connection;
}

function getPlatformKeypair(): Keypair {
  if (platformKeypair) return platformKeypair;
  const raw = Deno.env.get('PLATFORM_PRIVATE_KEY');
  if (!raw) throw new Error('PLATFORM_PRIVATE_KEY env var not set');
  platformKeypair = Keypair.fromSecretKey(bs58.decode(raw));
  return platformKeypair;
}

function normalizeRoute(req: Request): string {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const apiIndex = parts.lastIndexOf('api');
  const routeParts = apiIndex >= 0 ? parts.slice(apiIndex + 1) : parts;
  return `/${routeParts.join('/')}`;
}

function courseToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    description: row.description,
    imageUrl: row.image_url,
    teacherWallet: row.teacher_wallet,
    mintAddress: row.mint_address,
    metadataUrl: row.metadata_url,
    configKey: row.config_key,
    launchSignature: row.launch_signature,
    hasPasscode: !!row.passcode,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function taskToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    tokenReward: row.token_reward,
    sortOrder: row.sort_order,
  };
}

function completionToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    taskId: row.task_id,
    studentWallet: row.student_wallet,
    txSignature: row.tx_signature,
    completedAt: new Date(row.completed_at as string).getTime(),
    status: row.status,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function dbError(error: { message: string; code?: string }): Response {
  console.error('[db]', error);
  return json({ error: error.message }, 500);
}
