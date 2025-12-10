export interface ParsedFeature {
  type: string;
  title: string;
  icon: string;
  content: string;
  raw: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface TechStack {
  language: string;
  framework: string;
}

export interface CodeScaffold {
  backend: string;
  frontend: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_CODE = 'GENERATING_CODE',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
