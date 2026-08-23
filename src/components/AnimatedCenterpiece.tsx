import { Shield, Lock, Eye, Terminal } from "lucide-react";

const AnimatedCenterpiece = () => {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-12">
      <div className="relative grid md:grid-cols-3 gap-8 items-center">
        {/* Left Node */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="bg-card border border-primary/40 rounded-full p-6 card-glow">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-mono text-primary">ENCRYPTION</p>
        </div>

        {/* Center Shield */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="bg-card border border-primary rounded-2xl p-8 card-glow">
            <Shield className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-mono text-primary font-bold">SECURE</p>
            <p className="text-xs text-muted-foreground mt-1">Protected Network</p>
          </div>
        </div>

        {/* Right Node */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="bg-card border border-primary/40 rounded-full p-6 card-glow">
            <Eye className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-mono text-primary">MONITORING</p>
        </div>
      </div>

      {/* Bottom terminal indicator — the one live/animated detail on this page */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground animate-fade-in" style={{ animationDelay: "0.8s" }}>
        <Terminal className="w-4 h-4 text-primary" />
        <span>system.status:</span>
        <span className="text-primary">OPERATIONAL</span>
        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse ml-2" />
      </div>
    </div>
  );
};

export default AnimatedCenterpiece;
