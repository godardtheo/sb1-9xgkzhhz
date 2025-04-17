import { useState, useEffect, createContext, useContext } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Create a context for the app state
interface AppStateContextType {
  appState: AppStateStatus;
}

const AppStateContext = createContext<AppStateContextType>({ 
  appState: AppState.currentState 
});

// Provider component
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ appState }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use the app state
export function useAppState() {
  return useContext(AppStateContext);
} 