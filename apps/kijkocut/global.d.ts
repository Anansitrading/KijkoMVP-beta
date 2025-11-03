// Global type declarations for KijkoCut

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  selectApiKey: () => Promise<void>;
  openSelectKey: () => Promise<void>;
}

interface Window {
  aistudio?: AIStudio;
}

