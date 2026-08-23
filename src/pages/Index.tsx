import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import SecurityDashboard from "@/components/SecurityDashboard";
import Timeline from "@/components/Timeline";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

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
      <Timeline />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
