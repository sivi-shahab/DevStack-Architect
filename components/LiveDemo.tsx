import React, { useMemo } from 'react';
import { Play, Maximize2 } from 'lucide-react';

interface LiveDemoProps {
  html: string;
}

const LiveDemo: React.FC<LiveDemoProps> = ({ html }) => {
  
  // Inject safety script to prevent navigation and fix "refused to connect"
  const safeHtml = useMemo(() => {
    // Add base tag to force links to stay in iframe (or be caught by script)
    const baseTag = '<base target="_self" />';
    
    const safetyScript = `
      <script>
        // Override window.location to prevent programmatic navigation
        const originalLocation = window.location;
        
        // Prevent all clicks on links unless they are internal anchors
        window.addEventListener('click', (e) => {
          const target = e.target.closest('a');
          if (target) {
            const href = target.getAttribute('href');
            // Check if it's a hash link
            if (href && href.startsWith('#')) {
              // Allow hash links
              return;
            }
            if (href && href.startsWith('javascript:')) {
               return;
            }
            
            // Block everything else
            e.preventDefault();
            e.stopPropagation();
            
            // Optional: Visual Feedback
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.background = '#334155';
            toast.style.color = '#fff';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '12px';
            toast.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            toast.style.zIndex = '9999';
            toast.innerText = 'Navigation Blocked (Demo Mode)';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
          }
        }, true);

        // Prevent form submission everywhere
        window.addEventListener('submit', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Find the submit button and simulate loading
          const submitBtn = e.target.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) {
            const oldText = submitBtn.innerText || submitBtn.value;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing...';
            setTimeout(() => {
              submitBtn.innerText = '✅ Success (Demo)';
              submitBtn.disabled = false;
              setTimeout(() => {
                 submitBtn.innerText = oldText;
              }, 2000);
            }, 1000);
          }
        }, true);
      </script>
    `;
    
    let processedHtml = html;
    
    // Inject base tag in head
    if (processedHtml.includes('<head>')) {
        processedHtml = processedHtml.replace('<head>', `<head>${baseTag}`);
    } else {
        processedHtml = `${baseTag}${processedHtml}`;
    }

    // Inject script before </head> if possible, otherwise prepend
    if (processedHtml.includes('</head>')) {
        return processedHtml.replace('</head>', `${safetyScript}</head>`);
    }
    return safetyScript + processedHtml;
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