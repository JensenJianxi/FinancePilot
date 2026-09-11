import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ErrorState } from "../components/feedback/ErrorState";
import { FeatureBoundary } from "../components/feedback/FeatureBoundary";
import { LoadingState } from "../components/feedback/LoadingState";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { useSettings } from "../hooks/useSettings";
import { useUiStore } from "./useUiStore";

const loadHomePage = () => import("../features/home/HomePage");
const loadCategoriesPage = () => import("../features/categories/CategoriesPage");
const loadExpensesPage = () => import("../features/transactions/ExpensesPage");
const loadBudgetPage = () => import("../features/budget/BudgetPage");
const loadMorePage = () => import("../features/more/MorePage");
const loadProfilePage = () => import("../features/profile/ProfilePage");
const loadActivityHistoryPage = () => import("../features/transactions/ActivityHistoryPage");
const loadTransactionComposer = () =>
  import("../features/transactions/TransactionComposer").then((module) => ({
    default: module.TransactionComposer
  }));

const HomePage = lazy(loadHomePage);
const CategoriesPage = lazy(loadCategoriesPage);
const ExpensesPage = lazy(loadExpensesPage);
const BudgetPage = lazy(loadBudgetPage);
const MorePage = lazy(loadMorePage);
const ProfilePage = lazy(loadProfilePage);
const ActivityHistoryPage = lazy(loadActivityHistoryPage);
const LoginPage = lazy(() => import("../features/authentication/LoginPage"));
const RegisterPage = lazy(() => import("../features/authentication/RegisterPage"));
const ConfirmEmailPage = lazy(() => import("../features/authentication/ConfirmEmailPage"));
const ForgotPasswordPage = lazy(() => import("../features/authentication/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/authentication/ResetPasswordPage"));
const TransactionComposer = lazy(loadTransactionComposer);

const protectedPageLoaders = [
  loadHomePage,
  loadCategoriesPage,
  loadExpensesPage,
  loadBudgetPage,
  loadMorePage,
  loadProfilePage,
  loadActivityHistoryPage,
  loadTransactionComposer
];

function ProtectedAppRoutes({ onAdd }: { onAdd: () => void }) {
  const location = useLocation();
  const settings = useSettings();
  const animationsEnabled = useUiStore((state) => state.animationsEnabled);
  const setAnimationsEnabled = useUiStore((state) => state.setAnimationsEnabled);
  const setTheme = useUiStore((state) => state.setTheme);
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    if (!settings.data) {
      return;
    }

    if (settings.data.animationsEnabled !== animationsEnabled) {
      setAnimationsEnabled(settings.data.animationsEnabled);
    }

    if (settings.data.theme !== theme) {
      setTheme(settings.data.theme);
    }
  }, [animationsEnabled, setAnimationsEnabled, setTheme, settings.data, theme]);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      protectedPageLoaders.forEach((loadPage) => {
        void loadPage();
      });
    }, 500);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  return (
    <AppShell onAdd={onAdd}>
      <FeatureBoundary
        key={location.pathname}
        fallback={
          <ErrorState
            message="FinancePilot hit a temporary screen error. Try opening the page again."
            title="This page could not load."
          />
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/activity" element={<ActivityHistoryPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </FeatureBoundary>
    </AppShell>
  );
}

export function App() {
  const closeComposer = useUiStore((state) => state.closeComposer);
  const animationsEnabled = useUiStore((state) => state.animationsEnabled);
  const isComposerOpen = useUiStore((state) => state.isComposerOpen);
  const openComposer = useUiStore((state) => state.openComposer);
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColor = theme === "dark" ? "#090d16" : "#f6f7fb";
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    themeMeta?.setAttribute("content", themeColor);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.animations = animationsEnabled ? "enabled" : "disabled";
  }, [animationsEnabled]);

  return (
    <>
      <Suspense fallback={<LoadingState label="Loading FinancePilot" />}>
        <Routes>
          <Route path="/auth" element={<Navigate replace to="/login" />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/confirm-email"
            element={
              <PublicOnlyRoute>
                <ConfirmEmailPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute>
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <ProtectedAppRoutes onAdd={openComposer} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>

      {isComposerOpen ? (
        <Suspense fallback={null}>
          <TransactionComposer onClose={closeComposer} />
        </Suspense>
      ) : null}
    </>
  );
}
