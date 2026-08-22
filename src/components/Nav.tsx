import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Timeline", href: "#timeline" },
  { label: "Contact", href: "#contact" },
  { label: "Cyber Lab", href: "/cyberlab" },
];

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = (href: string) => {
    setOpen(false);

    if (href.startsWith("/")) {
      navigate(href);
      return;
    }

    if (location.pathname !== "/") {
      navigate("/" + href);
      return;
    }

    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const navBg = scrolled
    ? "bg-background/95 backdrop-blur border-border"
    : "bg-background/80 backdrop-blur border-border/40";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${navBg}`}>
      <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
        <span className="font-bold text-base font-mono text-primary tracking-widest">JC</span>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => handleClick(l.href)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              {l.label}
            </button>
          ))}
        </div>

        <button className="md:hidden text-muted-foreground hover:text-primary" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur border-b border-border px-6 pb-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => handleClick(l.href)}
              className="text-left py-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Nav;
