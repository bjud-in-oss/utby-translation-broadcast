/**
 * AI-MALL FÖR SERVERSIDAN (Gemini API Integration via @google/genai)
 * 
 * Använd denna mall i din serverfil (t.ex. server.ts eller i en server-modul)
 * för att hålla GEMINI_API_KEY dold från webbläsaren.
 */

import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY saknas i miljövariablerna (.env).");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface StructuredAiResponse {
  summary: string;
  category: string;
  confidenceScore: number;
}

/**
 * Anropar Gemini med tvingande JSON-schema för garanterad strukturerad utdata.
 */
export async function runStructuredAnalysis(cleanPrompt: string): Promise<StructuredAiResponse> {
  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: cleanPrompt,
    config: {
      systemInstruction: "Du är en precis analytiker. Svara strikt i efterfrågat JSON-format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          category: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
        },
        required: ["summary", "category", "confidenceScore"],
      },
    },
  });

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText) as StructuredAiResponse;

  return {
    summary: parsed.summary || "Ingen sammanfattning genererades.",
    category: parsed.category || "Okänd",
    confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0,
  };
}
