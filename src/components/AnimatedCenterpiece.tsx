import { Shield, Lock, Eye, Terminal } from "lucide-react";

const AnimatedCenterpiece = () => {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-12">
      {/* Network Grid Background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
      </div>

      <div className="relative grid md:grid-cols-3 gap-8 items-center">
        {/* Left Node */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-card border-2 border-primary/50 rounded-full p-6 card-glow">
              <Lock className="w-8 h-8 text-primary animate-pulse-glow" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono text-primary">ENCRYPTION</p>
            <div className="flex gap-1 justify-center mt-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Center Shield - Main Feature */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 border-2 border-primary/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border border-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Main shield */}
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-card to-secondary border-2 border-primary rounded-2xl p-8 card-glow">
                <Shield className="w-16 h-16 text-primary glow-text" strokeWidth={1.5} />
                
                {/* Scanning line effect */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono text-primary font-bold">SECURE</p>
            <p className="text-xs text-muted-foreground mt-1">Protected Network</p>
          </div>
        </div>

        {/* Right Node */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-card border-2 border-primary/50 rounded-full p-6 card-glow">
              <Eye className="w-8 h-8 text-primary animate-pulse-glow" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono text-primary">MONITORING</p>
            <div className="flex gap-1 justify-center mt-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
        <line x1="25%" y1="50%" x2="50%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="5,5" opacity="0.3">
          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="5,5" opacity="0.3">
          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Bottom terminal indicator */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground animate-fade-in" style={{ animationDelay: '0.8s' }}>
        <Terminal className="w-4 h-4 text-primary" />
        <span>system.status:</span>
        <span className="text-primary">OPERATIONAL</span>
        <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse-glow ml-2"></span>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedCenterpiece;
