import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

export async function POST(req) {


    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Explain how AI works in a few words",
        config: {
            thinkingConfig: {
                thinkingBudget: 0, // Disables thinking
            },
        }
    });
    console.log(response.text);
}