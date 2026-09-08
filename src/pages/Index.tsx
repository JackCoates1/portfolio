import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Observatory from "@/components/Observatory";
import PortfolioWork from "@/components/PortfolioWork";
import { profile } from "@/data/profile";
import "@/portfolio.css";
import { useSecuritySnapshot } from "@/data/telemetry";
import { coverage, dateLabel } from "@/lib/telemetry.mjs";

const SecurityDashboard = lazy(() => import("@/components/SecurityDashboard"));

const SecurityDashboardFallback = () => (
  <div
    id="security"
    className="py-20 text-center text-sm text-muted-foreground"
    role="status"
  >
    Loading security dashboard…
  </div>
);

const DeferredSecurityDashboard = () => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const placeholderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (shouldLoad) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );

    const placeholder = placeholderRef.current;
    if (!placeholder) {
      setShouldLoad(true);
      return;
    }
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [shouldLoad]);

  if (shouldLoad) {
    return (
      <Suspense fallback={<SecurityDashboardFallback />}>
        <SecurityDashboard />
      </Suspense>
    );
  }

  return (
    <section
      id="security"
      ref={placeholderRef}
      className="min-h-48"
      aria-label="Security dashboard"
    />
  );
};

const Index = () => {
  const { snapshot, error } = useSecuritySnapshot();
  const vps = snapshot?.feeds.find((f) => f.id === "vps");
  const homelab = snapshot?.feeds.find((f) => f.id === "homelab");
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPaused(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return (
    <div className="portfolio" data-paused={paused}>
      <div className="ambient-field" aria-hidden="true" />
      <Nav />
      <div role="navigation" aria-label="Skip navigation">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
      </div>
      <main id="main-content">
        <section className="hero-layout page-width" id="home">
          <div className="hero-copy">
            <div className="identity">
              <span className="identity-line" />
              Jack Coates <span>/ Bradford, UK</span>
            </div>
            <h1>
              Build.
              <br />
              Break.
              <br />
              <span>Make it better.</span>
            </h1>
            <p className="hero-intro">
              Developer. Cyber security student.
              <br />
              Curious about how things work.
              <br />
              Persistent about making them work well.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#projects">
                Explore my work <span>↘</span>
              </a>
              <a href="#contact">Get in touch ↗</a>
            </div>
            <div className="hero-footnote">
              <span>On the other side of the interface</span>
              <p>
                A glimpse into the systems I run.
                <br />
                Real observations. Openly explained.
              </p>
            </div>
          </div>
          <Observatory paused={paused} snapshot={snapshot} error={error} />
        </section>
        <div className="page-width motion-row">
          <p>
            <span className="legend-dot" />
            Source observations <span className="legend-home" />
            Symbolic home anchor{" "}
            <span className="motion-explainer">
              / Schematic paths, not packet routes
            </span>
          </p>
          <button aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume motion" : "Pause motion"}{" "}
            <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
          </button>
        </div>
        <PortfolioWork />
        <section id="about" className="about-section page-width">
          <div>
            <span className="eyebrow">The person behind the systems</span>
            <h2>
              Curiosity,
              <br />
              put to work.
            </h2>
          </div>
          <div className="about-copy">
            {profile.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div id="skills" className="skill-lines">
              {profile.skills.map((c) => (
                <div key={c.title}>
                  <h3>{c.title}</h3>
                  <p>{c.skills.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="data-notes page-width" id="data-notes">
          <div>
            <span className="eyebrow">Evidence, with context</span>
            <h2>
              What the globe
              <br />
              actually shows.
            </h2>
            <a href="/data/security-snapshot.json" className="text-link">
              Inspect the public dataset ↗
            </a>
          </div>
          <div className="data-explanation">
            <p>
              This is a historical snapshot
              {snapshot
                ? ` captured on ${dateLabel(snapshot.capturedAt)}`
                : " (currently unavailable)"}
              , not a live threat feed. The two sources describe different
              systems and different kinds of observations.
            </p>
            <dl>
              <div>
                <dt>VPS / CrowdSec</dt>
                <dd>
                  {vps
                    ? `${vps.count} local detection records. Coverage: ${coverage(vps.nodes)}.`
                    : "VPS data unavailable."}{" "}
                  These cover SSH brute-force and web scanning or exploit
                  detections on my public VPS. Community blocklist entries are
                  excluded.
                </dd>
              </div>
              <div>
                <dt>Homelab / OPNsense</dt>
                <dd>
                  {homelab
                    ? `${homelab.count} inbound firewall blocks from public source addresses in a bounded ${homelab.inputRecords.toLocaleString("en-GB")}-line log sample.`
                    : "Homelab data unavailable."}{" "}
                  A block is not proof of an attack. Private-source CrowdSec
                  detections are excluded. Suricata observations are not
                  included in this firewall dataset.
                </dd>
              </div>
              <div>
                <dt>Location & privacy</dt>
                <dd>
                  Approximate GeoIP coordinates are grouped and rounded. They
                  describe source infrastructure, not the nationality or
                  physical location of an attacker. No source IPs are published.
                  Lines connect to a symbolic Bradford anchor; they are not
                  network routes.
                </dd>
              </div>
            </dl>
          </div>
        </section>
        <div className="legacy-security">
          <DeferredSecurityDashboard />
        </div>
        <section className="contact-section page-width" id="contact">
          <span className="eyebrow">Have something worth building?</span>
          <h2>
            Let’s make
            <br />
            something work.
          </h2>
          <a className="contact-email" href={`mailto:${profile.contact.email}`}>
            {profile.contact.email} <span>↗</span>
          </a>
          <div className="contact-links">
            <a
              href={profile.contact.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
            <a
              href={profile.contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn ↗
            </a>
            <a href="/api/resume">Résumé JSON ↗</a>
            <a href="/cyberlab">Explore the Cyber Lab ↗</a>
          </div>
        </section>
      </main>
      <footer className="page-width portfolio-footer">
        <span>Jack Coates / Developer & cyber security student</span>
        <a href="#home">Back to the surface ↑</a>
      </footer>
    </div>
  );
};
export default Index;
