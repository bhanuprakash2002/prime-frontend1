import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">
            Oops! The page you are looking for does not exist.
          </p>

          <Button
            size="lg"
            className="shadow-primary mt-4"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default NotFound;
