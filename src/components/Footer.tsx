const Footer = () => {
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
        <p>© {new Date().getFullYear()} Cyber Security Portfolio. Built with passion for security.</p>
      </div>
    </footer>
  );
};

export default Footer;
