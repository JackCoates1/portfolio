export interface SkillCategory {
  title: "Security" | "Development" | "Infrastructure" | "Tools & Services";
  skills: readonly string[];
}

export interface ProfileData {
  name: string;
  roleSummary: string;
  terminalSummary: string;
  about: readonly string[];
  skills: readonly SkillCategory[];
  contact: {
    email: string;
    github: string;
    linkedin: string;
    site: string;
  };
}

export const profile = {
  name: "Jack Coates",
  roleSummary: "Developer and cyber security student. I build production web apps, security tools, and run a homelab that probably does too much.",
  terminalSummary: "Jack Coates — developer and cyber security student based in Bradford, UK. I build production web apps, security tools, and run a homelab that probably does too much.",
  about: [
    "I am a cyber security student based in Bradford, UK. Alongside studying I build real things — full-stack web apps, security tools, and infrastructure that actually runs in production.",
    "I run a Proxmox homelab with a k3s cluster, keep production sites live on a VPS, and automate anything that can be automated. If something can be made more secure or more reliable, I will poke at it until it is.",
  ],
  skills: [
    {
      title: "Security",
      skills: ["Wireshark", "Metasploit", "Nmap", "Kali Linux", "Pen Testing", "DDoS Mitigation", "Network Security", "Cryptography"],
    },
    {
      title: "Development",
      skills: ["Python", "Node.js", "Express", "React", "TypeScript", "Bash", "PowerShell", "EJS"],
    },
    {
      title: "Infrastructure",
      skills: ["Linux", "Docker", "Proxmox", "k3s", "nginx", "Cloudflare", "ArgoCD", "PM2"],
    },
    {
      title: "Tools & Services",
      skills: ["Git", "Stripe", "Tailwind CSS", "Vite", "Brevo", "Telegram API", "SSH", "Certbot"],
    },
  ],
  contact: {
    email: "coatesjack06@gmail.com",
    github: "https://github.com/JackCoates1",
    linkedin: "https://www.linkedin.com/in/jack-coates-a8a430310",
    site: "https://jackcoates.co.uk",
  },
} as const satisfies ProfileData;
