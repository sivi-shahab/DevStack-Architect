import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FileCode, 
  FileJson, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Terminal,
  Play
} from 'lucide-react';
import { CodeScaffold, ProjectFile } from '../types';

interface CodePreviewProps {
  scaffold: CodeScaffold;
}

const FileIcon: React.FC<{ filename: string }> = ({ filename }) => {
  if (filename.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FileCode size={14} className="text-blue-400" />;
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <FileCode size={14} className="text-yellow-300" />;
  if (filename.endsWith('.py')) return <FileCode size={14} className="text-blue-300" />;
  if (filename.endsWith('.md')) return <FileText size={14} className="text-slate-400" />;
  return <FileText size={14} className="text-slate-500" />;
};

const CodePreview: React.FC<CodePreviewProps> = ({ scaffold }) => {
  // Flatten scaffold to a list, including the README as a file
  const allFiles = useMemo(() => {
    const files = [...scaffold.files];
    // Add README if not already there
    if (!files.find(f => f.path.toLowerCase() === 'readme.md')) {
      files.unshift({
        path: 'README.md',
        content: scaffold.readme,
        language: 'markdown'
      });
    }
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }, [scaffold]);

  const [selectedFile, setSelectedFile] = useState<ProjectFile>(allFiles[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group files by root directory (e.g., frontend/, backend/)
  const fileTree = useMemo(() => {
    const tree: Record<string, ProjectFile[]> = {};
    allFiles.forEach(file => {
      const root = file.path.split('/')[0];
      if (!tree[root]) tree[root] = [];
      tree[root].push(file);
    });
    return tree;
  }, [allFiles]);

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex h-[700px] flex-col md:flex-row">
      
      {/* Sidebar - File Explorer */}
      <div className="w-full md:w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Explorer</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {(Object.entries(fileTree) as [string, ProjectFile[]][]).map(([folder, files]) => (
            <div key={folder}>
              <div className="flex items-center text-slate-300 text-sm font-semibold mb-1 px-2">
                 {files.length > 1 ? <Folder size={14} className="mr-2 text-blue-400" /> : <FileText size={14} className="mr-2" />}
                 {folder}
              </div>
              <div className="pl-4 space-y-1">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`flex items-center w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                      selectedFile.path === file.path
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <div className="mr-2">
                      <FileIcon filename={file.path} />
                    </div>
                    <span className="truncate">
                      {file.path.split('/').pop()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Code Editor View */}
      <div className="flex-1 flex flex-col bg-[#0d1117] min-w-0">
        
        {/* Editor Tabs/Header */}
        <div className="flex items-center justify-between bg-[#0f172a] border-b border-slate-700 px-4 py-2">
          <div className="flex items-center text-sm text-slate-300">
             <FileIcon filename={selectedFile.path} />
             <span className="ml-2 font-mono">{selectedFile.path}</span>
          </div>
          <div className="flex items-center space-x-2">
             <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Copy Content"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
           <pre className="text-sm font-mono leading-relaxed">
             <code className="block whitespace-pre">
               {selectedFile.content}
             </code>
           </pre>
        </div>

        {/* Status Bar / Simulated Terminal */}
        <div className="bg-[#1e293b] border-t border-slate-700 p-2 text-xs flex items-center justify-between text-slate-500">
          <div className="flex items-center">
            <Terminal size={12} className="mr-2" />
            <span>Generated by Gemini 3 Pro</span>
          </div>
          <div className="flex items-center space-x-4">
             <span>{selectedFile.language}</span>
             <span className="flex items-center text-green-500">
               <Check size={10} className="mr-1" /> Ready
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePreview;