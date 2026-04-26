import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="border-t border-border bg-card/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">

                    {/* Left Column - Logo & Tagline */}
                    <div className="space-y-4">
                        <div
                            onClick={() => navigate("/landing")}
                            className="flex items-center gap-2 cursor-pointer w-fit"
                        >
                            <img
                                src="/logo.png"
                                alt="PrimeTalker Logo"
                                className="w-36 h-auto object-contain"
                            />
                        </div>
                        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                            Break language barriers in real-time. Connect with anyone, anywhere
                            with instant voice translation during calls.
                        </p>
                    </div>

                    {/* Right Column - Contact Info */}
                    <div className="space-y-4">
                        <h4 className="text-foreground font-semibold text-lg">Contact Us</h4>

                        <div className="space-y-3">
                            {/* Company & Address */}
                            <div className="flex items-start gap-3 group">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    <p className="font-medium text-foreground">Catalina Business Solutions Inc (CBS Inc)</p>
                                    <p>8888 Keystone Crossing, Suite 1373</p>
                                    <p>Indianapolis, IN 46240</p>
                                </div>
                            </div>

                            {/* Phone */}
                            <a
                                href="tel:+13175754181"
                                className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                            >
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <Phone className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                    +1-317-575-4181
                                </span>
                            </a>

                            {/* Email */}
                            <a
                                href="mailto:info@cbs-corp.com"
                                className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                            >
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                    info@cbs-corp.com
                                </span>
                            </a>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar - Copyright */}
                <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-border/50">
                    <p className="text-muted-foreground text-xs sm:text-sm text-center">
                        © 2025 PrimeTalker by Catalina Business Solutions Inc. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
