export enum Subject {
  MATH = 'Toán Học',
  PHYSICS = 'Vật Lý',
  CHEMISTRY = 'Hóa Học'
}

export interface AiResponse {
  tab1_quick: string;
  tab2_detail: string;
  tab3_quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}
export enum Subject {
  MATH = 'Toán học',
  PHYSICS = 'Vật lí',
  CHEMISTRY = 'Hóa học',
  DIARY = 'Nhật ký'
}

export enum AgentType {
  SPEED = 'Giải 1s+Casio',
  SOCRATIC = 'Gia sư AI',
  PERPLEXITY = 'Luyện Skill',
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface AnalysisResult {
  content: string;
  mindMap: string;
  quiz?: QuizQuestion[];
}

export type InputMode = 'CAMERA' | 'GALLERY' | 'VOICE';
