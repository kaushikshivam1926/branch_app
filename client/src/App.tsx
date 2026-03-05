import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BranchProvider } from "./contexts/BranchContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import PlaceholderApp from "./pages/PlaceholderApp";
import ChargesReturnApp from "./pages/ChargesReturnApp";
import DakNumberGenerator from "./pages/DakNumberGenerator";
import FinancialPlanningToolkit from "./pages/FinancialPlanningToolkit";
import RemindersApp from "./pages/RemindersApp";
import LeadManagementApp from "./pages/LeadManagementApp";
import WebResourceHub from "./pages/WebResourceHub";
import LetterGenerator from "./pages/LetterGenerator";
import RLMSSupplementer from "./pages/RLMSSupplementer";
import BranchPortfolioDashboard from "./pages/BranchPortfolioDashboard";
import FloatingCalculator from "./components/FloatingCalculator";


function AppRouter() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/notice-generator"} component={Home} />
      <Route path={"/dak-number"} component={DakNumberGenerator} />
      <Route path={"/financial-toolkit"} component={FinancialPlanningToolkit} />
      <Route path={"/reminders"} component={RemindersApp} />
      <Route path={"/lead-management"} component={LeadManagementApp} />
      <Route path={"/web-resource-hub"} component={WebResourceHub} />
      <Route path={"/charges-return"} component={ChargesReturnApp} />
      <Route path={"/letter-generator"} component={LetterGenerator} />
      <Route path={"/branch-portfolio"} component={BranchPortfolioDashboard} />
      <Route path={"/rlms-supplementer"} component={RLMSSupplementer} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <BranchProvider>
          <TooltipProvider>
            <Toaster />
            {/* Hash-based routing ensures the app works when opened as a standalone
                file:// URL without any web server (e.g., index.html on desktop).
                Routes become /#/path instead of /path. */}
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
            <FloatingCalculator />
          </TooltipProvider>
        </BranchProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
