import { useState } from "react";
const projects = [
  {
    name: "Olive Aesthetics",
    category: "Web applications",
    image: "olive",
    type: "Booking & business operations",
    description:
      "From a first appointment to the daily clinic digest. A booking platform with Stripe deposits, an admin PWA and Telegram automation.",
    stack: "React / Express / Stripe",
    url: "https://oliveaestheticsclinic.com",
    action: "Visit the site",
  },
  {
    name: "MaxsReviews",
    category: "Web applications",
    image: "maxs",
    type: "Commerce",
    description:
      "A complete apparel storefront: checkout, subscriber management, email and the admin tools behind the drop.",
    stack: "Node.js / Express / Stripe / Brevo",
    url: "https://maxsreviews.co.uk",
    action: "Visit the site",
  },
  {
    name: "Homelab Infrastructure",
    category: "Security & infrastructure",
    image: "homelab",
    type: "The system behind the experiments",
    description:
      "Mini PCs, Raspberry Pis, Proxmox and a public VPS. A working environment for running services, testing ideas and understanding the traffic at the edge.",
    stack: "Proxmox / Linux / CrowdSec / OPNsense",
    url: "#data-notes",
    action: "Explore the evidence",
  },
  {
    name: "AI DDoS Firewall",
    category: "Security & infrastructure",
    image: "firewall",
    type: "Network defence tooling",
    description:
      "A Python firewall project combining rate limiting and IP reputation with Telegram and Discord notifications.",
    stack: "Python / Networking / Automation",
    url: "https://github.com/JackCoates1/AI-DDOS-Firewall",
    action: "View the source",
  },
  {
    name: "Insecurity Multi-Tool",
    category: "Security & infrastructure",
    image: "insecurity",
    type: "Reconnaissance tooling",
    description:
      "A private toolkit for port scanning, subdomain enumeration and service fingerprinting. The public product page is linked below.",
    stack: "Python / Recon / Pen testing",
    url: "https://web.whop.com/insecurity-ships/exp_EHYo1MBwGigTZP/app/",
    action: "View the product",
  },
  {
    name: "This Portfolio",
    category: "Web applications",
    image: "portfolio",
    type: "Personal platform / ongoing exploration",
    description:
      "The original production site, now being reimagined around a real-data network observatory. Built with React and Vite, with verifiable build provenance.",
    stack: "React / TypeScript / Vite / Three.js",
    url: "https://github.com/JackCoates1/portfolio",
    action: "View the source",
  },
];
export default function PortfolioWork() {
  const [filter, setFilter] = useState("All work");
  return (
    <section className="work-section page-width" id="projects">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Selected work / 01—06</span>
          <h2>Built to be used.</h2>
        </div>
        <p>
          Client platforms, security tools and the infrastructure that keeps me
          learning.
        </p>
      </div>
      <div className="work-filters" aria-label="Filter projects">
        {["All work", "Web applications", "Security & infrastructure"].map(
          (f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ),
        )}
      </div>
      <div className="project-grid">
        {projects
          .filter((p) => filter === "All work" || p.category === filter)
          .map((p) => (
            <article className="project" key={p.name}>
              <a
                className="project-preview"
                href={p.url}
                {...(p.url.startsWith("https")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                aria-label={`${p.action}: ${p.name}`}
              >
                <img
                  src={`/projects/${p.image}.webp`}
                  alt={
                    p.image === "homelab"
                      ? "Documented homelab architecture diagram"
                      : `${p.name}: ${p.image === "portfolio" ? "original production website" : p.image === "firewall" ? "public GitHub repository" : "public website"}`
                  }
                  width="1200"
                  height="834"
                  loading="lazy"
                />
                <span className="preview-caption">
                  {p.image === "homelab"
                    ? "Documented architecture"
                    : p.image === "firewall"
                      ? "Repository preview"
                      : p.image === "portfolio"
                        ? "Original production site"
                        : "Actual site capture"}
                  <span aria-hidden="true">↗</span>
                </span>
              </a>
              <div className="project-info">
                <span className="eyebrow">{p.type}</span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="project-bottom">
                  <span>{p.stack}</span>
                  <a
                    href={p.url}
                    {...(p.url.startsWith("https")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {p.action} ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
