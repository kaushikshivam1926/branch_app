import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import PlaceholderApp from "./pages/PlaceholderApp";
import DakNumberGenerator from "./pages/DakNumberGenerator";
import EMICalculator from "./pages/EMICalculator";
import RemindersApp from "./pages/RemindersApp";
import LeadManagementApp from "./pages/LeadManagementApp";


function AppRouter() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/loan-recovery"} component={Home} />
      <Route path={"/dak-number"} component={DakNumberGenerator} />
      <Route path={"/emi-calculator"} component={EMICalculator} />
      <Route path={"/reminders"} component={RemindersApp} />
      <Route path={"/lead-management"} component={LeadManagementApp} />
      <Route path={"/branch-reports"}>
        <PlaceholderApp title="Branch Reports" />
      </Route>
      <Route path={"/security-docs"}>
        <PlaceholderApp title="Security Documents" />
      </Route>
      <Route path={"/branch-info"}>
        <PlaceholderApp title="Branch Information" />
      </Route>
      <Route path={"/misc-reports"}>
        <PlaceholderApp title="Miscellaneous Reports" />
      </Route>
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
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
