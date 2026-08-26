import React from "react";
import { DashboardPage } from "@/pages/DashboardPage";

/**
 * /home — direct command center view on signing in.
 * Renders DashboardPage directly without intermediate direction chooser screen.
 */
export const HomePage: React.FC = () => {
  return <DashboardPage />;
};

export default HomePage;
