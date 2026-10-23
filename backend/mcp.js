const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const Student = require('./models/Student');
const mongoose = require('mongoose');

const GH_API = `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/`;
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ghHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'sms-mcp'
});


const studentFields = {
  studentId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  department: z.string().trim().min(1),
  semester: z.number().int().min(1).max(12),
  contact: z.string().trim().min(1)
};

function result(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

function errorMessage(error) {
  if (error && error.code === 11000) return 'Student ID or email already exists';
  if (error && error.name === 'ValidationError') {
    const firstError = Object.values(error.errors || {})[0];
    return firstError ? firstError.message : error.message;
  }
  return error && error.message ? error.message : 'An unexpected error occurred';
}

async function runTool(operation) {
  try {
    return result(await operation());
  } catch (error) {
    return { ...result({ error: errorMessage(error) }), isError: true };
  }
}

function registerTools(server) {
  server.registerTool('list_students', {
    description: 'List all students',
    inputSchema: {}
  }, () => runTool(() => Student.find().lean()));

  server.registerTool('search_students', {
    description: 'Search students by partial name or student ID (case-insensitive)',
    inputSchema: { query: z.string().trim().min(1) }
  }, ({ query }) => {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedQuery, 'i');
    return runTool(() => Student.find({ $or: [{ name: pattern }, { studentId: pattern }] }).lean());
  });

  server.registerTool('get_student', {
    description: 'Get a student by student ID',
    inputSchema: { studentId: z.string().trim().min(1) }
  }, ({ studentId }) => runTool(async () => {
    const student = await Student.findOne({ studentId }).lean();
    if (!student) throw Object.assign(new Error('Student not found'), { code: 'STUDENT_NOT_FOUND' });
    return student;
  }));

  server.registerTool('add_student', {
    description: 'Add a student',
    inputSchema: studentFields
  }, (student) => runTool(() => Student.create(student)));

  server.registerTool('update_student', {
    description: 'Update a student by student ID',
    inputSchema: {
      studentId: z.string().trim().min(1),
      name: studentFields.name.optional(),
      email: studentFields.email.optional(),
      department: studentFields.department.optional(),
      semester: studentFields.semester.optional(),
      contact: studentFields.contact.optional()
    }
  }, ({ studentId, ...updates }) => runTool(async () => {
    const student = await Student.findOneAndUpdate({ studentId }, updates, { new: true, runValidators: true });
    if (!student) throw Object.assign(new Error('Student not found'), { code: 'STUDENT_NOT_FOUND' });
    return student;
  }));

  server.registerTool('delete_student', {
    description: 'Delete a student by student ID',
    inputSchema: { studentId: z.string().trim().min(1) }
  }, ({ studentId }) => runTool(async () => {
    const student = await Student.findOneAndDelete({ studentId });
    if (!student) throw Object.assign(new Error('Student not found'), { code: 'STUDENT_NOT_FOUND' });
    return student;
  }));

  // ---------- GitHub ----------
  server.registerTool('github_read', {
    description: 'Read a file (returns content) or list a folder from the GitHub repo. Use path "" for repo root.',
    inputSchema: { path: z.string() }
  }, ({ path }) => runTool(async () => {
    const r = await fetch(`${GH_API}${path}?ref=${GH_BRANCH}`, { headers: ghHeaders() });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
    const d = await r.json();
    if (Array.isArray(d)) return d.map((f) => ({ name: f.name, type: f.type, path: f.path }));
    return { path: d.path, content: Buffer.from(d.content, 'base64').toString('utf8') };
  }));

  server.registerTool('github_write', {
    description: 'Create or overwrite a file in the GitHub repo and commit it. Triggers auto-deploy if enabled on Netlify/Render.',
    inputSchema: { path: z.string().min(1), content: z.string(), message: z.string().min(1) }
  }, ({ path, content, message }) => runTool(async () => {
    const url = `${GH_API}${path}`;
    const cur = await fetch(`${url}?ref=${GH_BRANCH}`, { headers: ghHeaders() });
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const r = await fetch(url, {
      method: 'PUT',
      headers: ghHeaders(),
      body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), sha, branch: GH_BRANCH })
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
    const d = await r.json();
    return { commit: d.commit.sha, url: d.commit.html_url };
  }));

  // ---------- MongoDB (read-only) ----------
  server.registerTool('mongo_find', {
    description: 'Read-only MongoDB query: find documents in a collection (max 50).',
    inputSchema: {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.any()).optional(),
      limit: z.number().int().min(1).max(50).optional()
    }
  }, ({ collection, filter, limit }) => runTool(() =>
    mongoose.connection.db.collection(collection).find(filter || {}).limit(limit || 20).toArray()
  ));

  server.registerTool('mongo_collections', {
    description: 'List MongoDB collections with document counts',
    inputSchema: {}
  }, () => runTool(async () => {
    const cols = await mongoose.connection.db.listCollections().toArray();
    return Promise.all(cols.map(async (c) => ({ name: c.name, count: await mongoose.connection.db.collection(c.name).countDocuments() })));
  }));

  // ---------- Deploy hooks ----------
  server.registerTool('redeploy_netlify', {
    description: 'Trigger a Netlify frontend redeploy',
    inputSchema: {}
  }, () => runTool(async () => {
    if (!process.env.NETLIFY_BUILD_HOOK) throw new Error('NETLIFY_BUILD_HOOK not set');
    const r = await fetch(process.env.NETLIFY_BUILD_HOOK, { method: 'POST' });
    return { status: r.status, ok: r.ok };
  }));

  server.registerTool('redeploy_render', {
    description: 'Trigger a Render backend redeploy (this server restarts)',
    inputSchema: {}
  }, () => runTool(async () => {
    if (!process.env.RENDER_DEPLOY_HOOK) throw new Error('RENDER_DEPLOY_HOOK not set');
    const r = await fetch(process.env.RENDER_DEPLOY_HOOK, { method: 'POST' });
    return { status: r.status, ok: r.ok };
  }));
}

function mcpHandler(req, res) {
  const server = new McpServer({ name: 'student-management', version: '1.0.0' });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.allSettled([transport.close(), server.close()]);
  };
  res.on('close', close);
  registerTools(server);
  server.connect(transport).then(() => transport.handleRequest(req, res, req.body)).catch(async (error) => {
    if (!res.headersSent) res.status(500).json({ error: 'MCP request failed' });
    await close();
  });
}

module.exports = mcpHandler;