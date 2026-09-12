import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import ConsoleOverview from "@/pages/ConsoleOverview";
import Investigate from "@/pages/Investigate";
import IncidentCenter from "@/pages/IncidentCenter";
import IncidentDetail from "@/pages/IncidentDetail";
import Replay from "@/pages/Replay";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/console" element={<ConsoleOverview />} />
        <Route path="/console/investigate" element={<Investigate />} />
        <Route path="/console/incidents" element={<IncidentCenter />} />
        <Route path="/console/incidents/:id" element={<IncidentDetail />} />
        <Route path="/console/incidents/:id/replay" element={<Replay />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
