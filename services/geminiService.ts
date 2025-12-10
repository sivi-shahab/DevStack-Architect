import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { TechStack, ParsedFeature, CodeScaffold } from "../types";

// Initialize Gemini Client
// IMPORTANT: Accessing process.env.API_KEY directly as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models configuration
const FAST_MODEL = 'gemini-flash-lite-latest'; 
const SMART_MODEL = 'gemini-3-pro-preview';

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
      - Language: ${stack.language}
      - Framework: ${stack.framework}
      
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
    Generate the core boilerplate code and folder structure for a project with the following constraints.

    Tech Stack:
    - Language: ${stack.language}
    - Framework: ${stack.framework}

    Requirements:
    ${featureContext}

    Instructions:
    1. Create a high-quality, scalable folder structure.
    2. Provide the main entry point code (e.g., App.tsx, server.js/main.go).
    3. Provide one example of a core logic file based on the requirements (e.g., a Controller, Service, or Component).
    4. Ensure the code follows industry best practices (Clean Code, SOLID, etc.).
    5. Return the result as Markdown code blocks.
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
            description: "Markdown string containing the backend file structure and core code.",
          },
          frontend: {
            type: Type.STRING,
            description: "Markdown string containing the frontend file structure and core components.",
          },
        },
        required: ["backend", "frontend"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No code generated");
  
  try {
    return JSON.parse(text) as CodeScaffold;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    // Fallback if model returns raw text for some reason
    return { backend: "Error parsing backend code.", frontend: "Error parsing frontend code." };
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
    The user is building an app with the following Tech Stack:
    - Language: ${stack.language}
    - Framework: ${stack.framework}
    
    The user has imported the following feature requirements:
    ${featureContext}
    
    Your goal is to answer technical questions, provide code snippets, and help architecture the solution based strictly on these constraints.
    Be helpful, concise, and accurate.
  `;

  return ai.chats.create({
    model: SMART_MODEL,
    config: {
      systemInstruction: systemInstruction,
    },
  });
};
