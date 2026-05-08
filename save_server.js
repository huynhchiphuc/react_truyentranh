import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

app.use(cors());
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});
app.use(bodyParser.json({ limit: '50mb' }));

// Helper to get absolute path from relative run folder
const getAbsPath = (runFolder, filename) => {
    return path.join(__dirname, 'public', runFolder, filename);
};

// ─── Save Screenplay (Characters) ──────────────────────────────────────────
app.post('/api/save-characters', (req, res) => {
    const { runFolder, characters } = req.body;
    const filePath = getAbsPath(runFolder, 'screenplay_parsed.json');

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Update characters matching by slug or name
        data.characters = data.characters.map(sc => {
            const updated = characters.find(c => c.id === sc.slug || c.name === sc.name);
            if (updated) {
                return { ...sc, description: updated.description };
            }
            return sc;
        });

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[Characters] Saved to ${filePath}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Save Panel Prompts ─────────────────────────────────────────────────────
app.post('/api/save-panels', (req, res) => {
    const { runFolder, panels } = req.body;
    const filePath = getAbsPath(runFolder, 'panels_with_prompts.json');

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Update prompts matching by panel_id
        data.panels = data.panels.map(sp => {
            const updated = panels.find(p => p.id === sp.panel_id);
            if (updated && updated.script) {
                return { ...sp, prompt: updated.script.ai_prompt };
            }
            return sp;
        });

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[Panels] Saved to ${filePath}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Save Full Layout ───────────────────────────────────────────────────────
app.post('/api/save-layout', (req, res) => {
    const { runFolder, pages } = req.body;
    const filePath = getAbsPath(runFolder, 'layout.json');

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const updatedPanels = pages.flatMap(pg => pg.panels);

        data.pages = data.pages.map(pg => ({
            ...pg,
            panels: pg.panels.map(sp => {
                const updated = updatedPanels.find(up => up.id === sp.panel_id || up.file_name === sp.file_name);
                if (updated) {
                    return {
                        ...sp,
                        vertices: updated.polygon ? updated.polygon.map(v => [v.x, v.y]) : sp.vertices,
                        bbox: updated.frame ? { x: updated.frame.x, y: updated.frame.y, w: updated.frame.width, h: updated.frame.height } : sp.bbox
                    };
                }
                return sp;
            })
        }));

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[Layout] Saved to ${filePath}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Detect Text Box ────────────────────────────────────────────────────────
app.post('/api/detect-text', (req, res) => {
    const { runFolder, filename } = req.body;
    // The store uses ai_output for the generated panel images
    const imagePath = getAbsPath(runFolder, `ai_output/${filename}`);
    
    // Fallback to check if it's in panels folder (original raw panels if any)
    const altPath = getAbsPath(runFolder, `panels/${filename}`);
    const finalImagePath = fs.existsSync(imagePath) ? imagePath : altPath;

    if (!fs.existsSync(finalImagePath)) {
        return res.status(404).json({ error: 'Image not found at ' + finalImagePath });
    }

    const scriptPath = path.join(__dirname, 'tach_box_text', 'detect_wrapper.py');
    const pythonCmd = `python "${scriptPath}" "${finalImagePath}"`;

    console.log(`[Detect] Running: ${pythonCmd}`);

    exec(pythonCmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: error.message });
        }
        try {
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (e) {
            console.error(`JSON parse error: ${e}\nStdout: ${stdout}`);
            res.status(500).json({ error: 'Failed to parse detector output', details: stdout });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Save Server running on http://localhost:${PORT}`);
});
