import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { TechStack, ParsedFeature, CodeScaffold } from "../types";

// Initialize Gemini Client
// IMPORTANT: Accessing process.env.API_KEY directly as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models configuration
const FAST_MODEL = 'gemini-flash-lite-latest'; 
const SMART_MODEL = 'gemini-3-pro-preview';

/**
 * Parses unstructured text or binary data (PDF) into structured features using Gemini.
 */
export const parseDocumentWithGemini = async (
  fileData: string, 
  mimeType: string
): Promise<ParsedFeature[]> => {
  const prompt = `
    Analyze the provided document content.
    Extract key functional requirements and architectural features.
    
    Return a list of features. For each feature, provide:
    - type: The category (e.g., 'Core', 'Security', 'UI', 'Database', 'API')
    - title: A short concise title (e.g., 'User Authentication')
    - icon: A valid Lucide React icon name (PascalCase, e.g., 'ShieldCheck', 'Database', 'User', 'Globe')
    - content: A detailed description of the requirement.
    
    If the content is empty or unreadable, return an empty list.
  `;

  // Prepare contents based on mimeType
  let contents;
  if (mimeType === 'application/pdf') {
    contents = {
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: fileData } }
      ]
    };
  } else {
    // Text based (including extracted text from DOCX)
    contents = {
        role: 'user',
        parts: [{ text: `${prompt}\n\nDocument Content:\n${fileData}` }]
    };
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: FAST_MODEL, // Flash Lite is good for extraction
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              icon: { type: Type.STRING },
              content: { type: Type.STRING },
              raw: { type: Type.STRING, description: "Leave empty or original text snippet" }
            },
            required: ["type", "title", "icon", "content"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedFeature[];
    }
    return [];
  } catch (error) {
    console.error("Gemini parsing failed:", error);
    throw new Error("Failed to parse document with AI.");
  }
};

/**
 * Analyzes the requirements using the Fast Lite model to generate a tech summary.
 */
export const analyzeRequirementsFast = async (
  features: ParsedFeature[],
  stack: TechStack
): Promise<string> => {
  try {
    const featureSummaries = features.map(f => `- ${f.title}: ${f.content}`).join('\n');
    
    const prompt = `
      You are a senior software architect.
      Analyze the following project requirements and the selected tech stack.
      
      Selected Tech Stack:
      - Preferred Language: ${stack.language}
      - Frontend Framework: ${stack.frontendFramework}
      - Backend Framework: ${stack.backendFramework}
      
      Requirements:
      ${featureSummaries}
      
      Provide a concise, high-level technical implementation strategy (max 200 words). 
      Focus on how the selected stack fits these specific features.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error("Failed to analyze requirements.");
  }
};

/**
 * Generates industry-standard boilerplate code for Backend and Frontend.
 */
export const generateCodeScaffold = async (
  features: ParsedFeature[],
  stack: TechStack
): Promise<CodeScaffold> => {
  const featureContext = features.map(f => `- ${f.title}: ${f.content}`).join('\n');
  
  const prompt = `
    You are a Principal Software Engineer at a top-tier tech company.
    Generate a **PRODUCTION-READY** codebase for a project with the following constraints.

    Tech Stack:
    - Language Preference: ${stack.language}
    - Frontend Framework: ${stack.frontendFramework}
    - Backend Framework: ${stack.backendFramework}

    Requirements:
    ${featureContext}

    Instructions:
    1. **Backend**: Generate the complete folder structure and KEY files.
       - MUST include 'package.json' (or requirements.txt/go.mod) with all necessary dependencies.
       - MUST include the main entry file (e.g., main.ts, server.js, app.py).
       - MUST include at least one Feature Module (Controller + Service + DTO/Entity) implementing a key requirement from the list.
    
    2. **Frontend**: Generate the complete folder structure and KEY files.
       - MUST include 'package.json' with dependencies.
       - MUST include 'App.tsx' (or equivalent).
       - MUST include API integration code (fetching data from the backend).
    
    3. **README.md**: Generate a comprehensive README.md.
       - Step-by-step instructions on how to install dependencies and RUN both backend and frontend.
       - List of env variables needed.
    
    4. **Formatting**: Use Markdown code blocks for every file. Precede code blocks with the file path (e.g., '## backend/src/app.module.ts').

    Return the result strictly as a JSON object with 'backend', 'frontend', and 'readme' strings containing the Markdown.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: SMART_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          backend: {
            type: Type.STRING,
            description: "Markdown string containing the backend file structure and COMPLETE source code for key files.",
          },
          frontend: {
            type: Type.STRING,
            description: "Markdown string containing the frontend file structure and COMPLETE source code for components.",
          },
          readme: {
            type: Type.STRING,
            description: "Markdown string containing the README.md with run instructions.",
          },
        },
        required: ["backend", "frontend", "readme"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No code generated");
  
  try {
    return JSON.parse(text) as CodeScaffold;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return { 
      backend: "Error parsing backend code.", 
      frontend: "Error parsing frontend code.",
      readme: "Error parsing readme."
    };
  }
};

/**
 * Creates a chat session context based on requirements.
 */
export const createProjectChat = (
  features: ParsedFeature[], 
  stack: TechStack
): Chat => {
  const featureContext = features.map(f => `Feature "${f.title}": ${f.content}`).join('\n\n');
  
  const systemInstruction = `
    You are an expert AI Developer Assistant helping a user build a specific application.
    
    Context:
    The user is building an app with:
    - Frontend: ${stack.frontendFramework}
    - Backend: ${stack.backendFramework}
    - Language: ${stack.language}
    
    Requirements:
    ${featureContext}
    
    Your goal is to answer technical questions, provide code snippets, and help architecture the solution.
    
    If the user has generated code and asks for changes:
    1. Explain how to modify the code to achieve their goal.
    2. Provide exact code snippets they can copy to update their project.
    3. Be specific about which files need to change.
  `;

  return ai.chats.create({
    model: SMART_MODEL,
    config: {
      systemInstruction: systemInstruction,
    },
  });
};