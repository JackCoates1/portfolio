import { ExternalLink, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Projects = () => {
  const projects = [
    {
      title: "Network Intrusion Detection System",
      description: "Built a Python-based IDS that monitors network traffic and detects anomalies using machine learning algorithms.",
      tags: ["Python", "Scikit-learn", "Wireshark", "Machine Learning"],
      github: "#",
      demo: "#"
    },
    {
      title: "Password Strength Analyzer",
      description: "Web application that evaluates password strength and provides recommendations based on NIST guidelines.",
      tags: ["JavaScript", "React", "Cryptography", "NIST"],
      github: "#",
      demo: "#"
    },
    {
      title: "CTF Challenge Platform",
      description: "Created a capture-the-flag platform for students to practice cybersecurity skills with various challenges.",
      tags: ["Docker", "Node.js", "SQL", "Web Security"],
      github: "#",
      demo: "#"
    },
    {
      title: "Vulnerability Scanner",
      description: "Automated tool for scanning web applications and identifying common security vulnerabilities like XSS and SQL injection.",
      tags: ["Python", "OWASP", "Selenium", "Penetration Testing"],
      github: "#",
      demo: "#"
    }
  ];

  return (
    <section id="projects" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
          Featured <span className="text-gradient">Projects</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <Card 
              key={project.title}
              className="bg-card border-border card-glow animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-primary/30">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1">
                  <Github className="mr-2 h-4 w-4" />
                  Code
                </Button>
                <Button size="sm" className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Demo
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
