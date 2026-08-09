'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@lib/supabase/client';
import { isSupabaseConfigured } from '@lib/supabase/config';
import { db } from '@lib/db';
import { syncSpace } from '@lib/sync';
import { getCategories } from '@lib/seeder';

const AuthContext = createContext(null);
const SpaceContext = createContext(null);

export function AppProvider({ children }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(configured);
  const [offlineSession, setOfflineSession] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [activeSpaceId, setActiveSpaceIdState] = useState(null);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [localContextReady, setLocalContextReady] = useState(false);
  const localInitialization = useRef({ key: null, promise: null });
  const newlyCreatedSpaceIds = useRef(new Set());
  const spacesRequest = useRef(0);

  const loadProfile = useCallback(
    async currentUser => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data ?? null);
    },
    [supabase]
  );

  const loadSpaces = useCallback(
    async (currentUser, showLoading = true) => {
      if (!supabase || !currentUser) return;
      const requestId = ++spacesRequest.current;
      if (showLoading) setSpacesLoading(true);
      try {
        const { data, error } = await supabase
          .from('space_members')
          .select('role,status,spaces(*)')
          .eq('user_id', currentUser.id)
          .eq('status', 'active');
        if (!error && requestId === spacesRequest.current) {
          const nextSpaces = (data ?? []).map(row => ({ ...row.spaces, role: row.role }));
          setSpaces(nextSpaces);
          const stored = window.localStorage.getItem(`activeSpace:${currentUser.id}`);
          const nextActive = nextSpaces.some(space => space.id === stored)
            ? stored
            : (nextSpaces[0]?.id ?? null);
          setActiveSpaceIdState(nextActive);
        }
      } finally {
        if (showLoading && requestId === spacesRequest.current) setSpacesLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const initialize = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = sessionData.session?.user ?? null;
        if (sessionUser) {
          try {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
            setOfflineSession(false);
            window.localStorage.setItem('lastAuthenticatedUser', JSON.stringify(data.user));
            await Promise.all([loadProfile(data.user), loadSpaces(data.user)]);
          } catch {
            setUser(sessionUser);
            setOfflineSession(true);
          }
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        queueMicrotask(() => {
          loadProfile(nextUser);
          loadSpaces(nextUser);
        });
      } else {
        setProfile(null);
        setSpaces([]);
        setActiveSpaceIdState(null);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadProfile, loadSpaces]);

  const signInWithGoogle = useCallback(
    async (next = '/home') => {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, scopes: 'openid email profile' },
      });
      if (error) throw error;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
  }, [supabase]);

  const createSpace = useCallback(
    async name => {
      const { data, error } = await supabase.rpc('create_space', {
        space_name: name,
      });
      if (error) throw error;
      spacesRequest.current += 1;
      const createdSpace = { ...data, role: 'admin' };
      newlyCreatedSpaceIds.current.add(data.id);
      setSpaces(current => [createdSpace, ...current.filter(space => space.id !== data.id)]);
      setActiveSpaceIdState(data.id);
      setSpacesLoading(false);
      window.localStorage.setItem(`activeSpace:${user.id}`, data.id);
      return createdSpace;
    },
    [supabase, user]
  );

  const setActiveSpaceId = useCallback(
    spaceId => {
      setActiveSpaceIdState(spaceId);
      if (user) window.localStorage.setItem(`activeSpace:${user.id}`, spaceId);
    },
    [user]
  );

  const activeSpace = spaces.find(space => space.id === activeSpaceId) ?? null;

  const syncNow = useCallback(async () => {
    if (!user || !activeSpace || !localContextReady || offlineSession) return;
    setSyncStatus('syncing');
    try {
      await syncSpace({ supabase, user, space: activeSpace });
      setPendingCount((await db.getPendingMutations(user.id, activeSpace.id)).length);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      throw error;
    }
  }, [activeSpace, localContextReady, offlineSession, supabase, user]);

  useEffect(() => {
    let cancelled = false;
    setLocalContextReady(false);
    setSyncStatus('idle');
    if (!user || !activeSpace) return;

    const initializationKey = `${user.id}:${activeSpace.id}:${activeSpace.role}`;
    if (localInitialization.current.key !== initializationKey) {
      localInitialization.current = {
        key: initializationKey,
        promise: (async () => {
          await db.configureContext({
            userId: user.id,
            spaceId: activeSpace.id,
            role: activeSpace.role,
          });
          if (newlyCreatedSpaceIds.current.delete(activeSpace.id)) {
            await db.seedCategories(getCategories());
          }
          return (await db.getPendingMutations(user.id, activeSpace.id)).length;
        })(),
      };
    }

    localInitialization.current.promise
      .then(nextPendingCount => {
        if (cancelled) return;
        setPendingCount(nextPendingCount);
        if (!cancelled) setLocalContextReady(true);
      })
      .catch(error => {
        console.error('Local data initialization failed', error);
        if (!cancelled) setSyncStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [activeSpace, user]);

  useEffect(() => {
    if (!activeSpace || !localContextReady || !navigator.onLine) return;
    syncNow().catch(() => {});
    const handleOnline = () => syncNow().catch(() => {});
    const handleFocus = () => navigator.onLine && syncNow().catch(() => {});
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeSpace, localContextReady, syncNow]);

  const authValue = {
    configured,
    supabase,
    user,
    profile,
    authLoading,
    offlineSession,
    signInWithGoogle,
    signOut,
    refreshProfile: () => user && loadProfile(user),
  };
  const spaceValue = {
    spaces,
    activeSpace,
    activeSpaceId,
    spacesLoading,
    setActiveSpaceId,
    createSpace,
    refreshSpaces: () => user && loadSpaces(user),
    syncStatus,
    pendingCount,
    syncNow,
    canManageSpace: activeSpace?.role === 'admin',
    canWriteTransactions: ['admin', 'collaborator'].includes(activeSpace?.role),
  };

  return (
    <AuthContext.Provider value={authValue}>
      <SpaceContext.Provider value={spaceValue}>{children}</SpaceContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useSpace() {
  return useContext(SpaceContext);
}
