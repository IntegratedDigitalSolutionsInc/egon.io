import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = process.env['DATA_DIR'] ?? path.join(process.cwd(), 'data');
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

interface DiagramEntry {
  id: string;
  name: string;
  savedAt: string;
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

async function main(): Promise<void> {
  const server = Fastify({ logger: true });

  await server.register(fastifyCors, {
    origin: true,
  });

  server.get('/api/diagrams', async (_req, reply) => {
    ensureDataDir();
    const entries = readIndex();
    return reply.send(entries);
  });

  server.post<{
    Body: { name: string; content: unknown };
  }>('/api/diagrams', async (req, reply) => {
    ensureDataDir();
    const { name, content } = req.body;
    if (!name || !content) {
      return reply.status(400).send({ error: 'name and content are required' });
    }

    const id = uuidv4();
    const filePath = path.join(DATA_DIR, `${id}.egn`);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');

    const entry: DiagramEntry = { id, name, savedAt: new Date().toISOString() };
    const entries = readIndex();
    entries.push(entry);
    writeIndex(entries);

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

  server.delete<{ Params: { id: string } }>(
    '/api/diagrams/:id',
    async (req, reply) => {
      ensureDataDir();
      const { id } = req.params;
      const filePath = path.join(DATA_DIR, `${id}.egn`);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: 'Diagram not found' });
      }

      fs.unlinkSync(filePath);

      const entries = readIndex().filter((e) => e.id !== id);
      writeIndex(entries);

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
