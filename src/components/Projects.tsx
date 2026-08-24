import { ExternalLink, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Projects = () => {
  const projects = [
    {
      title: "This Portfolio",
      description: "The site you're looking at. React/Vite SPA with a live CrowdSec security dashboard fed by real traffic, a replay of an actual blocked attack, and GPG-signed, build-attested deploys.",
      tags: ["React", "TypeScript", "Vite", "CrowdSec"],
      github: "https://github.com/JackCoates1/portfolio",
      live: "https://jackcoates.co.uk",
    },
    {
      title: "MaxsReviews",
      description: "Full-stack e-commerce site for digital review products. Node/Express backend, Stripe payments, Brevo email, subscriber management, and a full admin panel.",
      tags: ["Node.js", "Express", "Stripe", "EJS"],
      github: null,
      live: "https://maxsreviews.co.uk",
    },
    {
      title: "Olive Aesthetics",
      description: "Booking and management system for an aesthetics clinic. React frontend, Express API, Stripe deposit payments (card + Klarna), an admin PWA, Telegram alerts, and automated daily digests.",
      tags: ["React", "Express", "Stripe", "Automation"],
      github: null,
      live: "https://oliveaestheticsclinic.com",
    },
    {
      title: "AI DDoS Firewall",
      description: "Python firewall that detects and blocks DDoS attacks in real time using rate limiting and IP reputation. Sends instant Telegram/Discord alerts when an attack is caught.",
      tags: ["Python", "Security", "Networking", "Automation"],
      github: "https://github.com/JackCoates1/AI-DDOS-Firewall",
      live: null,
    },
    {
      title: "Insecurity Multi-Tool",
      description: "Pen testing toolkit for recon and vulnerability scanning. Covers port scanning, subdomain enumeration, service fingerprinting, and more. Private repo.",
      tags: ["Python", "Pen Testing", "Recon", "Security"],
      github: null,
      live: "https://web.whop.com/insecurity-ships/exp_EHYo1MBwGigTZP/app/",
    },
    {
      title: "Homelab Infrastructure",
      description: "A physical Proxmox rack (mini PCs + Raspberry Pis) running k3s, ArgoCD, and Docker, plus a VPS that hosts this site and my other production apps. Cloudflare-fronted, with CrowdSec watching real traffic and blocking attacks at the firewall — the live feed above is that system, not a demo.",
      tags: ["Proxmox", "k3s", "CrowdSec", "Cloudflare"],
      github: null,
      live: null,
    },
  ];

  return (
    <section id="projects" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
          Featured <span className="text-gradient">Projects</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <Card 
              key={project.title}
              className="bg-card border-border card-glow animate-fade-in-up overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-primary/30">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                {project.github && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      Code
                    </a>
                  </Button>
                )}
                {project.live && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={project.live} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Live
                    </a>
                  </Button>
                )}
                {!project.github && !project.live && (
                  <span className="text-muted-foreground text-sm">Private / Internal</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;

