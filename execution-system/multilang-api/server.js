import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const SUPPORTED = new Set(['python','javascript','java','cpp','c']);

function ext(lang){
  return { python:'.py', javascript:'.js', java:'.java', cpp:'.cpp', c:'.c' }[lang];
}

function buildRawCommand(lang, filename) {
  switch (lang) {
    case 'python':     return `python3 ${filename}`;
    case 'javascript': return `node ${filename}`;
    case 'java':       return `cd ${path.dirname(filename)} && javac ${path.basename(filename)} && java Solution`;
    case 'cpp':        return `cd ${path.dirname(filename)} && g++ -std=c++17 -O2 -o exec ${path.basename(filename)} && ./exec`;
    case 'c':          return `cd ${path.dirname(filename)} && gcc -O2 -o exec ${path.basename(filename)} && ./exec`;
    default: throw new Error('Unsupported');
  }
}

function wrapWithTime(rawCmd) {
  // Run the whole compound command inside bash so 'cd' is available
  // time will execute bash as the measured program
  return { cmd: '/usr/bin/time', args: ['-f', '__STATS__ %M %e', 'bash', '-lc', rawCmd] };
}

function prepareJava(code){
  // Extract import lines anywhere in the code
  const importRegex = /^\s*import\s+[^;]+;\s*$/gm;
  const imports = code.match(importRegex)?.join('\n') || '';
  let body = code.replace(importRegex, '').trim();

  // Normalize line endings
  body = body.replace(/\r\n/g, '\n');

  // Ensure class name is Solution and main is present
  if (/public\s+class\s+\w+/.test(body)) {
    body = body.replace(/public\s+class\s+\w+/, 'public class Solution');
  } else if (/class\s+\w+/.test(body) && /static\s+void\s+main\s*\(/.test(body)) {
    body = body.replace(/class\s+\w+/, 'public class Solution');
  } else if (/static\s+void\s+main\s*\(/.test(body)) {
    // Has a main method but no class definition
    body = `public class Solution {\n${body}\n}`;
  } else {
    // No main or class; wrap as a simple main
    body = `public class Solution {\n  public static void main(String[] args) {\n    ${body}\n  }\n}`;
  }

  return `${imports ? imports + '\n' : ''}${body}\n`;
}

app.get('/health', (req,res)=>res.json({status:'ok'}));

app.post('/api/execute', async (req,res) => {
  try {
    const { code, language, input = '' } = req.body || {};
    if (!code || !language) return res.status(400).json({ error: 'code and language required' });
    if (!SUPPORTED.has(language)) return res.status(400).json({ error: `unsupported language: ${language}` });

    const name = language === 'java' ? 'Solution.java' : `code${ext(language)}`;
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-'));
    const file = path.join(dir, name);
    const program = language === 'java' ? prepareJava(code) : code;
    await fs.writeFile(file, program, 'utf8');

    const rawCmd = buildRawCommand(language, file);
    const { cmd, args } = wrapWithTime(rawCmd);
    const child = spawn(cmd, args, { cwd: dir });

    let stdout = '', stderr = '';
    const start = Date.now();

    if (input) {
      child.stdin.write(input);
      if (!input.endsWith('\n')) child.stdin.write('\n');
    }
    child.stdin.end();

    const timeoutMs = 15000;
    const t = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', async (code) => {
      clearTimeout(t);
      try { await fs.rm(dir, { recursive:true, force:true }); } catch {}

      // Parse GNU time stats from stderr
      let usedKb = 0; let elapsedSec = null;
      const lines = stderr.split(/\r?\n/);
      const statLine = lines.find(l => l.startsWith('__STATS__'));
      if (statLine) {
        const match = statLine.match(/__STATS__\s+(\d+)\s+([0-9.]+)/);
        if (match) {
          usedKb = parseInt(match[1], 10) || 0;
          elapsedSec = parseFloat(match[2]);
        }
        // Remove stats line from program stderr
        stderr = lines.filter(l => l !== statLine).join('\n');
      }

      const runtimeMs = Number.isFinite(elapsedSec) ? Math.round(elapsedSec * 1000) : (Date.now() - start);
      const memoryMb = usedKb > 0 ? Math.round(usedKb / 1024) : 0;

      if (code !== 0) return res.json({ status:'error', output: stdout.trim(), error: stderr.trim() || 'Runtime Error', runtime: runtimeMs, memory: memoryMb });
      return res.json({ status:'success', output: stdout.trim(), error: '', runtime: runtimeMs, memory: memoryMb });
    });

    child.on('error', async (err) => {
      clearTimeout(t);
      try { await fs.rm(dir, { recursive:true, force:true }); } catch {}
      return res.status(500).json({ status:'error', error: `spawn failed: ${err.message}`, output:'', runtime:0, memory:0 });
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '3000', () => console.log(`executor listening on ${port}`)); 