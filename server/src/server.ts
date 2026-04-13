import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { Options, SimpleGit } from 'simple-git';
import {OptionsValues} from 'simple-git/dist/src/lib/types';

const DATA_DIR = process.env['DATA_DIR'] ?? path.join(process.cwd(), 'data');
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const GIT_REMOTE_URL = process.env['GIT_REMOTE_URL'];
const GIT_USER_NAME = process.env['GIT_USER_NAME'] ?? 'Egon.io';
const GIT_USER_EMAIL = process.env['GIT_USER_EMAIL'] ?? 'egon@egon.io';
const SSH_KEY_PATH = process.env['SSH_KEY_PATH'];

if (SSH_KEY_PATH) {
  process.env['GIT_SSH_COMMAND'] = `ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes`;
}

interface DiagramEntry {
  id: string;
  name: string;
  savedAt: string;
}

interface DiagramEntryWithMeta extends DiagramEntry {
  hasPresentation: boolean;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readIndex(): DiagramEntry[] {
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeIndex(entries: DiagramEntry[]): void {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

async function initGit(): Promise<SimpleGit> {
  ensureDataDir();
  const git = simpleGit(DATA_DIR);
  const isRepo = fs.existsSync(path.join(DATA_DIR, '.git'));
  if (!isRepo) {
    await git.init();
  }
  await git.addConfig('user.name', GIT_USER_NAME);
  await git.addConfig('user.email', GIT_USER_EMAIL);
  if (GIT_REMOTE_URL) {
    const remotes = await git.getRemotes();
    if (!remotes.find((r) => r.name === 'origin')) {
      await git.addRemote('origin', GIT_REMOTE_URL);
    }
  }
  return git;
}

async function commitAndPush(
  git: SimpleGit,
  filename: string | string[],
  message: string,
  authorName?: string,
  authorEmail?: string,
): Promise<void> {
  await git.add(filename);
  const status = await git.status();
  if (status.staged.length === 0) {
    return;
  }
  const commitOptions: Record<string, OptionsValues> =
    authorName && authorEmail
      ? { '--author': `${authorName} <${authorEmail}>` }
      : {};
  await git.commit(message, undefined, commitOptions);
  if (GIT_REMOTE_URL) {
    git.push().catch((err: unknown) => {
      console.error('git push failed (non-fatal):', err);
    });
  }
}

async function main(): Promise<void> {
  const server = Fastify({ logger: true, bodyLimit: 104857600 });
  const git = await initGit();

  await server.register(fastifyCors, {
    origin: true,
  });

  server.get('/api/diagrams', async (_req, reply) => {
    ensureDataDir();
    const entries = readIndex();
    const withMeta: DiagramEntryWithMeta[] = entries.map((e) => ({
      ...e,
      hasPresentation: fs.existsSync(path.join(DATA_DIR, `${e.id}.html`)),
    }));
    return reply.send(withMeta);
  });

  server.post<{
    Body: { name: string; content: unknown; diagramId?: string; html?: string };
  }>('/api/diagrams', async (req, reply) => {
    ensureDataDir();
    const { name, content, diagramId, html } = req.body;
    if (!name || !content) {
      return reply.status(400).send({ error: 'name and content are required' });
    }

    const entries = readIndex();
    let id: string;

    if (diagramId && entries.find((e) => e.id === diagramId)) {
      // Update existing diagram
      id = diagramId;
      const idx = entries.findIndex((e) => e.id === id);
      entries[idx] = { id, name, savedAt: new Date().toISOString() };
    } else {
      // New diagram
      id = uuidv4();
      entries.push({ id, name, savedAt: new Date().toISOString() });
    }

    const egnFile = path.join(DATA_DIR, `${id}.egn`);
    fs.writeFileSync(egnFile, JSON.stringify(content, null, 2), 'utf-8');
    writeIndex(entries);

    if (html) {
      fs.writeFileSync(path.join(DATA_DIR, `${id}.html`), html, 'utf-8');
    }

    const authorName = req.headers['oidc_claim_name'] as string | undefined;
    const authorEmail = req.headers['oidc_claim_email'] as string | undefined;
    await commitAndPush(git, [`${id}.egn`, 'index.json'], `Save "${name}" - ${new Date().toISOString()}`, authorName, authorEmail);

    return reply.status(201).send({ id });
  });

  server.get<{ Params: { id: string } }>(
    '/api/diagrams/:id',
    async (req, reply) => {
      ensureDataDir();
      const { id } = req.params;
      const filePath = path.join(DATA_DIR, `${id}.egn`);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: 'Diagram not found' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return reply
        .header('Content-Type', 'application/json')
        .send(JSON.parse(content));
    },
  );

  server.get<{ Params: { id: string } }>(
    '/api/diagrams/:id/presentation',
    async (req, reply) => {
      ensureDataDir();
      const { id } = req.params;
      const filePath = path.join(DATA_DIR, `${id}.html`);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: 'Presentation not found' });
      }

      const html = fs.readFileSync(filePath, 'utf-8');
      return reply.header('Content-Type', 'text/html').send(html);
    },
  );

  server.get<{ Params: { id: string } }>(
    '/api/diagrams/:id/versions',
    async (req, reply) => {
      const { id } = req.params;
      const filename = `${id}.egn`;

      try {
        const log = await git.log({ file: filename });
        const versions = log.all.map((entry) => ({
          hash: entry.hash,
          date: entry.date,
          message: entry.message,
        }));
        return reply.send(versions);
      } catch {
        return reply.status(404).send({ error: 'No version history found' });
      }
    },
  );

  server.get<{ Params: { id: string; hash: string } }>(
    '/api/diagrams/:id/versions/:hash',
    async (req, reply) => {
      const { id, hash } = req.params;
      const filename = `${id}.egn`;

      try {
        const content = await git.show([`${hash}:${filename}`]);
        return reply
          .header('Content-Type', 'application/json')
          .send(JSON.parse(content));
      } catch {
        return reply.status(404).send({ error: 'Version not found' });
      }
    },
  );

  server.delete<{ Params: { id: string } }>(
    '/api/diagrams/:id',
    async (req, reply) => {
      ensureDataDir();
      const { id } = req.params;
      const egnPath = path.join(DATA_DIR, `${id}.egn`);

      if (!fs.existsSync(egnPath)) {
        return reply.status(404).send({ error: 'Diagram not found' });
      }

      fs.unlinkSync(egnPath);

      const htmlPath = path.join(DATA_DIR, `${id}.html`);
      if (fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
      }

      const allEntries = readIndex();
      const deletedName = allEntries.find((e) => e.id === id)?.name ?? id;
      writeIndex(allEntries.filter((e) => e.id !== id));

      await commitAndPush(git, [`${id}.egn`, 'index.json'], `Delete "${deletedName}" - ${new Date().toISOString()}`);

      return reply.status(204).send();
    },
  );

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
