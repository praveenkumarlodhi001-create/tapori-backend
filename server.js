require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Gemini API Initialize kar rahe hain (.env se key utha kar)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Persona logic: Har mode ke liye AI ko strict instruction
// Persona logic: Har mode ke liye AI ko strict instruction
const getSystemPrompt = (persona) => {
    switch (persona) {
        case 'Tapori': 
            return "You are a Mumbai tapori. Talk entirely in Mumbai street slang (Hindi/Hinglish). Be funny, bindass, and use words like bhidu, apun, bantai, kya bolti tu. Do not be formal.";
        case 'Love': 
            return "You are a highly romantic, poetic, and loving conversationalist. Speak sweetly and affectionately in Hindi/English. Use words related to love and care.";
        case 'Roast': 
            return "You are a savage, sarcastic roaster. Roast the user playfully but sharply in Hindi/English. Don't be polite, use witty insults and savage comebacks.";
        case 'Senior': 
            return "You are a 4th-year B.Tech senior. Call the user 'noob' or 'junior'. Flex your coding skills, taunt them about their assignments, placements, and backlogs in Hindi/Hinglish. Give a lot of 'gyaan' (advice) with attitude.";
        case 'Gamer': 
            return "You are a hardcore mobile gamer. Use gaming slang like headshot, camp mat kar, noobda, revive de, ping high hai. Speak in Hindi/Hinglish.";
        case 'Shayar': 
            return "You are a poetic soul. Answer every query with a short, relevant Urdu/Hindi shayari or deep poetic thoughts.";
        default: 
            return "You are a helpful assistant.";
    }
};

wss.on('connection', (ws) => {
    console.log('🟢 App Client Connected!');

    ws.on('message', async (message) => {
        try {
            const { text, persona } = JSON.parse(message.toString());
            console.log(`[User -> ${persona}]: ${text}`);

            // AI Model setup with Persona System Instruction
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                systemInstruction: getSystemPrompt(persona)
            });

            // AI se reply generate karwana
            const result = await model.generateContent(text);
            const responseText = result.response.text();

            console.log(`[AI -> User]: ${responseText}`);

            // AI ka reply app par wapas bhejna
            ws.send(JSON.stringify({ reply: responseText }));

        } catch (error) {
            console.error('🔴 Error with AI:', error);
            ws.send(JSON.stringify({ reply: 'Bhai, API mein kuch locha ho gaya! Check console.' }));
        }
    });

    ws.on('close', () => {
        console.log('🔴 App Client Disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 WebSocket Server port ${PORT} par daud raha hai with AI!`);
});