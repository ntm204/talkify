import Navbar from "./components/Navbar";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect, Suspense, lazy } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const HomePage = lazy(() => import("./pages/HomePage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <Loader className="size-10 animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={authUser ? <HomePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/signup"
            element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
          />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/friends"
            element={authUser ? <FriendsPage /> : <Navigate to="/login" />}
          />
        </Routes>
      </Suspense>
      <Toaster
        toastOptions={{
          style: {
            maxWidth: 420,
            padding: "16px 28px",
            fontSize: "16px",
            borderRadius: "12px",
            textAlign: "center",
            fontWeight: 500,
            boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
          },
          success: {
            style: {
              background: "#e6f9f0",
              color: "#1a6333",
            },
            iconTheme: {
              primary: "#22c55e",
              secondary: "#e6f9f0",
            },
          },
          error: {
            style: {
              background: "#fff0f0",
              color: "#b91c1c",
            },
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff0f0",
            },
          },
        }}
      />
    </div>
  );
};
export default App;
