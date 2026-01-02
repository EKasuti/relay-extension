
const Footer = () => {
    return (
        <footer className="bg-white py-6 border-t border-slate-100 mt-auto">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Relay. All rights reserved.</p>
                <div className="flex gap-8 mt-4 md:mt-0 font-medium">
                    <a href="/privacy" className="hover:text-[#16467C] transition-colors">Privacy Policy</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
