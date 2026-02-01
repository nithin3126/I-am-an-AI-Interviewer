
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title = "I am an AI Interviewer" }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full uppercase tracking-wider">Live System</span>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 px-6 py-4 text-center">
        <p className="text-sm text-gray-500 font-medium">Powered by Gemini 3.0 • Built for Performance & Accuracy</p>
      </footer>
    </div>
  );
};