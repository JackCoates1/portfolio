import { Github, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cyber.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-14">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="container mx-auto px-4 z-10 text-center max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground">
          Jack Coates
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10">
          Developer and cyber security student. I build production web apps, security tools, and run a homelab that probably does too much.
        </p>
        <div className="flex gap-3 justify-center items-center flex-wrap">
          <Button size="lg" asChild>
            <a href="mailto:coatesjack06@gmail.com">
              <Mail className="mr-2 h-5 w-5" />
              Get In Touch
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="https://github.com/JackCoates1" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="https://www.linkedin.com/in/jack-coates-a8a430310" target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-2 h-5 w-5" />
              LinkedIn
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
