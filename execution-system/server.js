const express = require('express');
const Queue = require('bull');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure queue
const codeExecutionQueue = new Queue('code-execution', process.env.REDIS_URL);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Supported languages
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Code execution endpoint
app.post('/execute', async (req, res) => {
    try {
        const { code, language, input } = req.body;

        // Validate request
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }
        if (!language) {
            return res.status(400).json({ error: 'Language is required' });
        }
        if (!SUPPORTED_LANGUAGES.includes(language)) {
            return res.status(400).json({ 
                error: `Unsupported language. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}` 
            });
        }
        if (code.length > 64 * 1024) { // 64KB limit
            return res.status(400).json({ error: 'Code size exceeds limit (64KB)' });
        }

        // Add job to queue
        const job = await codeExecutionQueue.add({
            code,
            language,
            input
        }, {
            attempts: 1,
            timeout: 30000, // 30 second timeout
            removeOnComplete: true
        });

        // Wait for result
        const result = await job.finished();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(port, () => {
    console.log(`[API] Server listening on port ${port}`);
}); 