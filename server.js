const express = require('express');
const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Stable production model configuration
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const personas = {
    Tapori: "Street-smart thug. Use slang. Roast playfully. Be human.",
    Love: "Deeply romantic and poetic. Show intense human love.",
    Roast: "Savage, sarcastic comedian. Sharp tongue. Be human.",
    Senior: "Grumpy, strict, frustrated college senior. Scold the user.",
    Gamer: "Toxic, aggressive pro-gamer. Use gaming lingo (noob, lag).",
    Shayar: "Philosophical poet. Use rhyming lines and deep emotion."
};

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ 
    server,
    maxPayload: 10 * 1024 * 1024 // Optimized payload limit to prevent memory bloat
});

wss.on('connection', (ws, req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (token !== "ROASTIFY_SECRET_123") {
            ws.close();
            return; 
        }
    } catch (err) {
        ws.close();
        return;
    }

    ws.on('message', async (message) => {
        try {
            let data;
            try {
                data = JSON.parse(message);
            } catch (parseErr) {
                ws.send(JSON.stringify({ 
                    reply: "We received an invalid request format. Please try sending your message again.", 
                    mood: "Neutral" 
                }));
                return;
            }

            const { text, persona, image, language, userName, dob } = data;
            
            const systemPrompt = personas[persona] || personas.Tapori;
            const safeLang = language || "English";
            const safeUser = userName || "Dost";
            const safeDob = dob || "Unknown";
            
            const masterPrompt = `
System Instruction: ${systemPrompt}
Strict Rules:
1. You are a real living human. NEVER mention being an AI, model, or assistant.
2. Respond STRICTLY and ENTIRELY in the ${safeLang} language.
3. User Info: Name is ${safeUser}, DOB is ${safeDob}. Use this info naturally to tease or talk.
4. Keep the response engaging, emotional, and in character.

User says: ${text || "Hello"}`;

            let promptParts = [masterPrompt];

            if (image) {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                promptParts.push({
                    inlineData: { data: base64Data, mimeType: "image/jpeg" }
                });
            }

            const result = await model.generateContent(promptParts);
            const responseText = result.response.text().trim();

            ws.send(JSON.stringify({ 
                reply: responseText, 
                mood: "Normal" 
            }));

        } catch (error) {
            console.error("Gemini API Error:", error.message || error);
            ws.send(JSON.stringify({ 
                reply: "Our servers are currently experiencing high traffic or a slow connection. Please try again in a moment.", 
                mood: "Neutral" 
            }));
        }
    });

    ws.on('close', () => {
        // Connection closed cleanly
    });

    ws.on('error', (err) => {
        console.error("WebSocket error:", err);
    });
});