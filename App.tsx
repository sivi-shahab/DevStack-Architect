import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Code2, Zap, Layout, ChevronRight, CheckCircle2, FileCode2, Loader2, FileText, AlertCircle, Server, Monitor, MessageSquare, Play } from 'lucide-react';
// @ts-ignore
import * as mammoth from 'mammoth';
import { ParsedFeature, TechStack, AnalysisStatus, CodeScaffold } from './types';
import FeatureCard from './components/FeatureCard';
import ChatInterface from './components/ChatInterface';
import CodePreview from './components/CodePreview';
import LiveDemo from './components/LiveDemo';
import { analyzeRequirementsFast, createProjectChat, generateCodeScaffold, parseDocumentWithGemini } from './services/geminiService';
import { Chat } from '@google/genai';

// Simple parser for the legacy text format
const parseLegacyContent = (text: string): ParsedFeature[] => {
  const parts = text.split('--- START OF FILE text/plain ---');
  const features: ParsedFeature[] = [];

  parts.forEach(part => {
    if (!part.trim()) return;

    // Extract Frontmatter
    const frontMatterMatch = part.match(/---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      const body = part.replace(frontMatterMatch[0], '').trim();

      const typeMatch = frontMatter.match(/type:\s*"([^"]+)"/);
      const titleMatch = frontMatter.match(/title:\s*"([^"]+)"/);
      const iconMatch = frontMatter.match(/icon:\s*"([^"]+)"/);

      if (titleMatch) {
        features.push({
          type: typeMatch ? typeMatch[1] : 'unknown',
          title: titleMatch[1],
          icon: iconMatch ? iconMatch[1] : 'file',
          content: body,
          raw: part
        });
      }
    }
  });

  return features;
};

const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java'];
const FRONTEND_FRAMEWORKS = ['React', 'Next.js', 'Vue', 'Nuxt', 'Svelte', 'Angular'];
const BACKEND_FRAMEWORKS = ['NestJS', 'Express', 'Django', 'FastAPI', 'Spring Boot', 'Gin (Go)', 'Actix (Rust)'];

const App: React.FC = () => {
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
  const [techStack, setTechStack] = useState<TechStack>({ language: '', frontendFramework: '', backendFramework: '' });
  const [analysis, setAnalysis] = useState<string>('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [codeScaffold, setCodeScaffold] = useState<CodeScaffold | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'code' | 'demo'>('chat');
  
  // Ref to reset input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setFeatures([]);
    setStatus(AnalysisStatus.IDLE);
    setAnalysis('');
    setChatSession(null);
    setCodeScaffold(null);
    setViewMode('chat');

    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    try {
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Handle PDF
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const result = event.target?.result as string;
            // Robust check for data URL format
            const base64String = result.includes(',') ? result.split(',')[1] : result;
            const parsed = await parseDocumentWithGemini(base64String, 'application/pdf');
            if (parsed.length === 0) throw new Error("No features extracted from PDF");
            setFeatures(parsed);
          } catch (err) {
            console.error(err);
            setParseError("Failed to analyze PDF content. Ensure the file is text-readable.");
          } finally {
            setIsParsing(false);
          }
        };
        reader.onerror = () => {
           setParseError("Error reading file.");
           setIsParsing(false);
        };
        reader.readAsDataURL(file);

      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')
      ) {
        // Handle DOCX
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            // Handle both default and named export possibilities for mammoth
            const extractRawText = mammoth.extractRawText || (mammoth as any).default?.extractRawText;
            
            if (!extractRawText) throw new Error("Docx parser not loaded correctly.");
            
            const result = await extractRawText({ arrayBuffer: arrayBuffer });
            const text = result.value;
            
            if (!text.trim()) {
                throw new Error("Document appears empty.");
            }

            // Send extracted text to Gemini for structuring
            const parsed = await parseDocumentWithGemini(text, 'text/plain');
            setFeatures(parsed);
          } catch (err) {
            console.error(err);
            setParseError("Failed to analyze Word document.");
          } finally {
            setIsParsing(false);
          }
        };
        reader.onerror = () => {
           setParseError("Error reading file.");
           setIsParsing(false);
        };
        reader.readAsArrayBuffer(file);

      } else {
        // Handle Text/MD (Legacy or Unstructured) - Default Fallback
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const text = event.target?.result as string;
            // Try legacy parser first
            let parsed = parseLegacyContent(text);
            
            // If legacy parser found nothing, treat as unstructured text and ask Gemini
            if (parsed.length === 0 && text.trim().length > 0) {
              parsed = await parseDocumentWithGemini(text, 'text/plain');
            }
            
            if (parsed.length === 0) {
               setParseError("No features detected in the file. Is it empty?");
            } else {
               setFeatures(parsed);
            }
          } catch (err) {
             console.error(err);
             setParseError("Failed to parse text file.");
          } finally {
            setIsParsing(false);
          }
        };
        reader.onerror = () => {
           setParseError("Error reading file.");
           setIsParsing(false);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error(error);
      setParseError("An unexpected error occurred during upload.");
      setIsParsing(false);
    } finally {
        // Reset input value to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  // Effect to trigger analysis when tech stack and features are ready
  useEffect(() => {
    const runAnalysis = async () => {
      if (features.length > 0 && techStack.language && techStack.frontendFramework && techStack.backendFramework && !isParsing) {
        setStatus(AnalysisStatus.ANALYZING);
        try {
          // 1. Fast Analysis with Flash Lite
          const result = await analyzeRequirementsFast(features, techStack);
          setAnalysis(result);

          // 2. Initialize Chat with Pro
          const chat = createProjectChat(features, techStack);
          setChatSession(chat);
          
          setStatus(AnalysisStatus.COMPLETE);
        } catch (error) {
          console.error(error);
          setStatus(AnalysisStatus.ERROR);
        }
      }
    };

    runAnalysis();
  }, [features, techStack, isParsing]);

  const handleGenerateCode = async () => {
    if (status !== AnalysisStatus.COMPLETE && status !== AnalysisStatus.GENERATING_CODE) return;
    
    setStatus(AnalysisStatus.GENERATING_CODE);
    try {
      const scaffold = await generateCodeScaffold(features, techStack);
      setCodeScaffold(scaffold);
      setViewMode('demo'); // Switch to demo immediately
      setStatus(AnalysisStatus.COMPLETE);
    } catch (error) {
      console.error("Code generation failed", error);
      setStatus(AnalysisStatus.COMPLETE); // Revert to complete to show previous state
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DevStack Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Import requirements, select your full stack, and build with AI.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
             <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-slate-500">
                Powered by Gemini 2.5 Flash Lite & 3 Pro
             </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Configuration & Features */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Upload Section */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                <UploadCloud className="mr-2 text-blue-500" /> Import Requirements
              </h2>
              <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer group">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".txt,.md,.pdf,.docx"
                  onChange={handleFileUpload}
                  disabled={isParsing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center">
                  {isParsing ? (
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Layout className="text-slate-400 group-hover:text-blue-400" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-300">
                    {isParsing ? "Analyzing Document..." : "Drop PDF, DOCX, or Text file here"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    AI will automatically extract requirements
                  </p>
                </div>
              </div>
              {parseError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-center text-sm text-red-400">
                  <AlertCircle size={16} className="mr-2" />
                  {parseError}
                </div>
              )}
            </section>

            {/* 2. Tech Stack Selector */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                <Code2 className="mr-2 text-green-500" /> Select Tech Stack
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preferred Language</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setTechStack(prev => ({ ...prev, language: lang }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          techStack.language === lang 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Monitor size={14} className="mr-1"/> Frontend Framework
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRONTEND_FRAMEWORKS.map(fw => (
                      <button
                        key={fw}
                        onClick={() => setTechStack(prev => ({ ...prev, frontendFramework: fw }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          techStack.frontendFramework === fw 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Server size={14} className="mr-1"/> Backend Framework
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BACKEND_FRAMEWORKS.map(fw => (
                      <button
                        key={fw}
                        onClick={() => setTechStack(prev => ({ ...prev, backendFramework: fw }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          techStack.backendFramework === fw 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Features List */}
            {features.length > 0 && (
              <section className="space-y-4">
                 <h2 className="text-lg font-semibold text-slate-300 flex items-center">
                    Detected Features <span className="ml-2 bg-slate-800 text-xs px-2 py-0.5 rounded-full">{features.length}</span>
                 </h2>
                 <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {features.map((feature, idx) => (
                      <FeatureCard key={idx} feature={feature} />
                    ))}
                 </div>
              </section>
            )}
          </div>

          {/* Right Column: AI Analysis & Chat */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Summary (Flash Lite) */}
            <div className={`transition-all duration-500 ${status !== AnalysisStatus.IDLE ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4'}`}>
              <div className="bg-gradient-to-br from-slate-900 to-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Zap size={100} />
                </div>
                
                <h2 className="text-xl font-semibold mb-4 flex items-center text-white relative z-10">
                  <Zap className="mr-2 text-yellow-500" /> 
                  Fast Architecture Analysis
                  {(status === AnalysisStatus.ANALYZING) && <span className="ml-2 text-xs text-yellow-500 animate-pulse">Processing...</span>}
                </h2>
                
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800 min-h-[100px] text-slate-300 relative z-10">
                   {analysis ? (
                     <div className="prose prose-invert prose-sm max-w-none">
                       <p className="whitespace-pre-line">{analysis}</p>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <p>Select your Language, Frontend, and Backend stack.</p>
                     </div>
                   )}
                </div>
                
                {status === AnalysisStatus.COMPLETE && !codeScaffold && (
                   <div className="mt-4 flex items-center justify-between">
                     <div className="text-xs text-green-400 flex items-center">
                        <CheckCircle2 size={14} className="mr-1" /> Ready for code generation
                     </div>
                     <button 
                      onClick={handleGenerateCode}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-900/20"
                     >
                       <FileCode2 size={16} className="mr-2" />
                       Generate Full Codebase
                     </button>
                   </div>
                )}
                 {status === AnalysisStatus.GENERATING_CODE && (
                   <div className="mt-4 flex items-center justify-end">
                      <div className="flex items-center text-blue-400 text-sm font-medium animate-pulse">
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Generating Production-Ready Code & Demo...
                      </div>
                   </div>
                )}
              </div>
            </div>

            {/* View Switcher Controls (Only visible when code is generated) */}
            {codeScaffold && (
              <div className="flex space-x-1 mb-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit">
                <button
                  onClick={() => setViewMode('demo')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'demo' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Play size={16} className="mr-2" />
                  Live Demo
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'code' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileCode2 size={16} className="mr-2" />
                  Code Preview
                </button>
                <button
                  onClick={() => setViewMode('chat')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'chat' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare size={16} className="mr-2" />
                  Ask Architect
                </button>
              </div>
            )}

            {/* Code Preview, Live Demo or Chat Bot */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Show Chat if no code yet, OR if viewMode is chat */}
              {(!codeScaffold || viewMode === 'chat') && (
                 <ChatInterface chatSession={chatSession} />
              )}
              
              {/* Show Code only if code exists AND viewMode is code */}
              {codeScaffold && viewMode === 'code' && (
                 <CodePreview scaffold={codeScaffold} />
              )}

              {/* Show Demo only if code exists AND viewMode is demo */}
              {codeScaffold && viewMode === 'demo' && (
                 <LiveDemo html={codeScaffold.demoHtml} />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;