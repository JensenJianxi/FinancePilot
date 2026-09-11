import { create } from "zustand";
import type { Budget, Category, SavingGoal, Settings, Subscription, Transaction } from "@finance-pilot/shared";

type ThemeMode = "light" | "dark";

interface UiState {
  animationsEnabled: boolean;
  deletedTransactionIds: string[];
  draftTransactions: Transaction[];
  isComposerOpen: boolean;
  localBudgets: Budget[] | null;
  localCategories: Category[] | null;
  localSettings: Settings | null;
  localSavingsGoals: SavingGoal[] | null;
  localSubscriptions: Subscription[] | null;
  theme: ThemeMode;
  createLocalBudget: (budget: Budget) => void;
  addTransaction: (transaction: Transaction) => void;
  createLocalCategory: (category: Category) => void;
  createLocalSubscription: (subscription: Subscription) => void;
  createLocalSavingsGoal: (goal: SavingGoal) => void;
  closeComposer: () => void;
  deleteLocalBudget: (budgetId: string) => void;
  deleteLocalCategory: (categoryId: string) => void;
  deleteLocalSubscription: (subscriptionId: string) => void;
  deleteLocalSavingsGoal: (goalId: string) => void;
  deleteTransaction: (transactionId: string) => void;
  initializeLocalBudgets: (budgets: Budget[]) => void;
  initializeLocalCategories: (categories: Category[]) => void;
  initializeLocalSubscriptions: (subscriptions: Subscription[]) => void;
  initializeLocalSavingsGoals: (goals: SavingGoal[]) => void;
  openComposer: () => void;
  resetUserState: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setLocalSettings: (settings: Settings) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  updateLocalBudget: (budget: Budget) => void;
  updateLocalCategory: (category: Category) => void;
  updateLocalSubscription: (subscription: Subscription) => void;
  updateLocalSavingsGoal: (goal: SavingGoal) => void;
  updateTransaction: (transaction: Transaction) => void;
}

export const useUiStore = create<UiState>((set) => ({
  animationsEnabled: true,
  deletedTransactionIds: [],
  draftTransactions: [],
  isComposerOpen: false,
  localBudgets: null,
  localCategories: null,
  localSettings: null,
  localSavingsGoals: null,
  localSubscriptions: null,
  theme: "light",
  addTransaction: (transaction) =>
    set((state) => ({
      deletedTransactionIds: state.deletedTransactionIds.filter((id) => id !== transaction.id),
      draftTransactions: [transaction, ...state.draftTransactions],
      isComposerOpen: false
    })),
  createLocalBudget: (budget) =>
    set((state) => ({
      localBudgets: [budget, ...(state.localBudgets ?? [])]
    })),
  createLocalCategory: (category) =>
    set((state) => ({
      localCategories: [category, ...(state.localCategories ?? [])]
    })),
  createLocalSubscription: (subscription) =>
    set((state) => ({
      localSubscriptions: [subscription, ...(state.localSubscriptions ?? [])]
    })),
  createLocalSavingsGoal: (goal) =>
    set((state) => ({
      localSavingsGoals: [goal, ...(state.localSavingsGoals ?? [])]
    })),
  closeComposer: () => set({ isComposerOpen: false }),
  deleteLocalBudget: (budgetId) =>
    set((state) => ({
      localBudgets: (state.localBudgets ?? []).filter((budget) => budget.id !== budgetId)
    })),
  deleteLocalCategory: (categoryId) =>
    set((state) => ({
      localCategories: (state.localCategories ?? []).filter((category) => category.id !== categoryId)
    })),
  deleteLocalSubscription: (subscriptionId) =>
    set((state) => ({
      localSubscriptions: (state.localSubscriptions ?? []).filter(
        (subscription) => subscription.id !== subscriptionId
      )
    })),
  deleteLocalSavingsGoal: (goalId) =>
    set((state) => ({
      localSavingsGoals: (state.localSavingsGoals ?? []).filter((goal) => goal.id !== goalId)
    })),
  deleteTransaction: (transactionId) =>
    set((state) => ({
      deletedTransactionIds: state.deletedTransactionIds.includes(transactionId)
        ? state.deletedTransactionIds
        : [...state.deletedTransactionIds, transactionId],
      draftTransactions: state.draftTransactions.filter((transaction) => transaction.id !== transactionId),
      isComposerOpen: false
    })),
  initializeLocalBudgets: (budgets) =>
    set((state) => ({
      localBudgets: state.localBudgets ?? budgets
    })),
  initializeLocalCategories: (categories) =>
    set((state) => ({
      localCategories: state.localCategories ?? categories
    })),
  initializeLocalSubscriptions: (subscriptions) =>
    set((state) => ({
      localSubscriptions: state.localSubscriptions ?? subscriptions
    })),
  initializeLocalSavingsGoals: (goals) =>
    set((state) => ({
      localSavingsGoals: state.localSavingsGoals ?? goals
    })),
  openComposer: () => set({ isComposerOpen: true }),
  resetUserState: () =>
    set({
      animationsEnabled: true,
      deletedTransactionIds: [],
      draftTransactions: [],
      isComposerOpen: false,
      localBudgets: null,
      localCategories: null,
      localSettings: null,
      localSavingsGoals: null,
      localSubscriptions: null,
      theme: "light"
    }),
  setAnimationsEnabled: (animationsEnabled) =>
    set((state) => state.animationsEnabled === animationsEnabled ? state : { animationsEnabled }),
  setLocalSettings: (settings) =>
    set({
      animationsEnabled: settings.animationsEnabled,
      localSettings: settings,
      theme: settings.theme
    }),
  setTheme: (theme) =>
    set((state) => state.theme === theme ? state : { theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light"
    })),
  updateLocalBudget: (budget) =>
    set((state) => ({
      localBudgets: (state.localBudgets ?? []).map((item) =>
        item.id === budget.id ? budget : item
      )
    })),
  updateLocalCategory: (category) =>
    set((state) => ({
      localCategories: (state.localCategories ?? []).map((item) =>
        item.id === category.id ? category : item
      )
    })),
  updateLocalSubscription: (subscription) =>
    set((state) => ({
      localSubscriptions: (state.localSubscriptions ?? []).map((item) =>
        item.id === subscription.id ? subscription : item
      )
    })),
  updateLocalSavingsGoal: (goal) =>
    set((state) => ({
      localSavingsGoals: (state.localSavingsGoals ?? []).map((item) =>
        item.id === goal.id ? goal : item
      )
    })),
  updateTransaction: (transaction) =>
    set((state) => {
      const draftIndex = state.draftTransactions.findIndex((item) => item.id === transaction.id);

      if (draftIndex >= 0) {
        const nextDraftTransactions = [...state.draftTransactions];
        nextDraftTransactions[draftIndex] = transaction;

        return {
          deletedTransactionIds: state.deletedTransactionIds.filter((id) => id !== transaction.id),
          draftTransactions: nextDraftTransactions,
          isComposerOpen: false
        };
      }

      return {
        deletedTransactionIds: state.deletedTransactionIds.filter((id) => id !== transaction.id),
        draftTransactions: [transaction, ...state.draftTransactions],
        isComposerOpen: false
      };
    })
}));
