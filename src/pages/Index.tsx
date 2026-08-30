import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";

const SecurityDashboard = lazy(() => import("@/components/SecurityDashboard"));

const SecurityDashboardFallback = () => (
  <div id="security" className="py-20 text-center text-sm text-muted-foreground" role="status">
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
  return (
    <div className="min-h-screen">
      <Nav />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-[60] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-primary"
      >
        Skip to content
      </a>
      <main id="main-content">
      <div id="home">
        <Hero />
      </div>
      <About />
      <Skills />
      <Projects />
      <DeferredSecurityDashboard />
      <Contact />
      </main>
      <Footer />
      <TerminalEasterEgg />
    </div>
  );
};

export default Index;
