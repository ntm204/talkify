import { useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, User, Settings, X, LucideGlobe } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const previousPath = useRef("/");

  const toggleModal = () => {
    if (isModalOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <header className="bg-base-100 border-b border-base-300 fixed top-0 w-full z-50 backdrop-sm bg-base-100/90">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-300"
        >
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
            <LucideGlobe className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Talkify
          </span>
        </Link>

        {/* Navigation Buttons */}
        <nav className="flex items-center gap-3">
          {authUser ? (
            <button
              type="button"
              onClick={toggleModal}
              aria-label={`Open user menu for ${authUser.fullName || "User"}`}
              aria-expanded={isModalOpen}
              className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                {authUser.fullName || "User"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (location.pathname === "/settings") {
                  navigate(previousPath.current);
                } else {
                  previousPath.current = location.pathname;
                  navigate("/settings");
                }
              }}
              aria-label="Navigate to settings page"
              className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                Settings
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 transition-opacity duration-300"
            onClick={toggleModal}
            aria-hidden="true"
            role="presentation"
          ></div>

          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className={`bg-base-100/80 border border-base-300 rounded-lg shadow-xl w-full max-w-sm p-6 font-sans ${
                isClosing ? "animate-slideDown" : "animate-slideUp"
              } relative`}
              role="dialog"
              aria-labelledby="modal-title"
            >
              <button
                type="button"
                onClick={toggleModal}
                aria-label="Close menu"
                className="absolute top-3 right-3 text-base-content/70 hover:text-base-content transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              <h3
                id="modal-title"
                className="text-lg font-semibold mb-4 text-base-content"
              >
                Menu
              </h3>
              <div className="flex flex-col gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200/50 rounded-md transition-colors duration-200 font-medium text-base-content"
                  onClick={toggleModal}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-base-200/50 rounded-md transition-colors duration-200 font-medium text-base-content"
                  onClick={toggleModal}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    toggleModal();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-100/50 rounded-md transition-colors duration-200 font-medium w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
