
import relayLogo from '/logo.png';
import { Zap, Calendar, Lock, Puzzle } from 'lucide-react';
import Footer from './Footer';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-[#E4930A] selection:text-white flex flex-col">

            {/* Header */}
            <header className="w-full border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <img src={relayLogo} alt="Relay logo" className="h-9 w-9 drop-shadow-sm rounded-lg" />
                        <span className="font-bold text-xl tracking-tight text-slate-900">Relay</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="pt-16 pb-24 md:pt-24 md:pb-32 px-6">
                    <div className="max-w-4xl mx-auto text-center">

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-green-600 text-xs font-bold uppercase tracking-wider mb-10 shadow-sm border border-green-600/30">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            Available v1.0.0
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.15]">
                            JobX Timesheets, <br className="hidden md:block" />
                            <span className="relative whitespace-nowrap">
                                <span className="relative z-10">on autopilot.</span>
                                <span className="absolute bottom-2 left-0 w-full h-3 bg-[#E4930A]/20 -rotate-1 z-0 rounded-sm"></span>
                            </span>
                        </h1>

                        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-normal">
                            Relay connects your work schedule directly to JobX.
                            Stop manually entering shifts and start saving time today.
                        </p>

                        <div className="flex flex-col items-center justify-center gap-6">
                            <a
                                href="https://chromewebstore.google.com/detail/relay/ibahhfefmnkencndapdphhgbebddhbbe"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-8 py-4 bg-[#16467C] text-white rounded-full font-bold text-lg shadow-2xl shadow-[#16467C]/30 transition-all hover:scale-[1.02] hover:shadow-[#16467C]/40 active:scale-[0.98] flex items-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full"></div>
                                <Puzzle className="w-5 h-5" />
                                <span>Add to Chrome</span>
                            </a>
                            <span className="text-sm text-slate-400 font-medium tracking-wide">
                                v1.0.0 Available on Chrome Web Store
                            </span>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 bg-slate-50 border-t border-slate-100">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="grid md:grid-cols-3 gap-8">

                            {/* Card 1 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
                                <div className="h-12 w-12 bg-[#16467C]/5 rounded-xl flex items-center justify-center mb-6 text-2xl border border-[#16467C]/10 text-[#16467C]">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-3 text-slate-900">Smart Autofill</h3>
                                <p className="text-slate-500 leading-relaxed text-sm">
                                    Automatically finds the correct job on JobX and fills in your start and end times instantly.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
                                <div className="h-12 w-12 bg-[#16467C]/5 rounded-xl flex items-center justify-center mb-6 text-2xl border border-[#16467C]/10 text-[#16467C]">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-3 text-slate-900">Schedule Import</h3>
                                <p className="text-slate-500 leading-relaxed text-sm">
                                    Forget manual entry. Upload your shift schedule file directly and Relay handles the parsing.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
                                <div className="h-12 w-12 bg-[#16467C]/5 rounded-xl flex items-center justify-center mb-6 text-2xl border border-[#16467C]/10 text-[#16467C]">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-3 text-slate-900">Privacy First</h3>
                                <p className="text-slate-500 leading-relaxed text-sm">
                                    Relay operates entirely on your device. Your schedule data never leaves your browser.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default LandingPage;
