
import { Shield, Clock, Lock, Server } from 'lucide-react';
import relayLogo from '/logo.png';
import Footer from './Footer';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-[#E4930A] selection:text-white flex flex-col">

            {/* Minimal Header */}
            <header className="w-full border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <a href="/" className="group flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src={relayLogo} alt="Relay Logo" className="h-9 w-9 drop-shadow-sm rounded-lg" />
                            <span className="font-bold text-xl tracking-tight text-slate-900">Relay</span>
                        </a>
                    </div>
                </div>
            </header>

            <main className="flex-grow py-4 px-6">
                <article className="max-w-2xl mx-auto prose prose-slate prose-headings:font-bold prose-h1:text-3xl prose-p:text-slate-600 prose-a:text-[#16467C] prose-a:no-underline hover:prose-a:underline">

                    {/* Title Section */}
                    <div className="text-center mb-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#16467C]/5 text-[#16467C] mb-2">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h1>Privacy Policy</h1>
                        <p className="text-slate-500 text-lg">Last Updated: January 2, 2026</p>
                    </div>

                    {/* Content */}
                    <div className="bg-white  md:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">

                        <section>
                            <h2 className="flex items-center gap-3 text-xl">
                                <span className="p-2 rounded-lg bg-blue-50 text-[#16467C]"><Server className="w-5 h-5" /></span>
                                Data Collection
                            </h2>
                            <p className="font-medium text-lg text-slate-900 mb-2">
                                Relay does NOT collect, store, share, or transmit any of your personal data.
                            </p>
                            <ul className="space-y-3 list-none pl-0">
                                <li className="flex gap-3 text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2.5 shrink-0" />
                                    <span><strong>No Analytics:</strong> We don't track how you use the extension.</span>
                                </li>
                                <li className="flex gap-3 text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2.5 shrink-0" />
                                    <span><strong>No Accounts:</strong> You don't need an account to use Relay.</span>
                                </li>
                                <li className="flex gap-3 text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2.5 shrink-0" />
                                    <span><strong>Local Only:</strong> Relay operates entirely on your device. No data is sent to external servers.</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-xl">
                                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Clock className="w-5 h-5" /></span>
                                How It Works
                            </h2>
                            <p>
                                Relay only interacts with the Dartmouth JobX website
                                (<code className="bg-slate-50 px-1.5 py-0.5 rounded text-sm text-slate-700">dartmouth.studentemployment.ngwebsolutions.com</code>)
                                to help you autofill your timesheets.
                            </p>
                            <p className="mt-4">
                                This interaction happens directly between your browser and the JobX website. Relay acts as a simple automation tool and does not record any of the data it processes.
                            </p>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-xl mb-4">
                                <span className="p-2 rounded-lg bg-purple-50 text-purple-600"><Lock className="w-5 h-5" /></span>
                                Permissions Explained
                            </h2>
                            <p>We request the minimum permissions necessary:</p>
                            <div className="grid gap-4 mt-6">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="font-mono text-sm font-bold text-slate-900">storage</span>
                                    <p className="text-sm mt-1 mb-0">Used to save your preferences locally.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="font-mono text-sm font-bold text-slate-900">scripting</span>
                                    <p className="text-sm mt-1 mb-0">Allows the extension to fill in the form fields on the JobX page.</p>
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-slate-100 pt-8 mt-8">
                            <p className="text-sm text-slate-400 m-0">
                                Questions? Please contact the developer via the support tab on the Chrome Web Store.
                            </p>
                        </div>
                    </div>

                </article>
            </main>
            {/* Footer */}
            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
