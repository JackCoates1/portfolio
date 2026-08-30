import { useLocation, Link } from "react-router-dom";
import { Terminal } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center font-mono">
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
          <Terminal className="h-4 w-4" />
          <span className="text-sm">404</span>
        </div>
        <p className="text-lg text-foreground mb-2">
          <span className="text-primary">$</span> curl {location.pathname}
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Nothing here — that route doesn't resolve to anything.
        </p>
        <Link to="/" className="text-sm text-primary hover:underline">
          ← back to jackcoates.co.uk
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
