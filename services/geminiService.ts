import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { TechStack, ParsedFeature, CodeScaffold, ProjectFile } from "../types";

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
  const featureTitles = features.map(f => f.title).join(', ');
  
  const prompt = `
    You are a Principal Software Engineer at a top-tier tech company.
    Generate a **PRODUCTION-READY** codebase structure and a **LIVE DEMO PROTOTYPE**.
    
    The code must be SEPARATED into individual files to follow industry standards (Clean Architecture / SOLID).

    Tech Stack:
    - Language: ${stack.language}
    - Frontend: ${stack.frontendFramework}
    - Backend: ${stack.backendFramework}

    Requirements:
    ${featureContext}

    Instructions:
    1. Generate a list of critical files needed for this project.
    2. **Backend**: Include entry points, configuration, and at least one full feature module (Controller, Service, DTO).
       - Example path: \`backend/src/modules/auth/auth.controller.ts\`
    3. **Frontend**: Include entry points, routing setup, and key components.
       - Example path: \`frontend/src/components/Dashboard.tsx\`
    4. **Config**: Include package.json (or equivalent) for both.
    5. **README**: Generate a detailed README explaining how to run the project.
    6. **DEMO PROTOTYPE**: Generate a SINGLE self-contained \`index.html\` file.
       - Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
       - **LAYOUT**: Create a professional dashboard layout with a **Sidebar Navigation** that lists the key features: ${featureTitles}.
       - **INTERACTIVITY**: Clicking a sidebar item MUST switch the main content area to show a MOCK UI for that specific feature (use vanilla JS to hide/show sections, do not reload page).
       - **SAFETY**: Do NOT allow any page reloads or external links. All buttons and forms must use \`event.preventDefault()\` and show visual feedback (e.g., 'Simulation: Data Saved') instead of submitting.
       - **CONTENT**: For each feature, generate a realistic-looking UI form, table, or visualization relevant to the requirement.
       - It must be ready to run in a browser iframe (no build step).

    Return the response as a structured JSON object.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: SMART_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          files: {
            type: Type.ARRAY,
            description: "List of all project files.",
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "Full file path including folder (e.g., backend/src/main.ts)" },
                content: { type: Type.STRING, description: "The complete code content of the file" },
                language: { type: Type.STRING, description: "The language for syntax highlighting (e.g., typescript, python, json)" }
              },
              required: ["path", "content", "language"]
            }
          },
          readme: {
            type: Type.STRING,
            description: "Markdown string containing the README.md with run instructions.",
          },
          demoHtml: {
            type: Type.STRING,
            description: "A complete, self-contained HTML5 string with embedded CSS/JS that visually demonstrates the app.",
          },
        },
        required: ["files", "readme", "demoHtml"],
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
      files: [], 
      readme: "Error parsing generation result.",
      demoHtml: "<div style='padding:20px;color:red'>Error generating demo.</div>"
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