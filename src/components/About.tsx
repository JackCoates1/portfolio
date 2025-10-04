import { GraduationCap, Shield, Code } from "lucide-react";

const About = () => {
  return (
    <section id="about" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
          About <span className="text-gradient">Me</span>
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 animate-fade-in-up">
            <p className="text-lg text-muted-foreground leading-relaxed">
              I'm a dedicated Cyber Security student with a passion for ethical hacking, 
              network security, and threat analysis. My journey in cybersecurity began 
              with a fascination for understanding how systems work and how to protect them.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Currently pursuing my degree while building hands-on projects that demonstrate real-world security implementations.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="bg-card border border-border rounded-lg p-6 card-glow">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Education</h3>
                  <p className="text-muted-foreground">
                    Currently studying a bachelor's in Cyber Security
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-glow">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Focus Areas</h3>
                  <p className="text-muted-foreground">
                    Penetration Testing, Network Security, Incident Response
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-glow">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Technical Skills</h3>
                  <p className="text-muted-foreground">
                    Python, Linux, Bash
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
