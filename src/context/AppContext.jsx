import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  sosActive: false,
  sosAlertId: null,
  isTracking: false,
  currentLocation: null,
  contacts: [],
  sirenOn: false,
  fakeCallActive: false,
  selectedCaller: null,
  installPrompt: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SOS':          return { ...state, sosActive: action.payload, sosAlertId: action.alertId ?? state.sosAlertId };
    case 'SET_TRACKING':     return { ...state, isTracking: action.payload };
    case 'SET_LOCATION':     return { ...state, currentLocation: action.payload };
    case 'SET_CONTACTS':     return { ...state, contacts: action.payload };
    case 'SET_SIREN':        return { ...state, sirenOn: action.payload };
    case 'SET_FAKE_CALL':    return { ...state, fakeCallActive: action.payload };
    case 'SET_CALLER':       return { ...state, selectedCaller: action.payload };
    case 'SET_INSTALL_PROMPT': return { ...state, installPrompt: action.payload };
    default:                 return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const activateSOS = useCallback((alertId = null) => {
    dispatch({ type: 'SET_SOS', payload: true, alertId });
  }, []);

  const deactivateSOS = useCallback(() => {
    dispatch({ type: 'SET_SOS', payload: false, alertId: null });
  }, []);

  const setLocation = useCallback((coords) => {
    dispatch({ type: 'SET_LOCATION', payload: coords });
  }, []);

  const setTracking = useCallback((val) => {
    dispatch({ type: 'SET_TRACKING', payload: val });
  }, []);

  const setContacts = useCallback((contacts) => {
    dispatch({ type: 'SET_CONTACTS', payload: contacts });
  }, []);

  const toggleSiren = useCallback((val) => {
    dispatch({ type: 'SET_SIREN', payload: val });
  }, []);

  const setFakeCall = useCallback((val) => {
    dispatch({ type: 'SET_FAKE_CALL', payload: val });
  }, []);

  const setSelectedCaller = useCallback((caller) => {
    dispatch({ type: 'SET_CALLER', payload: caller });
  }, []);

  const setInstallPrompt = useCallback((prompt) => {
    dispatch({ type: 'SET_INSTALL_PROMPT', payload: prompt });
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      activateSOS, deactivateSOS,
      setLocation, setTracking,
      setContacts, toggleSiren,
      setFakeCall, setSelectedCaller,
      setInstallPrompt,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
