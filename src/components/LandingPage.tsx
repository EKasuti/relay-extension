
import { useState } from 'react';
import relayLogo from '/logo.png';
import { Plus, Wand2, Puzzle, FileText, Calendar } from 'lucide-react';
import Footer from './Footer';

const PlatformCard = ({ platform }: { platform: any }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div className="relative flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            {platform.badge && (
                <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${platform.badge.includes('Coming')
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                    {platform.badge}
                </div>
            )}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${platform.iconBg}`}>
                {platform.img && !imgError ? (
                    <img
                        src={platform.img}
                        alt={platform.name}
                        className="w-10 h-10 object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    platform.icon && <platform.icon size={32} strokeWidth={2} className={platform.iconColor} />
                )}
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">{platform.name}</h3>
            <p className="text-slate-500 leading-relaxed max-w-sm">
                {platform.description}
            </p>
        </div>
    );
};

const LandingPage = () => {
    const supportedPlatforms = [
        {
            name: 'ConnectTeam',
            img: '/logos/connectteam.png',
            icon: FileText,
            description: <>For <strong>Baker-Berry Library</strong> students.</>,
            iconBg: 'bg-white shadow-sm border border-slate-100',
            iconColor: 'text-blue-600',
            badge: 'Available'
        },
        {
            name: 'WhenToWork',
            img: '/logos/whentowork.png',
            icon: Calendar,
            description: <>Optimized for <strong>DDS (Dartmouth Dining Services)</strong> schedules.</>,
            iconBg: 'bg-white shadow-sm border border-slate-100',
            iconColor: 'text-green-600',
            badge: 'Available'
        },
        {
            name: 'Random Schedule',
            icon: Wand2,
            description: 'For jobs where you don\'t clock in or out but need to randomize hours at the end of the pay period.',
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            badge: 'Coming in v1.2.0'
        },
        {
            name: 'Manual Entry',
            icon: Plus,
            description: 'Quickly add single shifts or make one-off adjustments to your schedule.',
            iconBg: 'bg-gray-50',
            iconColor: 'text-gray-600',
            badge: 'Available'
        }
    ];

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
                            Available v1.1.1
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
                                v1.1.1 Available on Chrome Web Store
                            </span>
                        </div>

                        {/* Supported Platforms Grid */}
                        <div className="mt-16 border-t border-slate-100 pt-12">
                            <p className="text-slate-400 text-sm font-bold mb-8 uppercase tracking-widest text-center">Supported Platforms</p>

                            <div className="grid md:grid-cols-2 gap-6">
                                {supportedPlatforms.map((platform) => (
                                    <PlatformCard key={platform.name} platform={platform} />
                                ))}
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
