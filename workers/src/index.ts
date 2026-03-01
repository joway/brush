import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Environment bindings for Cloudflare Workers
type Bindings = {
  HTML_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend
app.use('/*', cors());

/**
 * POST /api/save-html
 * Save HTML content to R2 bucket
 */
app.post('/api/save-html', async (c) => {
  try {
    const { uuid, html } = await c.req.json<{ uuid: string; html: string }>();

    if (!uuid || !html) {
      return c.json({ error: 'Missing uuid or html' }, 400);
    }

    // Validate UUID format (basic check)
    if (!/^[a-zA-Z0-9_-]+$/.test(uuid)) {
      return c.json({ error: 'Invalid uuid format' }, 400);
    }

    // Save to R2
    await c.env.HTML_BUCKET.put(`${uuid}.html`, html, {
      httpMetadata: {
        contentType: 'text/html; charset=utf-8',
      },
    });

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
 * GET /preview/:uuid
 * Retrieve HTML content from R2 bucket
 */
app.get('/preview/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');

    if (!uuid) {
      return c.text('UUID is required', 400);
    }

    // Fetch from R2
    const object = await c.env.HTML_BUCKET.get(`${uuid}.html`);

    if (!object) {
      return c.text('HTML not found', 404);
    }

    // Return HTML content
    const html = await object.text();

    return c.html(html);
  } catch (error) {
    console.error('Error fetching HTML:', error);
    return c.text('Failed to fetch HTML', 500);
  }
});

/**
 * POST /api/save-history
 * Save conversation history to R2 bucket
 */
app.post('/api/save-history', async (c) => {
  try {
    const { uuid, history } = await c.req.json<{
      uuid: string;
      history: Array<{ role: string; content: string; timestamp: string }>;
    }>();

    if (!uuid || !history) {
      return c.json({ error: 'Missing uuid or history' }, 400);
    }

    // Validate UUID format
    if (!/^[a-zA-Z0-9_-]+$/.test(uuid)) {
      return c.json({ error: 'Invalid uuid format' }, 400);
    }

    // Save history to R2
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
 * GET /api/history/:uuid
 * Retrieve conversation history from R2 bucket
 */
app.get('/api/history/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');

    if (!uuid) {
      return c.json({ error: 'UUID is required' }, 400);
    }

    // Fetch from R2
    const object = await c.env.HTML_BUCKET.get(`${uuid}.history.json`);

    if (!object) {
      // Return empty history if not found (not an error)
      return c.json([]);
    }

    // Return history as JSON
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
 * GET /api/health
 * Health check endpoint
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
