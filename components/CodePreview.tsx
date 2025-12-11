import React, { useState } from 'react';
import { Server, Monitor, Copy, Check, BookOpen } from 'lucide-react';
import { CodeScaffold } from '../types';

interface CodePreviewProps {
  scaffold: CodeScaffold;
}

const CodePreview: React.FC<CodePreviewProps> = ({ scaffold }) => {
  const [activeTab, setActiveTab] = useState<'backend' | 'frontend' | 'readme'>('backend');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let text = '';
    if (activeTab === 'backend') text = scaffold.backend;
    else if (activeTab === 'frontend') text = scaffold.frontend;
    else text = scaffold.readme;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Header Tabs */}
      <div className="flex items-center justify-between bg-slate-800 border-b border-slate-700 px-2 pt-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('backend')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'backend'
                ? 'bg-slate-900 text-blue-400 border-x border-t border-slate-700 relative top-[1px]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Server size={16} />
            <span>Backend</span>
          </button>
          <button
            onClick={() => setActiveTab('frontend')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'frontend'
                ? 'bg-slate-900 text-purple-400 border-x border-t border-slate-700 relative top-[1px]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Monitor size={16} />
            <span>Frontend</span>
          </button>
          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'readme'
                ? 'bg-slate-900 text-yellow-400 border-x border-t border-slate-700 relative top-[1px]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <BookOpen size={16} />
            <span>README.md</span>
          </button>
        </div>
        <div className="pr-2 pb-2">
          <button
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
            title="Copy Code"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto bg-[#0d1117] p-6">
        <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
          {activeTab === 'backend' && scaffold.backend}
          {activeTab === 'frontend' && scaffold.frontend}
          {activeTab === 'readme' && scaffold.readme}
        </pre>
      </div>
    </div>
  );
};

export default CodePreview;