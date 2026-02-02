import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const LORA_META_FILE = path.join(DATA_DIR, 'lora_meta.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SITUATIONS_FILE = path.join(DATA_DIR, 'situations.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CHARACTERS_FILE)) fs.writeFileSync(CHARACTERS_FILE, '[]');
if (!fs.existsSync(LISTS_FILE)) fs.writeFileSync(LISTS_FILE, '[]');
if (!fs.existsSync(SITUATIONS_FILE)) fs.writeFileSync(SITUATIONS_FILE, '{}');

// --- Config Utils ---
function readConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { loraDir: '' };
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}
function writeConfig(config: any) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// --- LoRA Meta Utils ---
function readLoraMeta() {
    if (!fs.existsSync(LORA_META_FILE)) return {};
    return JSON.parse(fs.readFileSync(LORA_META_FILE, 'utf8'));
}
function writeLoraMeta(meta: any) {
    fs.writeFileSync(LORA_META_FILE, JSON.stringify(meta, null, 2));
}

// --- Multer Setup ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// --- Character Routes ---
app.get('/api/characters', (req, res) => {
    const data = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/characters', (req, res) => {
    const characters = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    const newChar = { ...req.body, id: uuidv4() };
    characters.push(newChar);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2));
    res.json(newChar);
});

app.put('/api/characters/:id', (req, res) => {
    let characters = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    const index = characters.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
        characters[index] = { ...characters[index], ...req.body };
        fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2));
        res.json(characters[index]);
    } else {
        res.status(404).json({ error: 'Character not found' });
    }
});

app.delete('/api/characters/:id', (req, res) => {
    let characters = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    characters = characters.filter((c: any) => c.id !== req.params.id);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2));
    res.json({ success: true });
});

app.put('/api/characters/order', (req, res) => {
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(req.body.characters, null, 2));
    res.json({ success: true });
});

app.get('/api/lists', (req, res) => {
    const data = JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/lists', (req, res) => {
    fs.writeFileSync(LISTS_FILE, JSON.stringify(req.body.lists, null, 2));
    res.json(req.body.lists);
});

app.put('/api/lists/:name', (req, res) => {
    let lists = JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8'));
    const oldName = req.params.name;
    const newName = req.body.newName;
    lists = lists.map((l: string) => l === oldName ? newName : l);
    fs.writeFileSync(LISTS_FILE, JSON.stringify(lists, null, 2));

    let chars = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    chars = chars.map((c: any) => c.series === oldName ? { ...c, series: newName } : c);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(chars, null, 2));

    res.json({ lists });
});

app.delete('/api/lists/:name', (req, res) => {
    let lists = JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8'));
    lists = lists.filter((l: string) => l !== req.params.name);
    fs.writeFileSync(LISTS_FILE, JSON.stringify(lists, null, 2));
    res.json({ lists });
});

app.get('/api/situations', (req, res) => {
    const data = JSON.parse(fs.readFileSync(SITUATIONS_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/situations', (req, res) => {
    fs.writeFileSync(SITUATIONS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- LoRA Features ---
// Simplified for Vercel - LoRA directory scanning disabled in production
app.get('/api/loras/files', (req, res) => {
    res.json({ files: [], meta: readLoraMeta(), rootDir: '' });
});

app.get('/api/config', (req, res) => {
    res.json(readConfig());
});

app.put('/api/config', (req, res) => {
    writeConfig(req.body);
    res.json(req.body);
});

app.put('/api/loras/meta', (req, res) => {
    const meta = readLoraMeta();
    meta[req.body.path] = { ...meta[req.body.path], ...req.body.data };
    writeLoraMeta(meta);
    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Export for Vercel
export default app;

// Start server locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
