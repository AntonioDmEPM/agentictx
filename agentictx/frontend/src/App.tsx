import { Routes, Route } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { LeftNav } from "@/components/LeftNav";
import { EngagementList } from "@/modules/engagement/EngagementList";
import { EngagementDetail } from "@/modules/engagement/EngagementDetail";
import { DiscoveryModule } from "@/modules/discovery";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftNav />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <EngagementList />
          </Layout>
        }
      />
      <Route
        path="/engagements/:id"
        element={
          <Layout>
            <EngagementDetail />
          </Layout>
        }
      />
      <Route
        path="/engagements/:id/use-cases/:useCaseId/discovery"
        element={
          <Layout>
            <DiscoveryModule />
          </Layout>
        }
      />
    </Routes>
  );
}
