import { useState } from "react";
import { projects } from "@/data/projects.mjs";
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
