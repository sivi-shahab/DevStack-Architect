import React, { useState, useEffect } from 'react';
import { UploadCloud, Code2, Zap, Layout, ChevronRight, CheckCircle2, FileCode2, Loader2 } from 'lucide-react';
import { ParsedFeature, TechStack, AnalysisStatus, CodeScaffold } from './types';
import FeatureCard from './components/FeatureCard';
import ChatInterface from './components/ChatInterface';
import CodePreview from './components/CodePreview';
import { analyzeRequirementsFast, createProjectChat, generateCodeScaffold } from './services/geminiService';
import { Chat } from '@google/genai';

// Simple parser for the format provided in the prompt
const parseContent = (text: string): ParsedFeature[] => {
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
          icon: iconMatch ? iconMatch[1] : 'file', // Convert snake_case to CamelCase icon name if needed in component
          content: body,
          raw: part
        });
      }
    }
  });

  return features;
};

const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java'];
const FRAMEWORKS = ['React', 'Vue', 'Next.js', 'NestJS', 'Django', 'FastAPI', 'Spring Boot'];

const App: React.FC = () => {
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
  const [techStack, setTechStack] = useState<TechStack>({ language: '', framework: '' });
  const [analysis, setAnalysis] = useState<string>('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [codeScaffold, setCodeScaffold] = useState<CodeScaffold | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseContent(text);
        setFeatures(parsed);
      };
      reader.readAsText(file);
    }
  };

  // Effect to trigger analysis when tech stack and features are ready
  useEffect(() => {
    const runAnalysis = async () => {
      if (features.length > 0 && techStack.language && techStack.framework) {
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
  }, [features, techStack]);

  const handleGenerateCode = async () => {
    if (status !== AnalysisStatus.COMPLETE && status !== AnalysisStatus.GENERATING_CODE) return;
    
    setStatus(AnalysisStatus.GENERATING_CODE);
    try {
      const scaffold = await generateCodeScaffold(features, techStack);
      setCodeScaffold(scaffold);
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
              Import requirements, select your stack, and build with AI.
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
                  type="file" 
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Layout className="text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">
                    Drop requirement file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports text formats with frontmatter
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Tech Stack Selector */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                <Code2 className="mr-2 text-green-500" /> Select Tech Stack
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Language</label>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Framework</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FRAMEWORKS.map(fw => (
                      <button
                        key={fw}
                        onClick={() => setTechStack(prev => ({ ...prev, framework: fw }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          techStack.framework === fw 
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
                        <p>Select a stack and import features to generate analysis.</p>
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
                       Generate Project Code
                     </button>
                   </div>
                )}
                 {status === AnalysisStatus.GENERATING_CODE && (
                   <div className="mt-4 flex items-center justify-end">
                      <div className="flex items-center text-blue-400 text-sm font-medium animate-pulse">
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Generating Boilerplate...
                      </div>
                   </div>
                )}
              </div>
            </div>

            {/* Code Preview or Chat Bot */}
            {codeScaffold ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-2 px-1">
                   <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                     <FileCode2 className="mr-2 text-purple-400" /> Project Scaffold
                   </h3>
                   <button 
                    onClick={() => setCodeScaffold(null)}
                    className="text-xs text-slate-500 hover:text-white underline"
                   >
                     Back to Chat
                   </button>
                </div>
                <CodePreview scaffold={codeScaffold} />
              </div>
            ) : (
              <div>
                <ChatInterface chatSession={chatSession} />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;