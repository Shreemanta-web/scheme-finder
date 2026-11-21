import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import Language from "@/pages/Language";
import Topics from "@/pages/Topics";
import StatePick from "@/pages/StatePick";
import Questions from "@/pages/Questions";
import Results from "@/pages/Results";
import Compare from "@/pages/Compare";
import SchemeDetail from "@/pages/SchemeDetail";
import Recommendation from "@/pages/Recommendation";
import Saved from "@/pages/Saved";
import Help from "@/pages/Help";
import Privacy from "@/pages/Privacy";
import Admin from "@/pages/Admin";
import { SignInPage, SignUpPage } from "@/pages/AuthPages";
import { useEffect } from "react";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="App">
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <ClerkAuthProvider>
            <AppProvider>
              <ScrollTop />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Welcome />} />
                  <Route path="/language" element={<Language />} />
                  <Route path="/topics" element={<Topics />} />
                  <Route path="/state" element={<StatePick />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/scheme/:id" element={<SchemeDetail />} />
                  <Route path="/recommendation" element={<Recommendation />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/sign-in/*" element={<SignInPage />} />
                  <Route path="/sign-up/*" element={<SignUpPage />} />
                </Route>
              </Routes>
              <Toaster position="top-center" richColors closeButton />
            </AppProvider>
          </ClerkAuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </div>
  );
}

export default App;
