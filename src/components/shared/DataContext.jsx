import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseDB } from '@/lib/supabaseClient';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider = ({ children }) => {
  const [cantieri, setCantieri] = useState([]);
  const [imprese, setImprese] = useState([]);
  const [personeEsterne, setPersoneEsterne] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [cantierePermissions, setCantierePermissions] = useState([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastFetch, setLastFetch] = useState({});

  const CACHE_DURATION = 5 * 60 * 1000;
  const loadingRef = useRef(false);

  const shouldRefetch = (key) => {
    if (!lastFetch[key]) return true;
    return Date.now() - lastFetch[key] > CACHE_DURATION;
  };

  const loadUserAndPermissions = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingUser(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setCurrentUser(null);
        setCurrentRole(null);
        setCantierePermissions([]);
        return;
      }

      // Carica profilo con ruolo joinato
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, ruolo:ruoli(id, nome, descrizione, permessi, is_system)')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        // Prova senza il join (in caso il join con ruoli fallisca)
        const { data: profileBasic, error: profileBasicError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileBasicError) {
          // Profilo non ancora creato — fallback con dati minimi dall'auth
          console.warn('Profilo non trovato, uso fallback auth:', profileBasicError.message);
          profile = { id: authUser.id, email: authUser.email, role: 'member', full_name: authUser.email };
        } else {
          profile = profileBasic;
        }
        profileError = null;
      }

      // Carica team e cantieri dei team
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('ruolo_id, team:teams(id, nome, colore, team_cantieri(cantiere_id))')
        .eq('profile_id', authUser.id);

      const teamCantieri = (teamMemberships || []).flatMap(
        tm => tm.team?.team_cantieri?.map(tc => tc.cantiere_id) || []
      );
      const teamIds = (teamMemberships || []).map(tm => tm.team?.id).filter(Boolean);

      // Sincronizza role legacy dal ruolo RBAC (evita dipendenza dal campo DB)
      const ruoloNome = profile.ruolo?.nome?.toLowerCase() || '';
      if (ruoloNome.includes('amministrat') || profile.ruolo?.permessi?.is_admin === true) {
        profile = { ...profile, role: 'admin' };
      }

      const enrichedUser = {
        ...profile,
        full_name: profile.full_name || authUser.email,
        team_ids: teamIds,
        cantieri_assegnati: [
          ...new Set([...(profile.cantieri_assegnati || []), ...teamCantieri])
        ],
      };

      setCurrentUser(enrichedUser);
      setCurrentRole(profile.ruolo || null);
      setCantierePermissions([]);
      setLastFetch(prev => ({ ...prev, user: Date.now() }));

    } catch (e) {
      console.error('Errore loadUserAndPermissions:', e);
      setCurrentUser(null);
      setCurrentRole(null);
    } finally {
      setIsLoadingUser(false);
      loadingRef.current = false;
    }
  }, []);

  // Caricamento dati in background
  const loadBackgroundData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingData(true);
    try {
      if (shouldRefetch('cantieri')) {
        const cantieriData = await supabaseDB.cantieri.getAll();
        setCantieri(cantieriData);
        setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
      }
      if (shouldRefetch('imprese')) {
        const impreseData = await supabaseDB.imprese.getAll();
        setImprese(impreseData);
        setLastFetch(prev => ({ ...prev, imprese: Date.now() }));
      }
    } catch (e) {
      console.error('Errore background data:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  // Carica utente all'avvio e ascolta cambi di sessione
  useEffect(() => {
    loadUserAndPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        loadingRef.current = false;
        loadUserAndPermissions();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) loadBackgroundData();
  }, [currentUser]);

  const refreshData = useCallback(() => {
    setLastFetch({});
    loadBackgroundData();
  }, [loadBackgroundData]);

  const refreshCantieri = useCallback(async () => {
    if (!currentUser) return;
    setLastFetch(prev => ({ ...prev, cantieri: 0 }));
    const cantieriData = await supabaseDB.cantieri.getAll();
    setCantieri(cantieriData);
    setLastFetch(prev => ({ ...prev, cantieri: Date.now() }));
  }, [currentUser]);

  const refreshImprese = useCallback(async () => {
    if (!currentUser) return;
    setLastFetch(prev => ({ ...prev, imprese: 0 }));
    const impreseData = await supabaseDB.imprese.getAll();
    setImprese(impreseData);
    setLastFetch(prev => ({ ...prev, imprese: Date.now() }));
  }, [currentUser]);

  const value = {
    cantieri,
    imprese,
    personeEsterne,
    currentUser,
    currentRole,
    cantierePermissions,
    isLoadingUser,
    isLoading: isLoadingUser,
    isLoadingData,
    refreshData,
    refreshCantieri,
    refreshImprese,
    loadUserAndPermissions,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
