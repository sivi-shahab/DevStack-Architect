import React, { useMemo } from 'react';
import { Play, Maximize2 } from 'lucide-react';

interface LiveDemoProps {
  html: string;
}

const LiveDemo: React.FC<LiveDemoProps> = ({ html }) => {
  
  // Inject safety script to prevent navigation and fix "refused to connect"
  const safeHtml = useMemo(() => {
    const safetyScript = `
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          // Intercept all clicks to prevent navigation
          document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
              const href = link.getAttribute('href');
              // Allow anchor links that just jump to section or are javascript:void
              if (!href || href === '#' || href.startsWith('javascript:')) {
                return;
              }
              // Prevent actual navigation
              e.preventDefault();
              console.log('External navigation prevented for demo');
            }
          }, true);

          // Intercept form submissions to prevent reload
          document.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submission prevented for demo');
            
            // Mock success visual
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            if(btn) {
               const originalText = btn.innerText;
               const originalColor = btn.style.backgroundColor;
               
               btn.innerText = 'Processing...';
               btn.disabled = true;
               
               setTimeout(() => {
                 btn.innerText = '✅ Saved (Demo)';
                 btn.disabled = false;
                 
                 setTimeout(() => {
                    btn.innerText = originalText;
                 }, 2000);
               }, 800);
            }
          }, true);
        });
      </script>
    `;
    
    // Insert script before </head> if possible, otherwise prepend
    if (html.includes('</head>')) {
        return html.replace('</head>', `${safetyScript}</head>`);
    }
    return safetyScript + html;
  }, [html]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-200">
           <Play size={18} className="text-green-400" />
           <span className="font-semibold text-sm">Interactive Prototype</span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-500">
           <span>Running in sandboxed environment</span>
           <div className="flex space-x-1">
             <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
           </div>
        </div>
      </div>
      <div className="flex-1 bg-white relative">
        <iframe
          srcDoc={safeHtml}
          title="Live Demo"
          className="absolute inset-0 w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
        />
      </div>
    </div>
  );
};

export default LiveDemo;