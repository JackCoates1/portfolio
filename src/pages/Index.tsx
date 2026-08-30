import { lazy, Suspense } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";

const SecurityDashboard = lazy(() => import("@/components/SecurityDashboard"));

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
      <Suspense fallback={<div id="security" className="py-20 text-center text-sm text-muted-foreground" role="status">Loading security dashboard…</div>}>
        <SecurityDashboard />
      </Suspense>
      <Contact />
      </main>
      <Footer />
      <TerminalEasterEgg />
    </div>
  );
};

export default Index;
