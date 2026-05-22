const events = [
  {
    year: "2023",
    title: "Started Cyber Security Degree",
    desc: "Began a bachelor's in Cyber Security, focusing on networking, cryptography, and ethical hacking.",
    type: "education",
  },
  {
    year: "2024",
    title: "Built AI DDoS Firewall",
    desc: "Python firewall with real-time DDoS detection and instant Telegram/Discord alerts. First serious security tool.",
    type: "project",
  },
  {
    year: "2024",
    title: "Insecurity Multi-Tool",
    desc: "Built a modular pen testing toolkit covering port scanning, subdomain enumeration, and vulnerability checks.",
    type: "project",
  },
  {
    year: "2025",
    title: "Homelab — Proxmox + k3s",
    desc: "Set up a Proxmox homelab running a k3s Kubernetes cluster across multiple LXC containers with ArgoCD and Cloudflare tunnels.",
    type: "infra",
  },
  {
    year: "2025",
    title: "Launched Radiant Aesthetics Clinic",
    desc: "Full-stack booking and management system — React frontend, Express API, Telegram alerts and daily digests.",
    type: "project",
  },
  {
    year: "2026",
    title: "Launched Max's Reviews",
    desc: "E-commerce platform with Stripe payments, Brevo email, subscriber management and a full admin panel.",
    type: "project",
  },
];

const typeColors: Record<string, string> = {
  education: "text-purple-400 border-purple-400/40 bg-purple-400/10",
  project: "text-primary border-primary/40 bg-primary/10",
  infra: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
};

const typeLabels: Record<string, string> = {
  education: "Education",
  project: "Project",
  infra: "Infrastructure",
};

const Timeline = () => {
  return (
    <section id="timeline" className="py-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
          <span className="text-gradient">Timeline</span>
        </h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

          <div className="space-y-10">
            {events.map((event, i) => (
              <div
                key={i}
                className={`relative flex gap-6 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                {/* Content */}
                <div className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] ${i % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                  <div className="bg-card border border-border rounded-lg p-5 card-glow">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border mb-2 ${typeColors[event.type]}`}>
                      {typeLabels[event.type]}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">{event.year}</p>
                    <h3 className="font-semibold text-base mb-2">{event.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event.desc}</p>
                  </div>
                </div>

                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 top-5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background md:-translate-x-[5px] ring-4 ring-primary/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Timeline;

