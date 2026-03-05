import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Environment bindings for Cloudflare Workers
// Secrets should be set via `wrangler secret put`
type Bindings = {
  HTML_BUCKET: R2Bucket;
  DB: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EMAIL_CODE_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  ADMIN_EMAILS?: string;
};

type AuthUser = {
  id: number;
  email: string;
  username: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend
app.use(
  '/*',
  cors({
    origin: (origin) => origin ?? '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const encoder = new TextEncoder();

const nowIso = (): string => new Date().toISOString();

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const randomToken = (bytes = 32): string => {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const sendVerificationEmail = async (
  c: { env: Bindings },
  to: string,
  code: string
): Promise<void> => {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = c.env;

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.error('Resend config missing', {
      hasApiKey: Boolean(RESEND_API_KEY),
      hasFromEmail: Boolean(RESEND_FROM_EMAIL),
    });
    throw new Error('Resend configuration is missing');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: 'Your Magic Brush verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${text}`);
  }
};

const findUserByEmail = async (
  c: any,
  email: string
): Promise<AuthUser | null> => {
  const row = await c.env.DB.prepare(
    'SELECT id, email, username FROM users WHERE lower(email) = ?1 LIMIT 1'
  )
    .bind(email)
    .first();
  return (row as AuthUser | null) ?? null;
};

const createSession = async (
  c: any,
  userId: number
): Promise<{ token: string; expiresAt: string }> => {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(tokenHash, userId, expiresAt, now)
    .run();

  return { token, expiresAt };
};

const verifyGoogleIdToken = async (
  c: any,
  idToken: string
): Promise<{ email: string } | null> => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!response.ok) {
    return null;
  }

  const tokenInfo = (await response.json()) as {
    email?: string;
    email_verified?: string;
    aud?: string;
  };

  if (!tokenInfo.email || tokenInfo.email_verified !== 'true') {
    return null;
  }

  const expectedClientId = c.env.GOOGLE_CLIENT_ID?.trim();
  if (expectedClientId && tokenInfo.aud !== expectedClientId) {
    return null;
  }

  const email = normalizeEmail(tokenInfo.email);
  if (!isValidEmail(email)) {
    return null;
  }

  return { email };
};

const getAuthUser = async (c: any): Promise<AuthUser | null> => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return null;
  }

  const tokenHash = await sha256Hex(token);
  const now = nowIso();

  const row = await c.env.DB.prepare(
    `SELECT u.id as id, u.email as email, u.username as username
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2`
  )
    .bind(tokenHash, now)
    .first();

  return (row as AuthUser | null) ?? null;
};

const requireAuth = async (c: any): Promise<AuthUser | Response> => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return user;
};

const isAdminEmail = (c: any, email: string): boolean => {
  const raw = c.env.ADMIN_EMAILS || '';
  if (!raw.trim()) {
    return false;
  }
  const list = raw
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
};

const getPageMeta = async (c: any, uuid: string) => {
  return c.env.DB.prepare(
    `SELECT p.id, p.owner_id, p.name, p.public, p.likes_count, p.version_count, p.created_at, p.updated_at,
            u.username as owner_username
     FROM pages p
     JOIN users u ON u.id = p.owner_id
     WHERE p.id = ?1`
  )
    .bind(uuid)
    .first();
};

/**
 * POST /api/auth/request-code
 */
app.post('/api/auth/request-code', async (c) => {
  try {
    const payload = await c.req.json<{ email: string }>();
    const email = normalizeEmail(payload.email || '');
    if (!email || !isValidEmail(email)) {
      return c.json({ error: 'Invalid email' }, 400);
    }

    const latest = await c.env.DB.prepare(
      `SELECT created_at FROM email_codes
       WHERE email = ?1
       ORDER BY id DESC LIMIT 1`
    )
      .bind(email)
      .first<{ created_at: string }>();

    if (latest?.created_at) {
      const lastTime = Date.parse(latest.created_at);
      if (!Number.isNaN(lastTime) && Date.now() - lastTime < 60_000) {
        return c.json({ error: 'Please wait 60 seconds before requesting another code.' }, 429);
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await sha256Hex(
      `${code}:${email}:${c.env.EMAIL_CODE_SECRET}`
    );
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO email_codes (email, code_hash, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(email, codeHash, expiresAt, nowIso())
      .run();

    await sendVerificationEmail(c, email, code);

    return c.json({ success: true });
  } catch (error) {
    console.error('Request code error:', error);
    return c.json({ error: 'Failed to send code' }, 500);
  }
});

/**
 * POST /api/auth/verify-code
 */
app.post('/api/auth/verify-code', async (c) => {
  try {
    const payload = await c.req.json<{
      email: string;
      code: string;
      username?: string;
      mode?: 'signin' | 'signup';
    }>();
    const email = normalizeEmail(payload.email || '');
    const code = payload.code?.trim();
    const username = payload.username;
    const mode = payload.mode;

    if (!email || !code || !isValidEmail(email)) {
      return c.json({ error: 'Email and code are required' }, 400);
    }

    const codeHash = await sha256Hex(
      `${code}:${email}:${c.env.EMAIL_CODE_SECRET}`
    );
    const now = nowIso();

    const record = await c.env.DB.prepare(
      `SELECT id, expires_at FROM email_codes
       WHERE email = ?1 AND code_hash = ?2
       ORDER BY id DESC LIMIT 1`
    )
      .bind(email, codeHash)
      .first<{ id: number; expires_at: string }>();

    if (!record || record.expires_at <= now) {
      return c.json({ error: 'Invalid or expired code' }, 400);
    }

    // Cleanup codes for this email
    await c.env.DB.prepare('DELETE FROM email_codes WHERE email = ?1')
      .bind(email)
      .run();

    let user = await findUserByEmail(c, email);

    if (!user) {
      if (mode === 'signin') {
        return c.json({ error: 'Account not found. Please sign up.' }, 400);
      }
      if (!username || username.trim().length < 2) {
        return c.json({ error: 'Username required', needsUsername: true }, 400);
      }

      const cleanUsername = username.trim();

      try {
        const result = await c.env.DB.prepare(
          `INSERT INTO users (email, username, created_at)
           VALUES (?1, ?2, ?3)`
        )
          .bind(email, cleanUsername, now)
          .run();

        user = {
          id: Number(result.meta.last_row_id),
          email,
          username: cleanUsername,
        };
      } catch (err) {
        return c.json({ error: 'Username already taken' }, 400);
      }
    } else if (mode === 'signup') {
      return c.json({ error: 'Account already exists. Please sign in.' }, 400);
    }

    const { token } = await createSession(c, user.id);

    return c.json({ token, user });
  } catch (error) {
    console.error('Verify code error:', error);
    return c.json({ error: 'Failed to verify code' }, 500);
  }
});

/**
 * POST /api/auth/google
 */
app.post('/api/auth/google', async (c) => {
  try {
    const { idToken, username, mode } = await c.req.json<{
      idToken: string;
      username?: string;
      mode?: 'signin' | 'signup';
    }>();

    if (!idToken || !idToken.trim()) {
      return c.json({ error: 'Google idToken is required' }, 400);
    }

    const googleUser = await verifyGoogleIdToken(c, idToken.trim());
    if (!googleUser) {
      return c.json({ error: 'Invalid Google token' }, 401);
    }

    let user = await findUserByEmail(c, googleUser.email);

    if (!user) {
      if (mode === 'signin') {
        return c.json({ error: 'Account not found. Please sign up.' }, 400);
      }
      if (!username || username.trim().length < 2) {
        return c.json({ error: 'Username required', needsUsername: true }, 400);
      }

      const now = nowIso();
      const cleanUsername = username.trim();

      try {
        const result = await c.env.DB.prepare(
          `INSERT INTO users (email, username, created_at)
           VALUES (?1, ?2, ?3)`
        )
          .bind(googleUser.email, cleanUsername, now)
          .run();

        user = {
          id: Number(result.meta.last_row_id),
          email: googleUser.email,
          username: cleanUsername,
        };
      } catch (err) {
        return c.json({ error: 'Username already taken' }, 400);
      }
    } else if (mode === 'signup') {
      return c.json({ error: 'Account already exists. Please sign in.' }, 400);
    }

    const { token } = await createSession(c, user.id);
    return c.json({ token, user });
  } catch (error) {
    console.error('Google auth error:', error);
    return c.json({ error: 'Failed to authenticate with Google' }, 500);
  }
});

/**
 * GET /api/me
 */
app.get('/api/me', async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ user: null }, 401);
  }
  return c.json({ user, isAdmin: isAdminEmail(c, user.email) });
});

/**
 * POST /api/logout
 */
app.post('/api/logout', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ success: true });
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return c.json({ success: true });
  }
  const tokenHash = await sha256Hex(token);
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1')
    .bind(tokenHash)
    .run();
  return c.json({ success: true });
});

/**
 * POST /api/page/save
 * Save HTML content to R2 bucket (requires auth)
 */
app.post('/api/page/save', async (c) => {
  try {
    const authUser = await requireAuth(c);
    if (authUser instanceof Response) {
      return authUser;
    }

    const { uuid, html, name, public: isPublic, createVersion, versionNumber } =
      await c.req.json<{
        uuid: string;
        html: string;
        name?: string;
        public?: boolean;
        createVersion?: boolean;
        versionNumber?: number;
      }>();

    if (!uuid || !html) {
      return c.json({ error: 'Missing uuid or html' }, 400);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(uuid)) {
      return c.json({ error: 'Invalid uuid format' }, 400);
    }

    const now = nowIso();
    const existing = await c.env.DB.prepare(
      'SELECT owner_id FROM pages WHERE id = ?1'
    )
      .bind(uuid)
      .first<{ owner_id: number }>();

    if (!existing) {
      const finalName = (name && name.trim()) || 'Untitled Page';
      const publicValue = isPublic === false ? 0 : 1;
      await c.env.DB.prepare(
        `INSERT INTO pages (id, owner_id, name, public, likes_count, version_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6)`
      )
        .bind(uuid, authUser.id, finalName, publicValue, now, now)
        .run();
    } else if (existing.owner_id !== authUser.id) {
      return c.json({ error: 'Forbidden' }, 403);
    } else {
      if (name || typeof isPublic === 'boolean') {
        await c.env.DB.prepare(
          `UPDATE pages
           SET name = COALESCE(?2, name),
               public = COALESCE(?3, public),
               updated_at = ?4
           WHERE id = ?1`
        )
          .bind(
            uuid,
            name ? name.trim() : null,
            typeof isPublic === 'boolean' ? (isPublic ? 1 : 0) : null,
            now
          )
          .run();
      } else {
        await c.env.DB.prepare('UPDATE pages SET updated_at = ?2 WHERE id = ?1')
          .bind(uuid, now)
          .run();
      }
    }

    await c.env.HTML_BUCKET.put(`${uuid}.html`, html, {
      httpMetadata: {
        contentType: 'text/html; charset=utf-8',
      },
    });

    if (createVersion && typeof versionNumber === 'number' && versionNumber > 0) {
      const versionKey = `${uuid}-v${versionNumber}.html`;
      await c.env.HTML_BUCKET.put(versionKey, html, {
        httpMetadata: {
          contentType: 'text/html; charset=utf-8',
        },
      });

      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO page_versions (page_id, version, html_key, created_at)
           VALUES (?1, ?2, ?3, ?4)`
        ).bind(uuid, versionNumber, versionKey, now),
        c.env.DB.prepare(
          `UPDATE pages
           SET version_count = MAX(version_count, ?2), updated_at = ?3
           WHERE id = ?1`
        ).bind(uuid, versionNumber, now),
      ]);
    }

    return c.json({ success: true, uuid });
  } catch (error) {
    console.error('Error saving HTML:', error);
    return c.json(
      { error: 'Failed to save HTML', details: String(error) },
      500
    );
  }
});

/**
 * GET /pages/:uuid
 * Retrieve HTML content from R2 bucket (public or owner)
 */
app.get('/pages/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const version = c.req.query('version');

    if (!uuid) {
      return c.text('UUID is required', 400);
    }

    const meta = await getPageMeta(c, uuid);
    if (!meta) {
      return c.text('HTML not found', 404);
    }

    if (meta.public !== 1) {
      const authUser = await getAuthUser(c);
      if (!authUser || authUser.id !== meta.owner_id) {
        return c.text('Unauthorized', 401);
      }
    }

    const key = version ? `${uuid}-v${version}.html` : `${uuid}.html`;
    const object = await c.env.HTML_BUCKET.get(key);
    if (!object) {
      return c.text('HTML not found', 404);
    }

    const html = await object.text();
    return c.html(html);
  } catch (error) {
    console.error('Error fetching HTML:', error);
    return c.text('Failed to fetch HTML', 500);
  }
});

/**
 * POST /api/page/history
 * Save conversation history to R2 bucket (owner only)
 */
app.post('/api/page/history', async (c) => {
  try {
    const authUser = await requireAuth(c);
    if (authUser instanceof Response) {
      return authUser;
    }

    const { uuid, history } = await c.req.json<{
      uuid: string;
      history: Array<{ role: string; content: string; timestamp: string }>;
    }>();

    if (!uuid || !history) {
      return c.json({ error: 'Missing uuid or history' }, 400);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(uuid)) {
      return c.json({ error: 'Invalid uuid format' }, 400);
    }

    const meta = await c.env.DB.prepare(
      'SELECT owner_id FROM pages WHERE id = ?1'
    )
      .bind(uuid)
      .first<{ owner_id: number }>();

    if (!meta || meta.owner_id !== authUser.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await c.env.HTML_BUCKET.put(
      `${uuid}.history.json`,
      JSON.stringify(history),
      {
        httpMetadata: {
          contentType: 'application/json; charset=utf-8',
        },
      }
    );

    return c.json({ success: true, uuid });
  } catch (error) {
    console.error('Error saving history:', error);
    return c.json(
      { error: 'Failed to save history', details: String(error) },
      500
    );
  }
});

/**
 * GET /api/page/history/:uuid
 * Retrieve conversation history (public pages visible to everyone)
 */
app.get('/api/page/history/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');

    if (!uuid) {
      return c.json({ error: 'UUID is required' }, 400);
    }

    const meta = await c.env.DB.prepare(
      'SELECT owner_id, public FROM pages WHERE id = ?1'
    )
      .bind(uuid)
      .first<{ owner_id: number; public: number }>();

    if (!meta) {
      return c.json({ error: 'Not found' }, 404);
    }

    const authUser = await getAuthUser(c);
    const canView = meta.public === 1 || authUser?.id === meta.owner_id;

    if (!canView) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const object = await c.env.HTML_BUCKET.get(`${uuid}.history.json`);

    if (!object) {
      return c.json([]);
    }

    const history = await object.text();
    return c.json(JSON.parse(history));
  } catch (error) {
    console.error('Error fetching history:', error);
    return c.json(
      { error: 'Failed to fetch history', details: String(error) },
      500
    );
  }
});

/**
 * GET /api/page/:uuid
 * Retrieve page metadata
 */
app.get('/api/page/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');
    if (!uuid) {
      return c.json({ error: 'UUID is required' }, 400);
    }

    const meta = await getPageMeta(c, uuid);
    if (!meta) {
      return c.json({ error: 'Not found' }, 404);
    }

    const authUser = await getAuthUser(c);
    const canEdit = authUser?.id === meta.owner_id;
    const canDelete = authUser
      ? isAdminEmail(c, authUser.email) || authUser.id === meta.owner_id
      : false;
    if (meta.public !== 1 && !canEdit) {
      return c.json({ error: 'Not found' }, 404);
    }

    let liked = false;

    if (authUser) {
      const likedRow = await c.env.DB.prepare(
        'SELECT 1 FROM page_likes WHERE user_id = ?1 AND page_id = ?2'
      )
        .bind(authUser.id, uuid)
        .first();
      liked = Boolean(likedRow);
    }

    return c.json({
      id: meta.id,
      name: meta.name,
      public: meta.public === 1,
      likesCount: meta.likes_count,
      versionCount: meta.version_count ?? 0,
      createdAt: meta.created_at,
      updatedAt: meta.updated_at,
      owner: {
        id: meta.owner_id,
        username: meta.owner_username,
      },
      canEdit,
      canDelete,
      liked,
    });
  } catch (error) {
    console.error('Error fetching page meta:', error);
    return c.json({ error: 'Failed to fetch page' }, 500);
  }
});

/**
 * PATCH /api/page/:uuid
 * Update page metadata (owner only)
 */
app.patch('/api/page/:uuid', async (c) => {
  try {
    const authUser = await requireAuth(c);
    if (authUser instanceof Response) {
      return authUser;
    }

    const uuid = c.req.param('uuid');
    const { name, public: isPublic } = await c.req.json<{
      name?: string;
      public?: boolean;
    }>();

    const meta = await c.env.DB.prepare('SELECT owner_id FROM pages WHERE id = ?1')
      .bind(uuid)
      .first<{ owner_id: number }>();

    if (!meta || meta.owner_id !== authUser.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const cleanName = name ? name.trim() : null;
    if (cleanName !== null && cleanName.length < 2) {
      return c.json({ error: 'Name too short' }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE pages
       SET name = COALESCE(?2, name),
           public = COALESCE(?3, public),
           updated_at = ?4
       WHERE id = ?1`
    )
      .bind(
        uuid,
        cleanName,
        typeof isPublic === 'boolean' ? (isPublic ? 1 : 0) : null,
        nowIso()
      )
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating page:', error);
    return c.json({ error: 'Failed to update page' }, 500);
  }
});

/**
 * GET /api/pages
 * List public pages
 */
app.get('/api/pages', async (c) => {
  try {
    const sort = (c.req.query('sort') || 'latest').toLowerCase();
    const filter = (c.req.query('filter') || 'public').toLowerCase();
    const limit = Math.min(Number(c.req.query('limit') || 20), 50);
    const authUser = await getAuthUser(c);
    const userId = authUser ? authUser.id : -1;

    const orderBy =
      sort === 'top'
        ? 'likes_count DESC, updated_at DESC'
        : 'updated_at DESC';

    if (filter === 'mine') {
      if (!authUser) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const results = await c.env.DB.prepare(
        `SELECT p.id, p.name, p.likes_count, p.updated_at, p.created_at,
                u.username as owner_username,
                CASE WHEN l.user_id IS NULL THEN 0 ELSE 1 END as liked
         FROM pages p
         JOIN users u ON u.id = p.owner_id
         LEFT JOIN page_likes l ON l.page_id = p.id AND l.user_id = ?2
         WHERE p.owner_id = ?1
         ORDER BY ${orderBy}
         LIMIT ?3`
      )
        .bind(userId, userId, limit)
        .all();

      return c.json({ items: results.results || [] });
    }

    const results = await c.env.DB.prepare(
      `SELECT p.id, p.name, p.likes_count, p.updated_at, p.created_at,
              u.username as owner_username,
              CASE WHEN l.user_id IS NULL THEN 0 ELSE 1 END as liked
       FROM pages p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN page_likes l ON l.page_id = p.id AND l.user_id = ?2
       WHERE p.public = 1
       ORDER BY ${orderBy}
       LIMIT ?1`
    )
      .bind(limit, userId)
      .all();

    return c.json({ items: results.results || [] });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return c.json({ error: 'Failed to fetch pages' }, 500);
  }
});

/**
 * DELETE /api/page/:uuid
 * Admin or owner deletion of page and related assets
 */
app.delete('/api/page/:uuid', async (c) => {
  try {
    const authUser = await requireAuth(c);
    if (authUser instanceof Response) {
      return authUser;
    }

    const uuid = c.req.param('uuid');
    if (!uuid) {
      return c.json({ error: 'UUID is required' }, 400);
    }

    const meta = await c.env.DB.prepare('SELECT id, owner_id FROM pages WHERE id = ?1')
      .bind(uuid)
      .first<{ id: string; owner_id: number }>();

    if (!meta) {
      return c.json({ error: 'Not found' }, 404);
    }

    const isAdmin = isAdminEmail(c, authUser.email);
    const isOwner = meta.owner_id === authUser.id;

    if (!isAdmin && !isOwner) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const versions = await c.env.DB.prepare(
      'SELECT html_key FROM page_versions WHERE page_id = ?1'
    )
      .bind(uuid)
      .all<{ html_key: string }>();

    const keys = [
      `${uuid}.html`,
      `${uuid}.history.json`,
      ...((versions.results || []).map((row) => row.html_key) || []),
    ];

    await c.env.HTML_BUCKET.delete(keys);

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM page_likes WHERE page_id = ?1').bind(uuid),
      c.env.DB.prepare('DELETE FROM page_versions WHERE page_id = ?1').bind(uuid),
      c.env.DB.prepare('DELETE FROM pages WHERE id = ?1').bind(uuid),
    ]);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete page error:', error);
    return c.json({ error: 'Failed to delete page' }, 500);
  }
});

/**
 * POST /api/page/:uuid/like
 * Toggle like (logged-in users only)
 */
app.post('/api/page/:uuid/like', async (c) => {
  try {
    const authUser = await requireAuth(c);
    if (authUser instanceof Response) {
      return authUser;
    }

    const uuid = c.req.param('uuid');
    const meta = await c.env.DB.prepare('SELECT public FROM pages WHERE id = ?1')
      .bind(uuid)
      .first<{ public: number }>();

    if (!meta || meta.public !== 1) {
      return c.json({ error: 'Not found' }, 404);
    }

    const liked = await c.env.DB.prepare(
      'SELECT 1 FROM page_likes WHERE user_id = ?1 AND page_id = ?2'
    )
      .bind(authUser.id, uuid)
      .first();

    if (liked) {
      await c.env.DB.batch([
        c.env.DB.prepare(
          'DELETE FROM page_likes WHERE user_id = ?1 AND page_id = ?2'
        ).bind(authUser.id, uuid),
        c.env.DB.prepare(
          'UPDATE pages SET likes_count = MAX(likes_count - 1, 0) WHERE id = ?1'
        ).bind(uuid),
      ]);
      const countRow = await c.env.DB.prepare(
        'SELECT likes_count FROM pages WHERE id = ?1'
      )
        .bind(uuid)
        .first<{ likes_count: number }>();
      return c.json({ liked: false, likesCount: countRow?.likes_count ?? 0 });
    }

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO page_likes (user_id, page_id, created_at) VALUES (?1, ?2, ?3)'
      ).bind(authUser.id, uuid, nowIso()),
      c.env.DB.prepare(
        'UPDATE pages SET likes_count = likes_count + 1 WHERE id = ?1'
      ).bind(uuid),
    ]);

    const countRow = await c.env.DB.prepare(
      'SELECT likes_count FROM pages WHERE id = ?1'
    )
      .bind(uuid)
      .first<{ likes_count: number }>();
    return c.json({ liked: true, likesCount: countRow?.likes_count ?? 0 });
  } catch (error) {
    console.error('Error toggling like:', error);
    return c.json({ error: 'Failed to toggle like' }, 500);
  }
});

/**
 * GET /api/page/:uuid/download
 * Download HTML (public or owner)
 */
app.get('/api/page/:uuid/download', async (c) => {
  try {
    const uuid = c.req.param('uuid');
    if (!uuid) {
      return c.text('UUID is required', 400);
    }

    const meta = await getPageMeta(c, uuid);
    if (!meta) {
      return c.text('Not found', 404);
    }

    if (meta.public !== 1) {
      const authUser = await getAuthUser(c);
      if (!authUser || authUser.id !== meta.owner_id) {
        return c.text('Unauthorized', 401);
      }
    }

    const object = await c.env.HTML_BUCKET.get(`${uuid}.html`);
    if (!object) {
      return c.text('HTML not found', 404);
    }

    const filename = (meta.name || 'page')
      .replace(/[^a-zA-Z0-9-_\u4e00-\u9fa5]+/g, '_')
      .slice(0, 50);

    const html = await object.text();

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}.html"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return c.text('Failed to download', 500);
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Fallback route
 */
app.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
