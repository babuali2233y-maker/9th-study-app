require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// ============================================================
// DATABASE CONNECTION
// ============================================================
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================================
// MODELS
// ============================================================
const StudySchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        enum: ['Chemistry', 'Physics', 'Biology', 'English']
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'Admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Study = mongoose.model('Study', StudySchema);

// ============================================================
// ROUTES
// ============================================================

// 🟢 GET all studies
app.get('/api/studies', async (req, res) => {
    try {
        const studies = await Study.find().sort({ createdAt: -1 });
        res.json({ success: true, data: studies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🟢 GET studies by subject
app.get('/api/studies/:subject', async (req, res) => {
    try {
        const studies = await Study.find({ 
            subject: req.params.subject 
        }).sort({ createdAt: -1 });
        res.json({ success: true, data: studies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔐 POST add new study (Admin only)
app.post('/api/studies', async (req, res) => {
    try {
        const { subject, title, description, image, password } = req.body;
        
        // Check admin password
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: '❌ Invalid admin password!' 
            });
        }

        const study = new Study({
            subject,
            title,
            description,
            image: image || ''
        });

        await study.save();
        res.status(201).json({ 
            success: true, 
            message: '✅ Study added successfully!',
            data: study 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔐 DELETE study (Admin only)
app.delete('/api/studies/:id', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: '❌ Invalid admin password!' 
            });
        }

        const study = await Study.findByIdAndDelete(req.params.id);
        if (!study) {
            return res.status(404).json({ 
                success: false, 
                message: 'Study not found' 
            });
        }

        res.json({ 
            success: true, 
            message: '✅ Study deleted successfully!' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🤖 AI Chat endpoint (Gemini API)
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message is required' 
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are Hassan AI, a friendly and knowledgeable study assistant for students. 
                            Answer this question in a helpful, clear, and encouraging way: ${message}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        
        let reply = 'Sorry, I couldn\'t process that. Please try again.';
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
        }

        res.json({ 
            success: true, 
            message: reply 
        });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'AI service temporarily unavailable. Please try again later.' 
        });
    }
});

// ============================================================
// SERVE FRONTEND
// ============================================================
app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Study App ready!`);
});
