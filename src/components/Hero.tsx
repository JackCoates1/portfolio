import { Github, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cyber.jpg";
import AnimatedCenterpiece from "./AnimatedCenterpiece";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient">
            Jack Coates
          </h1>
          
          {/* Crazy Center Animation */}
          <AnimatedCenterpiece />
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto mt-8">
            Passionate about protecting digital assets and building secure systems
          </p>
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Button size="lg" className="group" asChild>
              <a href="mailto:Coatesjack06@gmail.com">
                <Mail className="mr-2 h-5 w-5 group-hover:animate-pulse-glow" />
                Get In Touch
              </a>
            </Button>
            <Button variant="outline" size="lg" className="group" asChild>
              <a href="https://github.com/shexty" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                GitHub
              </a>
            </Button>
            <Button variant="outline" size="lg" className="group" asChild>
              <a href="https://uk.linkedin.com/in/jack-coates" target="_blank" rel="noopener noreferrer">
                <Linkedin className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                LinkedIn
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse-glow"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
