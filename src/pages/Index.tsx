import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import SecurityDashboard from "@/components/SecurityDashboard";
import VerifiedStatus from "@/components/VerifiedStatus";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Nav />
      <div id="home">
        <Hero />
      </div>
      <About />
      <Skills />
      <Projects />
      <SecurityDashboard />
      <VerifiedStatus />
      <Contact />
      <Footer />
      <TerminalEasterEgg />
    </div>
  );
};

export default Index;
