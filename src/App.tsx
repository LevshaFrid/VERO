import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { AIChat } from "./components/AIChat";
import { CoworkSpace } from "./components/CoworkSpace";

export default function App() {
  const [view, setView] = useState<'dashboard' | 'cowork'>('dashboard');
  const [coworkGoal, setCoworkGoal] = useState('');

  const handleStartCowork = (goal: string) => {
    setCoworkGoal(goal);
    setView('cowork');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {view === 'dashboard' && (
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              SaaS Performance Overview
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              2024 Financial Results & Forecast
            </p>
          </header>
        )}

        {view === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Dashboard />
            </div>
            <div className="lg:col-span-1 h-[600px] lg:h-auto">
              <AIChat onStartCowork={handleStartCowork} />
            </div>
          </div>
        ) : (
          <CoworkSpace goal={coworkGoal} onClose={() => setView('dashboard')} />
        )}
      </div>
    </div>
  );
}
