import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export class NoLlmError extends Error {
  constructor() {
    super("Aucune clé LLM configurée — chemin déterministe.");
    this.name = "NoLlmError";
  }
}

export function hasLlm(): boolean {
  return Boolean(GROQ_KEY || GEMINI_KEY);
}

function asText(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

export async function chat(system: string, user: string): Promise<string> {
  if (GROQ_KEY) {
    try {
      const model = new ChatGroq({
        apiKey: GROQ_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        maxRetries: 1,
      });
      const res = await model.invoke([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      return asText(res.content);
    } catch (err) {
      if (!GEMINI_KEY) throw err;
    }
  }
  if (GEMINI_KEY) {
    const model = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_KEY,
      model: "gemini-2.0-flash",
      temperature: 0,
    });
    const res = await model.invoke([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return asText(res.content);
  }
  throw new NoLlmError();
}