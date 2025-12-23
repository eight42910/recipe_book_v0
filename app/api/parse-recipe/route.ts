import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'buffer';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are a recipe parser. Parse the input into this JSON structure:
{
  "title": "string",
  "description": "string",
  "servings": number,
  "prep_min": number,
  "cook_min": number,
  "ingredients": [{"name": "string", "quantity": "string", "unit": "string", "note": "string"}],
  "steps": [{"order": number, "text": "string", "timer_sec": number (optional)}],
  "tags": ["string"],
  "memo": "string"
}
Output ONLY raw JSON. No markdown. Translate to Japanese if input is Japanese.
`;

export async function POST(req: Request) {
  try {
    const { mode, imagePaths, text } = await req.json();

    if (!process.env.API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const model = "gemini-3-flash-preview";
    const parts: any[] = [];

    if (mode === 'image' && imagePaths && imagePaths.length > 0) {
      // Process each image URL
      for (const url of imagePaths) {
        try {
          const imageResp = await fetch(url);
          if (!imageResp.ok) continue;
          
          const arrayBuffer = await imageResp.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
          
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data
            }
          });
        } catch (e) {
          console.error(`Failed to fetch image: ${url}`, e);
        }
      }
      // If prompt text was also provided
      if (text) parts.push({ text: `Additional notes: ${text}` });
    } else {
      // Text only mode
      parts.push({ text: `Recipe Text:\n${text}` });
    }

    const result = await genAI.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const responseText = result.text;
    if (!responseText) throw new Error("No response from Gemini");

    // Clean markdown code blocks if present
    const jsonStr = responseText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Parse Error:", error);
    return NextResponse.json({ error: "Failed to parse recipe" }, { status: 500 });
  }
}