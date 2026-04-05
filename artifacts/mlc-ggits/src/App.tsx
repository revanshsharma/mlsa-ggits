import React, { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Terminal, Users, Calendar, Trophy, Code2, ArrowRight, Linkedin, Twitter, ExternalLink, Activity } from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// MATRIX EFFECT COMPONENT
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00FF41"; // Neon Green
      ctx.font = `${fontSize}px "JetBrains Mono"`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-bg opacity-30 pointer-events-none fixed inset-0 z-0" />;
};

// TYPING TEXT COMPONENT
const TypewriterText = () => {
  const messages = [
    "> building the future",
    "> learning together",
    "> hack the knowledge",
    "> init mlc_ggits.sh"
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayedText === currentMessage) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    } else {
      const nextDelay = isDeleting ? 30 : 70;
      timeout = setTimeout(() => {
        setDisplayedText((prev) => {
          if (isDeleting) {
            return prev.slice(0, -1);
          } else {
            return currentMessage.slice(0, prev.length + 1);
          }
        });
      }, nextDelay);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentMessageIndex, messages]);

  return (
    <div className="font-mono text-xl md:text-3xl text-[#00FF41] mt-6 flex items-center justify-center">
      <span>{displayedText}</span>
      <span className="cursor-blink ml-1 w-3 h-8 bg-[#00FF41] inline-block"></span>
    </div>
  );
};

// ANIMATED COUNTER
const Counter = ({ end, label, icon: Icon }: { end: number, label: string, icon: any }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView) {
      let startTime: number;
      const duration = 2000;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);
        
        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - percentage, 3);
        setCount(Math.floor(easeOut * end));
        
        if (progress < duration) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [inView, end]);

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center p-6 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm"
    >
      <div className="p-4 rounded-full bg-[#0078D4]/10 mb-4">
        <Icon className="w-8 h-8 text-[#0078D4]" />
      </div>
      <div className="text-4xl md:text-5xl font-mono font-bold text-white mb-2 tracking-tighter">
        {count}
        <span className="text-[#00FF41]">+</span>
      </div>
      <div className="text-gray-400 font-medium tracking-wide uppercase text-sm">{label}</div>
    </motion.div>
  );
};

function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-[#0078D4] selection:text-white relative overflow-hidden">
      <MatrixRain />
      <div className="scanline"></div>

      {/* Navigation / Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Microsoft Learn Logo */}
            <div className="flex gap-1 shrink-0">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-3 h-3 bg-[#F35325]"></div>
                <div className="w-3 h-3 bg-[#81BC06]"></div>
                <div className="w-3 h-3 bg-[#05A6F0]"></div>
                <div className="w-3 h-3 bg-[#FFBA08]"></div>
              </div>
            </div>
            <span className="font-semibold text-lg hidden sm:block">Microsoft Learn</span>
            <span className="text-gray-500 hidden sm:block">|</span>
            <span className="font-mono font-bold text-[#00D4FF] tracking-tight">GGITS</span>
          </div>
          <nav className="flex gap-6 font-mono text-sm">
            <a href="#events" className="text-gray-300 hover:text-white transition-colors">/events</a>
            <a href="#about" className="text-gray-300 hover:text-white transition-colors">/about</a>
            <a href="#join" className="text-[#00FF41] hover:text-[#00FF41]/80 transition-colors">/join</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24">
        
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            {/* Big MS Logo */}
            <div className="flex justify-center mb-8">
              <div className="grid grid-cols-2 gap-2 transform rotate-45 group hover:rotate-0 transition-all duration-700 ease-in-out">
                <div className="w-12 h-12 bg-[#F35325] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#81BC06] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#05A6F0] rounded-sm group-hover:scale-110 transition-transform"></div>
                <div className="w-12 h-12 bg-[#FFBA08] rounded-sm group-hover:scale-110 transition-transform"></div>
              </div>
            </div>

            <div className="inline-block px-4 py-1.5 rounded-full border border-[#0078D4]/30 bg-[#0078D4]/10 text-[#00D4FF] font-mono text-sm mb-6 backdrop-blur-md">
              STATUS: ONLINE & READY
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4">
              Microsoft Learn <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0078D4] via-[#00D4FF] to-[#00FF41]">
                Community
              </span>
            </h1>
            
            <h2 className="text-2xl md:text-3xl font-mono text-gray-400 mb-12">
              GGITS <span className="text-gray-600">_</span> Jabalpur
            </h2>

            <div className="h-16 mb-12">
              <TypewriterText />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="#events" 
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-[#0078D4] text-white font-semibold rounded-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform ease-out"></div>
                <span className="relative z-10 flex items-center gap-2 font-mono">
                  [ EXECUTE ] <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>
              <a 
                href="#about" 
                className="group px-8 py-4 bg-transparent border border-white/20 hover:border-white/50 text-white font-mono transition-colors"
              >
                VIEW_DOCS.md
              </a>
            </div>
          </motion.div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-500">
            <Code2 className="w-6 h-6 rotate-90" />
          </div>
        </section>

        {/* Events Section */}
        <section id="events" className="py-24 px-6 bg-black/40 border-y border-white/5 relative">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#0078D4]"></div>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                <Activity className="text-[#00FF41]" />
                ACTIVE_TASKS
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#0078D4]"></div>
            </div>

            {/* Featured Event: Copilot Dev Days */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="animated-border-box p-[1px] mb-12"
            >
              <div className="bg-[#0d0d12] p-8 md:p-12 rounded-lg relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-white/5">
                {/* Copilot background glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6E40C9] rounded-full blur-[150px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="flex-1 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6E40C9]/20 border border-[#6E40C9]/30 text-[#00D4FF] text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
                    FEATURED EVENT
                  </div>
                  <h3 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">GitHub Copilot <br/><span className="text-[#6E40C9]">Dev Days</span></h3>
                  <p className="text-gray-400 text-lg mb-8 max-w-xl leading-relaxed">
                    An exclusive hands-on event to explore AI-powered development with GitHub Copilot. Level up your coding game with Microsoft's AI pair programmer.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 font-mono text-sm mb-8 text-gray-300">
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded border border-white/5">
                      <Calendar className="w-4 h-4 text-[#0078D4]" /> 11 April
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded border border-white/5">
                      <Users className="w-4 h-4 text-[#0078D4]" /> Limited Seats
                    </div>
                  </div>

                  <a 
                    href="https://luma.com/dwdrrbzt" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#6E40C9] hover:bg-[#5a34a6] text-white font-mono transition-colors shadow-[0_0_20px_rgba(110,64,201,0.4)]"
                  >
                    REGISTER_NOW <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="w-full md:w-1/3 flex justify-center z-10">
                  <div className="relative w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_40px_rgba(110,64,201,0.6)]">
                    <img
                      src={`${import.meta.env.BASE_URL}copilot-logo.jpeg`}
                      alt="GitHub Copilot"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Past Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "AI for Developers Workshop", date: "Past" },
                { title: "Cloud Computing Bootcamp", date: "Past" },
                { title: "Open Source Contribution Sprint", date: "Past" }
              ].map((event, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className="bg-[#0a0a0f] border border-white/10 p-6 hover:border-[#0078D4]/50 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0078D4] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-white/5 flex items-center justify-center rounded text-gray-400">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono text-[#00FF41] bg-[#00FF41]/10 px-2 py-1 rounded">
                      [ COMPLETED ]
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-2">{event.title}</h4>
                  <div className="font-mono text-sm text-gray-500 mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-600"></span> LOG ARCHIVED
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 px-6 relative">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#0078D4] rounded-full blur-[200px] opacity-10 pointer-events-none -translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="font-mono text-[#00D4FF] mb-4">// README.md</div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Decode your <br/>potential.</h2>
                <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                  Microsoft Learn Community at GGITS is an elite hub for developers, tinkerers, and tech enthusiasts. We bridge the gap between academic theory and bleeding-edge industry practice.
                </p>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  Whether you're compiling your first "Hello World", deploying scalable cloud architectures, or training neural networks, MLC provides the environment, resources, and network to escalate your skills.
                </p>
                
                <ul className="space-y-4 font-mono text-sm text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Access to Microsoft ecosystem tools
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Hands-on technical workshops
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-[#00FF41]">~%</span> Peer-to-peer code reviews & networking
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square bg-black border border-white/10 p-6 font-mono text-sm md:text-base text-gray-300 relative overflow-hidden rounded shadow-2xl">
                  {/* Mac style window dots */}
                  <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  
                  <div className="space-y-2 opacity-80">
                    <p><span className="text-[#00D4FF]">const</span> <span className="text-white">community</span> = <span className="text-[#00D4FF]">new</span> <span className="text-[#00FF41]">MLC</span>(<span className="text-[#FFBA08]">'GGITS'</span>);</p>
                    <p className="mt-4"><span className="text-gray-500">// Initialize growth protocol</span></p>
                    <p>community.<span className="text-[#05A6F0]">on</span>(<span className="text-[#FFBA08]">'join'</span>, (<span className="text-[#00D4FF]">member</span>) =&gt; {'{'}</p>
                    <p className="pl-4">member.<span className="text-[#05A6F0]">upgradeSkills</span>();</p>
                    <p className="pl-4">member.<span className="text-[#05A6F0]">expandNetwork</span>();</p>
                    <p className="pl-4">member.<span className="text-[#05A6F0]">buildProjects</span>();</p>
                    <p className="pl-4"><span className="text-[#00D4FF]">return</span> <span className="text-[#FFBA08]">'Developer Unlocked'</span>;</p>
                    <p>{'}'});</p>
                    <p className="mt-4 animate-pulse text-[#00FF41]">&gt; _</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6 border-t border-white/5 bg-black/20">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
              <Counter end={500} label="Active Members" icon={Users} />
              <Counter end={24} label="Events Held" icon={Calendar} />
              <Counter end={150} label="Projects Built" icon={Code2} />
              <Counter end={15} label="Hackathons Won" icon={Trophy} />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="join" className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0078D4]/10 pointer-events-none"></div>
          
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6">Ready to compile?</h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                Join the network. Get access to exclusive resources, mentorship, and a community of builders who speak your language.
              </p>
              
              <a
                href="https://chat.whatsapp.com/Hb6tPlQTpnyJbKttmrfIVx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-10 py-5 bg-white text-black font-bold font-mono hover:bg-gray-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                &gt; sudo join_community
              </a>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 px-6 relative z-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-4 h-4 bg-[#F35325]"></div>
                <div className="w-4 h-4 bg-[#81BC06]"></div>
                <div className="w-4 h-4 bg-[#05A6F0]"></div>
                <div className="w-4 h-4 bg-[#FFBA08]"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold leading-none">Microsoft Learn Community</span>
                <span className="font-mono text-xs text-gray-500">GGITS Jabalpur</span>
              </div>
            </div>
            
            <div className="flex gap-6">
              <a href="https://www.linkedin.com/company/ms-ggits/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#0078D4] transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-500 hover:text-[#00D4FF] transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 font-mono">
            <p>© {new Date().getFullYear()} Microsoft Learn Community GGITS. All systems operational.</p>
            <p className="flex items-center gap-2">
              Designed with <span className="text-[#00FF41]">♥</span> by hackers
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
