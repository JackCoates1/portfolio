import { Badge } from "@/components/ui/badge";

const Skills = () => {
  const skillCategories = [
    {
      title: "Security",
      skills: ["Wireshark", "Metasploit", "Nmap", "Kali Linux", "Pen Testing", "DDoS Mitigation", "Network Security", "Cryptography"]
    },
    {
      title: "Development",
      skills: ["Python", "Node.js", "Express", "React", "TypeScript", "Bash", "PowerShell", "EJS"]
    },
    {
      title: "Infrastructure",
      skills: ["Linux", "Docker", "Proxmox", "k3s", "nginx", "Cloudflare", "ArgoCD", "PM2"]
    },
    {
      title: "Tools & Services",
      skills: ["Git", "Stripe", "Tailwind CSS", "Vite", "Brevo", "Telegram API", "SSH", "Certbot"]
    }
  ];

  return (
    <section id="skills" className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
          Technical <span className="text-gradient">Skills</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <div 
              key={category.title}
              className="bg-card border border-border rounded-lg p-6 card-glow animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <h3 className="text-xl font-semibold mb-4 text-primary">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <Badge 
                    key={skill}
                    variant="secondary"
                    className="bg-secondary hover:bg-primary/20 transition-colors cursor-default"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;

