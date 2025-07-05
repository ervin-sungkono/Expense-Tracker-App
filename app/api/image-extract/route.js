import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req) {
    const { imageBase64, mimeType } = await req.json();

    try {
        const response = await ai.models.generateContent({
            model: "gemma-3-27b-it",
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType,
                                data: imageBase64,
                            },
                        },
                        { text: "Extract transaction details as JSON string: amount, date(format: YYYY-MM-DDTHH:MM), notes (max 120 chars). return null on property if unable to extract, don't return anything other than JSON" },
                    ]
                }
            ],
            config: {
                responseMimeType: 'text/plain'
            }
        });

        return NextResponse.json({ data: response?.candidates?.[0] }, { status: 200 });
    } catch(error) {
        console.log('ERROR', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
    
}