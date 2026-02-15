import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// Helper to get Gemini AI instance dynamically
function getAIInstance() {
    const config = readConfig();
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const IS_PKG = typeof (process as any).pkg !== 'undefined';
// Use executable path if packaged, otherwise use project root
const ROOT_DIR = IS_PKG ? path.dirname(process.execPath) : path.join(__dirname, '..');

const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const LORA_META_FILE = path.join(DATA_DIR, 'lora_meta.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SITUATIONS_FILE = path.join(DATA_DIR, 'situations.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Initialize data files with defaults
if (!fs.existsSync(CHARACTERS_FILE)) fs.writeFileSync(CHARACTERS_FILE, '[]');
if (!fs.existsSync(LISTS_FILE)) fs.writeFileSync(LISTS_FILE, '["お気に入り"]');
if (!fs.existsSync(SITUATIONS_FILE)) fs.writeFileSync(SITUATIONS_FILE, '{}');

// --- Config Utils ---
function readConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { loraDir: '', wildcardDir: '' };
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!config.wildcardDir) config.wildcardDir = '';
    return config;
}
function writeConfig(config: any) {
    const tempFile = CONFIG_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(config, null, 2));
    fs.renameSync(tempFile, CONFIG_FILE);
}

// --- LoRA Meta Utils ---
function readLoraMeta() {
    if (!fs.existsSync(LORA_META_FILE)) return {};
    return JSON.parse(fs.readFileSync(LORA_META_FILE, 'utf8'));
}
function writeLoraMeta(meta: any) {
    const tempFile = LORA_META_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(meta, null, 2));
    fs.renameSync(tempFile, LORA_META_FILE);
}

// Storage for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});
const upload = multer({ storage });

app.use('/uploads', express.static(UPLOAD_DIR));

// --- Endpoints ---

app.get('/api/config', (req, res) => res.json(readConfig()));
app.put('/api/config', (req, res) => {
    const currentConfig = readConfig();
    const newConfig = { ...currentConfig, ...req.body };
    writeConfig(newConfig);
    res.json(newConfig);
});

app.get('/api/characters', (req, res) => {
    const data = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/characters', (req, res) => {
    const data = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    const newChar = {
        id: uuidv4(),
        favoriteLists: [],
        basePrompts: [],
        variations: [],
        series: '未分類',
        notes: '',
        ...req.body
    };
    data.push(newChar);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(data, null, 2));
    res.json(newChar);
});

app.put('/api/characters/:id', (req, res) => {
    let data = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    data = data.map((c: any) => c.id === req.params.id ? { ...c, ...req.body } : c);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(data, null, 2));
    res.json(req.body);
});

app.delete('/api/characters/:id', (req, res) => {
    let data = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    data = data.filter((c: any) => c.id !== req.params.id);
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.put('/api/characters/order', (req, res) => {
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(req.body.characters, null, 2));
    res.json({ success: true });
});

app.get('/api/lists', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8'));
        res.json(data);
    } catch (err: any) {
        console.error('[/api/lists Error]', err.message);
        res.status(500).json({ error: err.message });
    }
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

    // Sync Characters
    let chars = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    chars = chars.map((c: any) => {
        let updated = false;
        if (c.series === oldName) {
            c.series = newName;
            updated = true;
        }
        if (c.favoriteLists && Array.isArray(c.favoriteLists)) {
            if (c.favoriteLists.includes(oldName)) {
                c.favoriteLists = c.favoriteLists.map((l: string) => l === oldName ? newName : l);
                updated = true;
            }
        }
        return c;
    });
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(chars, null, 2));

    // Sync LoRA Meta
    const loraMeta = readLoraMeta();
    let loraMetaChanged = false;
    Object.keys(loraMeta).forEach(path => {
        if (loraMeta[path].favoriteLists && Array.isArray(loraMeta[path].favoriteLists)) {
            if (loraMeta[path].favoriteLists.includes(oldName)) {
                loraMeta[path].favoriteLists = loraMeta[path].favoriteLists.map((l: string) => l === oldName ? newName : l);
                loraMetaChanged = true;
            }
        }
    });
    if (loraMetaChanged) writeLoraMeta(loraMeta);

    // Sync config's default list if it was the old name
    const config = readConfig();
    if (config.defaultFavoriteList === oldName) {
        config.defaultFavoriteList = newName;
        writeConfig(config);
    }

    res.json({ lists, config }); // Return updated lists and config for full data refresh
});

app.delete('/api/lists/:name', (req, res) => {
    const targetName = req.params.name;
    let lists = JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8'));
    lists = lists.filter((l: string) => l !== targetName);
    fs.writeFileSync(LISTS_FILE, JSON.stringify(lists, null, 2));

    // Cleanup Characters
    let chars = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
    chars = chars.map((c: any) => {
        if (c.favoriteLists && Array.isArray(c.favoriteLists)) {
            c.favoriteLists = c.favoriteLists.filter((l: string) => l !== targetName);
        }
        return c;
    });
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(chars, null, 2));

    // Cleanup LoRA Meta
    const loraMeta = readLoraMeta();
    let loraMetaChanged = false;
    Object.keys(loraMeta).forEach(path => {
        if (loraMeta[path].favoriteLists && Array.isArray(loraMeta[path].favoriteLists)) {
            if (loraMeta[path].favoriteLists.includes(targetName)) {
                loraMeta[path].favoriteLists = loraMeta[path].favoriteLists.filter((l: string) => l !== targetName);
                loraMetaChanged = true;
            }
        }
    });
    if (loraMetaChanged) writeLoraMeta(loraMeta);

    // Cleanup config's default list if it was the target name
    const config = readConfig();
    if (config.defaultFavoriteList === targetName) {
        config.defaultFavoriteList = ''; // Clear default if the list is deleted
        writeConfig(config);
    }

    res.json({ lists, config }); // Return updated lists and config for full data refresh
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

function getSafetensorsMetadata(filePath: string): any {
    try {
        const fd = fs.openSync(filePath, 'r');
        const headerSizeBuffer = Buffer.alloc(8);
        fs.readSync(fd, headerSizeBuffer, 0, 8, 0);
        const headerSize = headerSizeBuffer.readBigUInt64LE();
        if (headerSize > 1024 * 1024 * 10) { // Safety: 10MB max header
            fs.closeSync(fd);
            return {};
        }
        const headerBuffer = Buffer.alloc(Number(headerSize));
        fs.readSync(fd, headerBuffer, 0, Number(headerSize), 8);
        fs.closeSync(fd);
        const header = JSON.parse(headerBuffer.toString());
        return header.__metadata__ || {};
    } catch (e) {
        return {};
    }
}

function detectGeneration(fullPath: string, civitaiInfo: any, meta: any): string {
    // 1. Check Meta Cache
    if (meta?.generation) return meta.generation;

    // 2. Check Civitai Info
    if (civitaiInfo) {
        const base = (civitaiInfo.baseModel || civitaiInfo.modelVersions?.[0]?.baseModel || '').toLowerCase();
        if (base.includes('pony')) return 'Pony';
        if (base.includes('illustrious')) return 'Illustrious';
        if (base.includes('sdxl') || base.includes('xl')) return 'SDXL';
        if (base.includes('sd 1.5') || base.includes('v1.5')) return 'SD1.5';
        if (base.includes('flux')) return 'FLUX';
    }

    // 3. Check Filename keywords
    const lowerName = path.basename(fullPath).toLowerCase();
    if (lowerName.includes('pony')) return 'Pony';
    if (lowerName.includes('illustrious')) return 'Illustrious';
    if (lowerName.includes('sdxl') || lowerName.includes('_xl')) return 'SDXL';

    // 4. Check Safetensors Metadata
    if (fullPath.endsWith('.safetensors')) {
        const md = getSafetensorsMetadata(fullPath);
        const base = (md.ss_base_model_name || '').toLowerCase();
        if (base.includes('xl-base-1.0')) return 'SDXL';
        if (base.includes('v1-5')) return 'SD1.5';
        if (base.includes('pony')) return 'Pony';
        if (base.includes('illustrious')) return 'Illustrious';

        // Check hashing or other clues in metadata if needed
        if (md.ss_sd_model_name?.toLowerCase().includes('xl')) return 'SDXL';
    }

    return 'Unknown';
}

function scanDirectory(dir: string, rootDir: string): any[] {
    if (!fs.existsSync(dir)) return [];
    let items: string[] = [];
    try {
        items = fs.readdirSync(dir);
    } catch (e) {
        console.error(`Error reading directory ${dir}:`, e);
        return [];
    }

    const result: any[] = [];
    const metaRaw = readLoraMeta();
    const meta: any = {};
    Object.entries(metaRaw).forEach(([k, v]) => {
        meta[k.replace(/\\/g, '/')] = v;
    });

    items.forEach(item => {
        try {
            const fullPath = path.join(dir, item);
            const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                result.push({
                    type: 'directory',
                    name: item,
                    path: relPath,
                    children: scanDirectory(fullPath, rootDir)
                });
            } else {
                const ext = path.extname(item).toLowerCase();
                if (['.safetensors', '.pt', '.ckpt'].includes(ext)) {
                    const nameNoExt = path.parse(item).name;

                    // Use the already fetched 'items' to find previews
                    const preview = items.find(f => {
                        const fLower = f.toLowerCase();
                        const nLower = nameNoExt.toLowerCase();
                        return (fLower === nLower + '.png' ||
                            fLower === nLower + '.jpg' ||
                            fLower === nLower + '.jpeg' ||
                            fLower === nLower + '.webp' ||
                            fLower === nLower + '.gif' ||
                            fLower === nLower + '.mp4' ||
                            fLower === nLower + '.preview.png') && f !== item;
                    });

                    let generation = 'Unknown';
                    let modelId = undefined;
                    let trainedWords: string[] = [];
                    let civitaiImages: string[] = [];
                    const infoFile = path.join(dir, nameNoExt + '.civitai.info');
                    const altInfoFile = path.join(dir, nameNoExt + '.info');
                    const targetInfoFile = fs.existsSync(infoFile) ? infoFile : (fs.existsSync(altInfoFile) ? altInfoFile : null);

                    let infoObj = null;
                    if (targetInfoFile) {
                        try {
                            infoObj = JSON.parse(fs.readFileSync(targetInfoFile, 'utf8'));
                            modelId = infoObj.modelId || infoObj.id;
                            if (infoObj.trainedWords && Array.isArray(infoObj.trainedWords)) {
                                trainedWords = infoObj.trainedWords;
                            }
                            const rawImages = infoObj.modelVersions?.[0]?.images || infoObj.images || [];
                            civitaiImages = rawImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);
                        } catch (e) { }
                    }

                    generation = detectGeneration(fullPath, infoObj, meta[relPath]);

                    // If detected but not in meta, we could save it, but let's just use it dynamically for now
                    // If it's a slow process, we might want to cache it in meta.

                    result.push({
                        type: 'file',
                        name: item,
                        path: relPath,
                        size: stat.size,
                        mtime: stat.mtime,
                        previewPath: preview ? path.relative(rootDir, path.join(dir, preview)).replace(/\\/g, '/') : null,
                        modelId,
                        trainedWords,
                        generation,
                        civitaiImages: (civitaiImages.length > 0) ? civitaiImages : (meta[relPath]?.civitaiImages || []),
                        civitaiUrl: modelId ? `https://civitai.com/models/${modelId}` : (meta[relPath]?.civitaiUrl || null)
                    });
                }
            }
        } catch (e) {
            console.error(`Error processing item ${item} in ${dir}:`, e);
        }
    });
    return result;
}

app.get('/api/loras/files', (req, res) => {
    try {
        const config = readConfig();
        if (!config.loraDir || !fs.existsSync(config.loraDir)) {
            return res.json({ files: [], meta: {}, rootDir: config.loraDir });
        }
        const files = scanDirectory(config.loraDir, config.loraDir);
        const meta = readLoraMeta();
        res.json({ files, meta, rootDir: config.loraDir });
    } catch (err: any) {
        console.error('[/api/loras/files Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/loras/image', (req, res) => {
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).send('Missing path');
    const config = readConfig();
    if (!config.loraDir) return res.status(400).send('LoRA directory not configured');

    try {
        const loraRootDir = path.resolve(config.loraDir);
        const normalizedRelPath = (relPath as string).replace(/\//g, path.sep).replace(/\\/g, path.sep);
        let fullPath = path.resolve(loraRootDir, normalizedRelPath);

        // Security check: ensure the resolved path is still within loraDir (case-insensitive for Windows)
        if (!fullPath.toLowerCase().startsWith(loraRootDir.toLowerCase())) {
            console.error(`[Image Error] Path traversal attempt: ${fullPath}`);
            return res.status(403).send('Forbidden: Path outside of LoRA directory');
        }

        // Extension fallback logic: if direct match fails, try other common image extensions
        if (!fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase();
            const baseDir = path.dirname(fullPath);
            const nameNoExt = path.parse(fullPath).name;
            const commonExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4'];

            let found = false;
            for (const tryExt of commonExts) {
                const tryPath = path.join(baseDir, nameNoExt + tryExt);
                if (fs.existsSync(tryPath)) {
                    fullPath = tryPath;
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.error(`[Image Error] File not found after ext fallback: ${fullPath}`);
                return res.status(404).send('Not found');
            }
        }

        // Use dotfiles: 'allow' to support serving images from .tag_images or other dot-folders
        res.sendFile(fullPath, { dotfiles: 'allow' }, (err) => {
            if (err) {
                console.error(`[Image Error] Error sending file: ${err.message}`);
                // Only send error if headers haven't been sent
                if (!res.headersSent) {
                    res.status(500).send(err.message);
                }
            }
        });
    } catch (e: any) {
        console.error(`[Image Error] Exception: ${e.message}`);
        res.status(500).send(e.message);
    }
});

app.put('/api/loras/meta', (req, res) => {
    const { path: loraPath, data } = req.body;
    const meta = readLoraMeta();
    meta[loraPath] = { ...(meta[loraPath] || {}), ...data };
    writeLoraMeta(meta);
    res.json({ success: true });
});

app.post('/api/loras/meta/batch', (req, res) => {
    const { updates } = req.body;
    const meta = readLoraMeta();
    updates.forEach((u: any) => {
        meta[u.path] = { ...(meta[u.path] || {}), ...u.data };
    });
    writeLoraMeta(meta);
    res.json({ success: true });
});

app.post('/api/loras/folder', (req, res) => {
    const { parentPath, name } = req.body;
    const config = readConfig();
    const fullPath = path.join(config.loraDir, parentPath, name);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    res.json({ success: true });
});

app.put('/api/loras/rename', (req, res) => {
    const { currentPath, newName } = req.body;
    const config = readConfig();
    const oldFullPath = path.join(config.loraDir, currentPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    if (fs.existsSync(newFullPath)) return res.status(400).json({ error: 'Target already exists' });

    fs.renameSync(oldFullPath, newFullPath);

    // Update Meta
    const meta = readLoraMeta();
    const oldRel = currentPath.replace(/\\/g, '/');
    const newRel = path.join(path.dirname(currentPath), newName).replace(/\\/g, '/');

    if (meta[oldRel]) {
        meta[newRel] = meta[oldRel];
        delete meta[oldRel];
    }
    // Also sub-items if directory
    Object.keys(meta).forEach(key => {
        if (key.startsWith(oldRel + '/')) {
            const newKey = newRel + key.substring(oldRel.length);
            meta[newKey] = meta[key];
            delete meta[key];
        }
    });

    writeLoraMeta(meta);
    res.json({ success: true });
});

app.delete('/api/loras/delete', (req, res) => {
    const { targetPath } = req.body;
    const config = readConfig();
    const fullPath = path.join(config.loraDir, targetPath);
    if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true });
        } else {
            // Delete related files too
            const dir = path.dirname(fullPath);
            const nameNoExt = path.parse(fullPath).name;
            const related = fs.readdirSync(dir).filter(f => f.startsWith(nameNoExt + '.'));
            related.forEach(f => fs.unlinkSync(path.join(dir, f)));
        }
    }
    res.json({ success: true });
});

// Helper for move logic
function performMove(sourcePath: string, destPath: string, rootDir: string, meta: any) {
    const fullSourcePath = path.join(rootDir, sourcePath);
    const fullDestDir = path.join(rootDir, destPath);

    if (!fs.existsSync(fullSourcePath) || !fs.existsSync(fullDestDir)) return false;

    const stat = fs.statSync(fullSourcePath);
    const dirName = path.basename(fullSourcePath);
    const fileName = path.basename(fullSourcePath);

    if (stat.isDirectory()) {
        const fullNewPath = path.join(fullDestDir, dirName);
        if (fs.existsSync(fullNewPath)) return false;
        fs.renameSync(fullSourcePath, fullNewPath);

        // Update meta for dir
        const oldRel = sourcePath.replace(/\\/g, '/');
        const newRel = (destPath === '' ? dirName : destPath.replace(/\\/g, '/') + '/' + dirName);
        Object.keys(meta).forEach(key => {
            if (key === oldRel || key.startsWith(oldRel + '/')) {
                const newKey = newRel + key.substring(oldRel.length);
                meta[newKey] = meta[key];
                delete meta[key];
            }
        });
    } else {
        const sourceDir = path.dirname(fullSourcePath);
        const nameNoExt = path.parse(fileName).name;
        const related = fs.readdirSync(sourceDir).filter(f => f === fileName || f.startsWith(nameNoExt + '.'));

        related.forEach(f => {
            const oldP = path.join(sourceDir, f);
            const newP = path.join(fullDestDir, f);
            if (!fs.existsSync(newP)) fs.renameSync(oldP, newP);
        });

        const oldRel = sourcePath.replace(/\\/g, '/');
        const newRel = (destPath === '' ? fileName : destPath.replace(/\\/g, '/') + '/' + fileName);
        if (meta[oldRel]) {
            meta[newRel] = meta[oldRel];
            delete meta[oldRel];
        }
    }
    return true;
}

app.post('/api/loras/move', (req, res) => {
    const { sourcePath, destPath } = req.body;
    const config = readConfig();
    const meta = readLoraMeta();
    if (performMove(sourcePath, destPath, config.loraDir, meta)) {
        writeLoraMeta(meta);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Move failed' });
    }
});

app.post('/api/loras/move-batch', (req, res) => {
    const { sourcePaths, destPath } = req.body;
    const config = readConfig();
    const meta = readLoraMeta();
    let anySuccess = false;
    sourcePaths.forEach((sp: string) => {
        if (performMove(sp, destPath, config.loraDir, meta)) anySuccess = true;
    });
    if (anySuccess) writeLoraMeta(meta);
    res.json({ success: anySuccess });
});

const DESCRIPTION_CACHE: Record<string, { description: string, images: any[] }> = {};

app.get('/api/loras/model-description', async (req, res) => {
    const modelId = req.query.modelId as string;
    const loraPath = req.query.loraPath as string;
    if (!modelId) return res.status(400).json({ error: 'Missing modelId' });

    const config = readConfig();
    let localInfo: any = null;

    // Load Local Info as potential fallback
    if (loraPath) {
        const fullLoraPath = path.join(config.loraDir, loraPath);
        const infoFile = path.join(path.dirname(fullLoraPath), path.parse(fullLoraPath).name + '.civitai.info');
        const altInfoFile = path.join(path.dirname(fullLoraPath), path.parse(fullLoraPath).name + '.info');
        const targetInfoFile = fs.existsSync(infoFile) ? infoFile : (fs.existsSync(altInfoFile) ? altInfoFile : null);
        if (targetInfoFile) {
            try {
                localInfo = JSON.parse(fs.readFileSync(targetInfoFile, 'utf8'));
            } catch (e) { }
        }
    }

    // Function to format response from info object
    const formatInfoResponse = (info: any, isLocal: boolean) => {
        let combinedDesc = info.description || '';
        const versions = info.modelVersions || [];
        if (versions && versions.length > 0) {
            versions.forEach((v: any) => {
                if (v.description && v.description !== info.description) {
                    combinedDesc += (combinedDesc ? '<hr/>' : '') + `<h4>Version: ${v.name}</h4>` + v.description;
                }
            });
        }
        if (!combinedDesc && versions && versions.length > 0) {
            const v = versions[0];
            combinedDesc = `
                <div style="text-align:center;padding:1rem;">
                    <p>Model found, but no text description was provided.</p>
                    <p><strong>Base Model:</strong> ${v.baseModel || 'Unknown'}</p>
                    <p><strong>Created:</strong> ${v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    ${v.trainedWords?.length ? `<p><strong>Trained Words:</strong> ${v.trainedWords.join(', ')}</p>` : ''}
                </div>
            `;
        }

        const images = versions?.[0]?.images || info.images || [];
        const trainedWords = versions?.[0]?.trainedWords || info.trainedWords || [];

        return {
            description: combinedDesc,
            images,
            trainedWords,
            isLocal,
            fullData: info // Return full data for debugging/completeness
        };
    };

    // If not refreshing and we have good local data, use it
    if (!req.query.refresh && localInfo && Object.keys(localInfo).length > 5) {
        return res.json(formatInfoResponse(localInfo, true));
    }

    // Fallback to API/Cache
    if (!req.query.refresh && DESCRIPTION_CACHE[modelId]) {
        return res.json(DESCRIPTION_CACHE[modelId]);
    }

    try {
        const response = await axios.get(`https://civitai.com/api/v1/models/${modelId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });

        // Save to Local .civitai.info AUTOMATICALLY
        if (loraPath) {
            const fullLoraPath = path.join(config.loraDir, loraPath);
            const infoFile = path.join(path.dirname(fullLoraPath), path.parse(fullLoraPath).name + '.civitai.info');
            fs.writeFileSync(infoFile, JSON.stringify(response.data, null, 2), 'utf8');

            // ALSO update lora_meta.json with images for immediate card update
            const meta = readLoraMeta();
            const images = response.data.modelVersions?.[0]?.images?.map((img: any) => img.url).filter(Boolean) || [];
            if (images.length > 0) {
                meta[loraPath] = { ...(meta[loraPath] || {}), civitaiImages: images };
                writeLoraMeta(meta);
            }
        }

        const result = formatInfoResponse(response.data, false);
        DESCRIPTION_CACHE[modelId] = result;
        return res.json(result);

    } catch (e: any) {
        console.error(`Civitai fetch failed for model ${modelId}:`, e.message);
        // CRITICAL FALLBACK: If API fails (e.g. deleted from Civitai), use local info if we have it
        if (localInfo) {
            return res.json(formatInfoResponse(localInfo, true));
        }
        res.status(500).json({ error: e.message, isLocal: false });
    }
});

app.post('/api/loras/upload-preview', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { loraPath } = req.body;
    if (!loraPath) return res.status(400).json({ error: 'Missing loraPath' });

    const config = readConfig();
    const fullLoraPath = path.join(config.loraDir, loraPath);

    if (!fs.existsSync(fullLoraPath)) {
        return res.status(404).json({ error: 'LoRA file not found' });
    }

    const loraDir = path.dirname(fullLoraPath);
    const loraNameNoExt = path.parse(fullLoraPath).name;
    const imgExt = path.extname(req.file.originalname).toLowerCase() || '.png';
    const newPreviewPath = path.join(loraDir, loraNameNoExt + imgExt);

    try {
        // Safe move across drives: copy then delete
        fs.copyFileSync(req.file.path, newPreviewPath);
        fs.unlinkSync(req.file.path);
        res.json({ success: true, previewPath: path.relative(config.loraDir, newPreviewPath).replace(/\\/g, '/') });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/loras/upload-tag-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { loraPath, tagName } = req.body;
    if (!loraPath || !tagName) return res.status(400).json({ error: 'Missing parameters' });

    const config = readConfig();
    const fullLoraPath = path.resolve(config.loraDir, loraPath);
    if (!fs.existsSync(fullLoraPath)) return res.status(404).json({ error: 'LoRA not found' });

    const loraDir = path.dirname(fullLoraPath);
    const tagImagesDir = path.join(loraDir, '.tag_images');

    if (!fs.existsSync(tagImagesDir)) {
        fs.mkdirSync(tagImagesDir, { recursive: true });
    }

    const imgExt = path.extname(req.file.originalname).toLowerCase() || '.png';
    // Use a hash of the tag name plus the LoRA filename to keep it short and safe for the OS
    const loraNameNoExt = path.parse(fullLoraPath).name;
    const hash = crypto.createHash('md5').update(tagName).digest('hex').substring(0, 12);
    const tagImgName = `${loraNameNoExt}_${hash}${imgExt}`;
    const targetPath = path.join(tagImagesDir, tagImgName);

    try {
        fs.copyFileSync(req.file.path, targetPath);
        fs.unlinkSync(req.file.path);
        const relPath = path.relative(path.resolve(config.loraDir), path.resolve(targetPath)).replace(/\\/g, '/');
        res.json({ success: true, imagePath: relPath });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Wildcard Features ---

function scanWildcardDir(dir: string, rootDir: string): any[] {
    if (!fs.existsSync(dir)) return [];
    const items = fs.readdirSync(dir);
    const result: any[] = [];

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            result.push({
                type: 'directory',
                name: item,
                path: relPath,
                children: scanWildcardDir(fullPath, rootDir)
            });
        } else {
            const ext = path.extname(item).toLowerCase();
            if (ext === '.txt') {
                result.push({
                    type: 'file',
                    name: item,
                    path: relPath,
                    size: stat.size,
                    mtime: stat.mtime
                });
            }
        }
    });
    return result;
}

app.get('/api/wildcards/files', (req, res) => {
    const config = readConfig();
    if (!config.wildcardDir || !fs.existsSync(config.wildcardDir)) {
        return res.json({ files: [], rootDir: config.wildcardDir || '' });
    }
    const files = scanWildcardDir(config.wildcardDir, config.wildcardDir);
    res.json({ files, rootDir: config.wildcardDir });
});

app.get('/api/wildcards/content', (req, res) => {
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).send('Missing path');
    const config = readConfig();
    const fullPath = path.join(config.wildcardDir, relPath as string);

    if (!fullPath.toLowerCase().startsWith(path.resolve(config.wildcardDir).toLowerCase())) {
        return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(fullPath)) return res.status(404).send('Not found');
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content });
});

app.put('/api/wildcards/content', (req, res) => {
    const { path: relPath, content } = req.body;
    if (!relPath) return res.status(400).send('Missing path');
    const config = readConfig();
    const fullPath = path.join(config.wildcardDir, relPath);

    if (!fullPath.toLowerCase().startsWith(path.resolve(config.wildcardDir).toLowerCase())) {
        return res.status(403).send('Forbidden');
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ success: true });
});

app.post('/api/wildcards/file', (req, res) => {
    const { parentPath, name } = req.body;
    const config = readConfig();
    const fullPath = path.join(config.wildcardDir, parentPath, name.endsWith('.txt') ? name : name + '.txt');

    if (!fullPath.toLowerCase().startsWith(path.resolve(config.wildcardDir).toLowerCase())) {
        return res.status(403).send('Forbidden');
    }

    if (fs.existsSync(fullPath)) return res.status(400).json({ error: 'File already exists' });

    fs.writeFileSync(fullPath, '', 'utf8');
    res.json({ success: true });
});

app.delete('/api/wildcards/file', (req, res) => {
    const { targetPath } = req.body;
    const config = readConfig();
    const fullPath = path.join(config.wildcardDir, targetPath);

    if (!fullPath.toLowerCase().startsWith(path.resolve(config.wildcardDir).toLowerCase())) {
        return res.status(403).send('Forbidden');
    }

    if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true });
        } else {
            fs.unlinkSync(fullPath);
        }
    }
    res.json({ success: true });
});

app.post('/api/loras/analyze-tags', async (req, res) => {
    try {
        console.log('AI Analysis Request received');
        const ai = getAIInstance();
        if (!ai) {
            console.error('AI API Key is missing');
            return res.status(500).json({ error: 'AI API Key not configured. Please set it in Settings.' });
        }

        let { triggerWords } = req.body;
        // Ensure triggerWords is an array of strings
        if (typeof triggerWords === 'string') {
            triggerWords = triggerWords.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        if (!triggerWords || !Array.isArray(triggerWords) || triggerWords.length === 0) {
            console.warn('No trigger words to analyze');
            return res.json({ base: [], variations: [] });
        }

        console.log(`Analyzing ${triggerWords.length} tags...`);

        const model = ai.getGenerativeModel({ model: "gemini-3-pro-preview" });
        const prompt = `
Task: Analyze unique trigger words of a character LoRA and split them into "Physical Features" (Base) and "Outfit Sets" (Variations).

Tags to Analyze:
"${triggerWords.join(', ')}"

Rules:
1. "physical": Core features that DONT change with clothes (e.g., hair color, eye color, body type, species, skin, character name).
2. "variations": A list of separate outfits. 
   - CRITICAL: If you see distinct outfit keys like "B1jouDef", "B1jouNwYrs", "Costume A", "Bikini", etc., create a NEW variation for EACH set.
   - For each variation, give it a human-friendly "name" (e.g., "New Year Furisode") and a list of "prompts" specific to that outfit.
   - Do NOT combine different outfits into one variation.

Format:
Return ONLY clean JSON:
{
  "physical": ["tag1", "tag2"],
  "variations": [
    {"name": "Default Outfit", "prompts": ["outfit_key1", "dress", "hat"]},
    {"name": "Summer Style", "prompts": ["outfit_key2", "swimsuit", "sunglasses"]}
  ]
}
No preamble, no code blocks, just raw JSON.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        console.log('AI Raw Response:', text);

        let jsonStr = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        console.log(`Detected ${parsed.variations?.length || 0} variations`);

        res.json({
            base: parsed.physical || [],
            variations: (parsed.variations || []).map((v: any, idx: number) => ({
                id: `v-${Date.now()}-${idx}`,
                name: v.name || `衣装 ${idx + 1}`,
                prompts: v.tags || v.prompts || []
            }))
        });
    } catch (err: any) {
        console.error('AI Analysis Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Static UI Serving (for production/EXE) ---
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
    console.log(`[Server] Serving Client UI from: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
    // SPA fallback
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
} else {
    console.log('[Server] Client dist not found. Operating in API mode only.');
}

app.listen(port, '0.0.0.0', () => {
    const url = `http://localhost:${port}`;
    console.log(`[Server] Character LoRA Manager running at ${url}`);
    console.log(`[Server] Data Directory: ${DATA_DIR}`);

    // Automatically open browser ONLY when packaged (EXE)
    if (IS_PKG) {
        const { exec } = require('child_process');
        const startCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');

        // Tiny delay to ensure server is fully responsive before browser opens
        setTimeout(() => {
            exec(`${startCmd} ${url}`, (err: any) => {
                if (err) console.error('[Server] Failed to open browser automatically:', err.message);
            });
        }, 1000);
    } else {
        console.log(`[Server] Development mode detected. Skipping automatic browser opening.`);
    }
});
