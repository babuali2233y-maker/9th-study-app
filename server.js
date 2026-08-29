const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Store chat histories (in production, use a database)
const chatHistories = new Map();

// Initialize Gemini
let genAI;

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { 
            message, 
            model = 'gemini-2.0-flash-exp',
            apiKey,
            systemPrompt,
            sessionId = 'default',
            temperature = 0.7,
            maxTokens = 2048
        } = req.body;

        // Validate API key
        if (!apiKey) {
            return res.status(400).json({ 
                error: 'API key is required. Please add your Gemini API key in settings.' 
            });
        }

        // Initialize Gemini with user's API key
        genAI = new GoogleGenerativeAI(apiKey);
        
        // Get the model
        const geminiModel = genAI.getGenerativeModel({ 
            model: model,
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens,
                topP: 0.95,
                topK: 40,
            }
        });

        // Get or create chat history for this session
        if (!chatHistories.has(sessionId)) {
            chatHistories.set(sessionId, []);
        }
        const history = chatHistories.get(sessionId);

        // Add user message to history
        history.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // Prepare system prompt if provided
        let fullPrompt = message;
        if (systemPrompt) {
            fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
        }

        // Generate response
        const result = await geminiModel.generateContent({
            contents: [
                ...(systemPrompt ? [{ role: 'system', parts: [{ text: systemPrompt }] }] : []),
                ...history
            ],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens,
                topP: 0.95,
                topK: 40,
            }
        });

        const response = result.response;
        const responseText = response.text();

        // Add assistant response to history
        history.push({
            role: 'assistant',
            parts: [{ text: responseText }]
        });

        // Limit history to last 20 messages to avoid token limits
        if (history.length > 20) {
            chatHistories.set(sessionId, history.slice(-20));
        }

        res.json({
            success: true,
            response: responseText,
            sessionId: sessionId,
            usage: {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        
        let errorMessage = 'An error occurred while processing your request.';
        let statusCode = 500;

        if (error.message.includes('API key')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
            statusCode = 401;
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded. Please try again later or check your billing.';
            statusCode = 429;
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            statusCode = 429;
        }

        res.status(statusCode).json({
            error: errorMessage,
            details: error.message
        });
    }
});

// Clear chat history
app.post('/api/clear-history', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && chatHistories.has(sessionId)) {
        chatHistories.delete(sessionId);
        res.json({ success: true, message: 'Chat history cleared.' });
    } else {
        res.status(404).json({ error: 'Session not found.' });
    }
});

// Get chat history
app.get('/api/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (chatHistories.has(sessionId)) {
        res.json({ 
            success: true, 
            history: chatHistories.get(sessionId) 
        });
    } else {
        res.json({ 
            success: true, 
            history: [] 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
});
