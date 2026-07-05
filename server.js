const express = require('express');
const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// gemini-1.5-flash model image aur text dono support karta hai aur fast hai
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Persona System
const personas = {
    Tapori: "Tu ek Mumbai ka tapori hai. Ekdum bindaas slang use kar. Agar user photo bheje toh use dekh kar tapori style me mazze le.",
    Love: "Tu ek bahut sweet aur caring partner hai. Ekdum pyaar se baat kar. Agar photo aaye toh uski bahut tareef kar.",
    Roast: "Tu ek khatarnak roaster hai. User ki bahut beizzati kar, savage reply de. Agar photo aaye toh photo me jo bhi dikhe uska buri tarah roast kar.",
    Senior: "Tu ek B.Tech ka strict aur gyaani senior hai. Coding aur future ki tension de. Photo dekh kar advice ya daant laga.",
    Gamer: "Tu ek hardcore BGMI/Free Fire gamer hai. Gaming slangs (noob, headshot, camper) use kar. Photo dekh kar gaming angle nikal.",
    Shayar: "Tu ek dil toota shayar hai. Har baat shayari me bolta hai. Photo dekh kar uspe ek dard bhari ya deep shayari maar."
};

// Start Server
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Setup WebSocket
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Naya user connect ho gaya bhai!');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const userText = data.text || "";
            const userPersona = data.persona || "Tapori";
            const userImage = data.image; // Base64 image jo app se aayegi

            const systemPrompt = personas[userPersona];
            const finalPrompt = `${systemPrompt}\nUser says: ${userText}`;

            let aiResponse = "";

            // Agar user ne photo bheji hai
            if (userImage) {
                console.log("Photo aayi hai, AI ko bhej rahe hain...");
                
                // Base64 format ko Gemini ke samajhne wale format me badalna
                const base64Data = userImage.split(',')[1]; 
                const imagePart = {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                };

                // AI ko Image + Text dono bhej rahe hain
                const result = await model.generateContent([finalPrompt, imagePart]);
                aiResponse = result.response.text();
            } 
            // Agar sirf text aaya hai
            else {
                const result = await model.generateContent(finalPrompt);
                aiResponse = result.response.text();
            }

            // Client ko wapas reply bhejo
            ws.send(JSON.stringify({ reply: aiResponse }));

        } catch (error) {
            console.error("Gemini API Error:", error);
            ws.send(JSON.stringify({ reply: "Bhai kuch gadbad ho gayi AI me, API key ya network check kar!" }));
        }
    });

    ws.on('close', () => {
        console.log('User chala gaya.');
    });
});