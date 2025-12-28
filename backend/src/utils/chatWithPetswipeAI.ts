import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

type GeminiModelListResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

const GEMINI_MODELS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models";
const GEMINI_MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedGeminiModels: { models: string[]; fetchedAt: number } | null = null;

function isProGeminiModel(name: string) {
  return /(^|-)pro($|-)/.test(name);
}

async function fetchGeminiModels(apiKey: string) {
  const now = Date.now();
  if (
    cachedGeminiModels &&
    now - cachedGeminiModels.fetchedAt < GEMINI_MODELS_CACHE_TTL_MS
  ) {
    return cachedGeminiModels.models;
  }

  const response = await fetch(`${GEMINI_MODELS_ENDPOINT}?key=${apiKey}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Gemini models: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as GeminiModelListResponse;
  const models =
    data.models
      ?.filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => name.startsWith("models/gemini-"))
      .map((name) => name.replace(/^models\//, ""))
      .filter((name) => !name.includes("embedding"))
      .filter((name) => !isProGeminiModel(name)) ?? [];

  if (models.length === 0) {
    throw new Error("No eligible Gemini models returned from the API.");
  }

  cachedGeminiModels = { models, fetchedAt: now };
  return models;
}

export async function chatWithPetswipeAI(
  history: Array<{ role: string; parts: { text: string }[] }>,
  latestUserMessage: string,
  userContext = "",
) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is missing");
  const genAI = new GoogleGenerativeAI(apiKey);
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

  const modelsToTry = await fetchGeminiModels(apiKey);
  const errors: Error[] = [];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const chat = model.startChat({
        generationConfig: <GenerationConfig>{
          temperature: 0.9,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
        history,
      });

      const response = await chat.sendMessage(latestUserMessage);
      if (!response.response?.text) {
        throw new Error(`Gemini returned no text for model ${modelName}`);
      }

      return response.response.text();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  throw (
    errors[errors.length - 1] ??
    new Error("No Gemini models were available to try.")
  );
}
