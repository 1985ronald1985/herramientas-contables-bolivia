import React, { useState, useCallback, useMemo } from 'react';
import { AppView, UFVEntry } from './types';
import { UFV_DATA } from './constants';
import Instructions from './components/Instructions';
import UfvData from './components/UfvData';
import GeneralUpdater from './components/GeneralUpdater';
import Investments from './components/Investments';
import { InfoIcon, TableIcon, CalculatorIcon, BriefcaseIcon } from './constants';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<AppView>(AppView.INSTRUCTIONS);
    const [ufvData, setUfvData] = useState<UFVEntry[]>(UFV_DATA);

    const renderView = useCallback(() => {
        switch (activeView) {
            case AppView.INSTRUCTIONS:
                return <Instructions />;
            case AppView.UFV_DATA:
                return <UfvData ufvData={ufvData} setUfvData={setUfvData} />;
            case AppView.GENERAL_UPDATER:
                return <GeneralUpdater ufvData={ufvData} />;
            case AppView.INVESTMENTS:
                return <Investments ufvData={ufvData} />;
            default:
                return <Instructions />;
        }
    }, [activeView, ufvData]);

    const NavButton = ({ view, label, icon }: { view: AppView; label: string; icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center justify-center text-sm font-medium px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${activeView === view
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white backdrop-blur-sm border border-slate-700/50'
                }`}
        >
            <span className="mr-2">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    const navButtons = useMemo(() => [
        { view: AppView.INSTRUCTIONS, label: 'Instrucciones', icon: <InfoIcon /> },
        { view: AppView.UFV_DATA, label: 'Datos UFV', icon: <TableIcon /> },
        { view: AppView.GENERAL_UPDATER, label: 'Actualizador', icon: <CalculatorIcon /> },
        { view: AppView.INVESTMENTS, label: 'Inversiones', icon: <BriefcaseIcon /> },
    ], []);


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-10 text-center animate-fade-in-up">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight mb-3">
                        Herramienta profesional para el ajuste por inflación con UFV en Bolivia
                    </h1>

                </header>

                <nav className="mb-8 p-1.5 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800/60 sticky top-4 z-50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {navButtons.map(btn => <NavButton key={btn.view} {...btn} />)}
                    </div>
                </nav>

                <main className="bg-slate-900/40 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800/50 min-h-[60vh] transition-all duration-300">
                    {renderView()}
                </main>

                <footer className="text-center mt-12 pb-6 text-sm text-slate-500">
                    <p>&copy; Derechos Reservados 2026 - Creado por Ronald Mamani</p>
                </footer>
            </div>
        </div>
    );
};

export default App;