import resume from "./resume.json";
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
  name: resume.name,
  roleSummary: resume.summary,
  terminalSummary: `${resume.name} — ${resume.summary} Based in ${resume.location}.`,
  about: resume.bio.split("\n\n"),
  skills: [
    { title: "Security", skills: resume.skills.security },
    { title: "Development", skills: resume.skills.development },
    { title: "Infrastructure", skills: resume.skills.infrastructure },
    { title: "Tools & Services", skills: resume.skills.tools },
  ],
  contact: {
    email: resume.contact.email,
    github: resume.links.github,
    linkedin: resume.links.linkedin,
    site: resume.links.portfolio,
  },
} as const satisfies ProfileData;
