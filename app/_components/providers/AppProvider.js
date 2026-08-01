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
import { getPrivateKey, getSpaceKey, saveSpaceKey } from '@lib/keyStore';
import { createUserKeyring } from '@lib/keyring';
import { generateSpaceKey, importPublicKey, unwrapSpaceKey, wrapSpaceKey } from '@lib/crypto';
import { byteaToBase64 } from '@lib/supabase/binary';
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
  const [privateKey, setPrivateKey] = useState(null);
  const [keyConfigured, setKeyConfigured] = useState(null);
  const [authLoading, setAuthLoading] = useState(configured);
  const [offlineSession, setOfflineSession] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [activeSpaceId, setActiveSpaceIdState] = useState(null);
  const [spaceKeys, setSpaceKeys] = useState({});
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [localContextReady, setLocalContextReady] = useState(false);
  const localInitialization = useRef({ key: null, promise: null });

  const loadProfile = useCallback(
    async currentUser => {
      const [profileResult, publicKeyResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase
          .from('user_public_keys')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .maybeSingle(),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (publicKeyResult.error) throw publicKeyResult.error;

      setProfile(profileResult.data ?? null);
      const hasPublicKey = Boolean(publicKeyResult.data);
      setKeyConfigured(hasPublicKey);
      setPrivateKey(hasPublicKey ? await getPrivateKey(currentUser.id) : null);
    },
    [supabase]
  );

  const loadSpaces = useCallback(
    async (currentUser, showLoading = true) => {
      if (!supabase || !currentUser) return;
      if (showLoading) setSpacesLoading(true);
      try {
        const { data, error } = await supabase
          .from('space_members')
          .select('role,status,spaces(*)')
          .eq('user_id', currentUser.id)
          .eq('status', 'active');
        if (!error) {
          const nextSpaces = (data ?? []).map(row => ({ ...row.spaces, role: row.role }));
          setSpaces(nextSpaces);
          const stored = window.localStorage.getItem(`activeSpace:${currentUser.id}`);
          const nextActive = nextSpaces.some(space => space.id === stored)
            ? stored
            : (nextSpaces[0]?.id ?? null);
          setActiveSpaceIdState(nextActive);
        }
      } finally {
        if (showLoading) setSpacesLoading(false);
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
        setPrivateKey(null);
        setKeyConfigured(null);
        setSpaces([]);
        setActiveSpaceIdState(null);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadProfile, loadSpaces]);

  useEffect(() => {
    const loadActiveKey = async () => {
      if (!user || !privateKey || !activeSpaceId) return;
      const activeSpace = spaces.find(space => space.id === activeSpaceId);
      if (!activeSpace) return;
      const cached = await getSpaceKey(user.id, activeSpaceId, activeSpace.current_key_version);
      if (cached) {
        setSpaceKeys(current => ({
          ...current,
          [`${activeSpaceId}:${activeSpace.current_key_version}`]: cached,
        }));
        return;
      }
      const { data } = await supabase
        .from('space_member_keys')
        .select('wrapped_space_key,space_key_version')
        .eq('space_id', activeSpaceId)
        .eq('user_id', user.id)
        .eq('space_key_version', activeSpace.current_key_version)
        .maybeSingle();
      if (data) {
        const key = await unwrapSpaceKey(byteaToBase64(data.wrapped_space_key), privateKey);
        await saveSpaceKey(user.id, activeSpaceId, data.space_key_version, key);
        setSpaceKeys(current => ({
          ...current,
          [`${activeSpaceId}:${data.space_key_version}`]: key,
        }));
      }
    };
    loadActiveKey().catch(console.error);
  }, [activeSpaceId, privateKey, spaces, supabase, user]);

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

  const setupKeyring = useCallback(async () => {
    const result = await createUserKeyring(supabase, user);
    setPrivateKey(result.privateKey);
    setKeyConfigured(true);
    return result;
  }, [supabase, user]);

  const createSpace = useCallback(
    async name => {
      if (!privateKey || !keyConfigured)
        throw new Error('The encryption key is unavailable on this device.');
      const { data: publicRow, error: publicError } = await supabase
        .from('user_public_keys')
        .select('public_key_jwk')
        .eq('user_id', user.id)
        .single();
      if (publicError) throw publicError;
      const spaceKey = await generateSpaceKey();
      const publicKey = await importPublicKey(publicRow.public_key_jwk);
      const wrapped = await wrapSpaceKey(spaceKey, publicKey);
      const { data, error } = await supabase.rpc('create_space', {
        space_name: name,
        owner_wrapped_key_base64: wrapped,
      });
      if (error) throw error;
      const keyVersion = data.current_key_version ?? 1;
      await saveSpaceKey(user.id, data.id, keyVersion, spaceKey);
      const createdSpace = { ...data, role: 'admin' };
      setSpaces(current => [createdSpace, ...current.filter(space => space.id !== data.id)]);
      setActiveSpaceIdState(data.id);
      setSpaceKeys(current => ({ ...current, [`${data.id}:${keyVersion}`]: spaceKey }));
      window.localStorage.setItem(`activeSpace:${user.id}`, data.id);
      loadSpaces(user, false).catch(console.error);
      return createdSpace;
    },
    [keyConfigured, loadSpaces, privateKey, supabase, user]
  );

  const setActiveSpaceId = useCallback(
    spaceId => {
      setActiveSpaceIdState(spaceId);
      if (user) window.localStorage.setItem(`activeSpace:${user.id}`, spaceId);
    },
    [user]
  );

  const activeSpace = spaces.find(space => space.id === activeSpaceId) ?? null;
  const activeSpaceKey = activeSpace
    ? (spaceKeys[`${activeSpace.id}:${activeSpace.current_key_version}`] ?? null)
    : null;

  const syncNow = useCallback(async () => {
    if (!user || !activeSpace || !activeSpaceKey || !localContextReady || offlineSession) return;
    setSyncStatus('syncing');
    try {
      await syncSpace({ supabase, user, space: activeSpace, spaceKey: activeSpaceKey });
      setPendingCount((await db.getPendingMutations(user.id, activeSpace.id)).length);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      throw error;
    }
  }, [activeSpace, activeSpaceKey, localContextReady, offlineSession, supabase, user]);

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
          if (activeSpace.role === 'admin') await db.seedCategories(getCategories());
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
    if (!activeSpaceKey || !localContextReady || !navigator.onLine) return;
    syncNow().catch(() => {});
    const handleOnline = () => syncNow().catch(() => {});
    const handleFocus = () => navigator.onLine && syncNow().catch(() => {});
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeSpaceKey, localContextReady, syncNow]);

  const authValue = {
    configured,
    supabase,
    user,
    profile,
    privateKey,
    keyConfigured,
    authLoading,
    offlineSession,
    signInWithGoogle,
    signOut,
    setupKeyring,
    refreshProfile: () => user && loadProfile(user),
  };
  const spaceValue = {
    spaces,
    activeSpace,
    activeSpaceId,
    activeSpaceKey,
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
