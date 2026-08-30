import { Mail, Linkedin, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profile } from "@/data/profile";

const Contact = () => {
  return (
    <section id="contact" className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Let's <span className="text-gradient">Connect</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Always open to interesting projects, collaboration, or just a chat about security and infrastructure.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3 card-glow" asChild>
            <a href={`mailto:${profile.contact.email}`}>
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-sm">Email</span>
            </a>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3 card-glow" asChild>
            <a href={profile.contact.linkedin} target="_blank" rel="noopener noreferrer">
              <Linkedin className="h-8 w-8 text-primary" />
              <span className="text-sm">LinkedIn</span>
            </a>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3 card-glow" asChild>
            <a href={profile.contact.github} target="_blank" rel="noopener noreferrer">
              <Github className="h-8 w-8 text-primary" />
              <span className="text-sm">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Contact;
