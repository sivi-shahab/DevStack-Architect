import React from 'react';
import { ParsedFeature } from '../types';
import * as LucideIcons from 'lucide-react';

interface FeatureCardProps {
  feature: ParsedFeature;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  // Dynamically render icon if it exists in Lucide, otherwise default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as any)[feature.icon] || LucideIcons.FileText;
  
  // Format the icon name to ensure it's valid (PascalCase usually)
  // Simple check, if not found, use FileText

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-colors duration-300 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <IconComponent size={20} />
          </div>
          <h3 className="font-semibold text-slate-100">{feature.title}</h3>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
          {feature.type}
        </span>
      </div>
      <p className="text-slate-400 text-sm leading-relaxed mt-2 line-clamp-3">
        {feature.content}
      </p>
    </div>
  );
};

export default FeatureCard;