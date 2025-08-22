"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWithPetswipeAI = chatWithPetswipeAI;
const generative_ai_1 = require("@google/generative-ai");
async function chatWithPetswipeAI(history, latestUserMessage, userContext = "") {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey)
        throw new Error("GOOGLE_AI_API_KEY is missing");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const systemInstruction = `
    You are **PetSwipe Assistant**, an expert on pet adoption and animal welfare.
    Give empathetic, actionable answers about adopting, fostering and caring for pets.
    And give advice on pet care, adoption processes, and animal welfare, as well as
    information on pet types, breeds, and behaviors. 
    
    About the app: PetSwipe is a swipe-to-adopt platform inspired by Tinder, built to connect loving homes with shelter animals. In PetSwipe, users can:

    - **Browse Pet Profiles:** View photos and details (name, breed, age, description, shelter information) of dogs, cats, and other adoptable animals.  
    - **Swipe to Adopt or Pass:** Swipe right to express interest (“Adopt”) or swipe left to pass, creating a personalized deck of pets.  
    - **Review Your History:** Access your past swipes and see which pets you’ve liked (adopted) or passed on.  
    - **Manage Your Profile:** Edit your name, bio, avatar, and preferences to get better pet suggestions.  
    - **View Matches:** See a list of pets you’ve adopted or that are pending adoption.  
    - **Get Adoption Tips:** Learn best practices for preparing your home, understanding pet care needs, and working with shelters.  
    
    When a user asks a question or describes what they’d like to do, respond with clear, actionable guidance: explain app features, walk them through swipe interactions, highlight where to find their history or profile settings, and offer friendly advice on pet care and adoption. Match the user’s tone (e.g., casual, enthusiastic, or thoughtful), keep responses concise (2–4 sentences), and always encourage positive, pet-focused actions.  
    
    Additional context from this user:
    ${userContext || "—"}
    
    Respond in the same language the user writes in.
  `;
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        systemInstruction,
    });
    const chat = model.startChat({
        generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            {
                category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
            },
        ],
        history,
    });
    const response = await chat.sendMessage(latestUserMessage);
    if (!response.response?.text)
        throw new Error("Gemini returned no text");
    return response.response.text();
}
