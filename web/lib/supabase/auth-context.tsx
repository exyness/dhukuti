"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "./browser";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type Web3Credentials = Parameters<SupabaseBrowserClient["auth"]["signInWithWeb3"]>[0];
type SupabaseSolanaWallet = NonNullable<
  Extract<Web3Credentials, { chain: "solana" }> extends infer Credentials
    ? Credentials extends { wallet?: infer Wallet }
      ? Wallet
      : never
    : never
>;
type SupabaseSolanaSignIn = NonNullable<SupabaseSolanaWallet["signIn"]>;

type Web3AuthStatus = "authenticated" | "authenticating" | "idle" | "loading";

type SupabaseAuthContextValue = {
  error: string;
  session: Session | null;
  signInWithWallet: () => Promise<void>;
  signOut: () => Promise<void>;
  status: Web3AuthStatus;
  userWallet: string | null;
};

const SIGN_IN_STATEMENT =
  "Sign in to Dhukuti to manage circles, member state, and wallet-scoped sessions.";

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Web3AuthStatus>("loading");
  const autoSignAttemptedWalletRef = useRef<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const walletAddress = wallet.publicKey?.toBase58() ?? null;
  const userWallet = getSessionWallet(session);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "idle");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "idle");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session || !walletAddress || !userWallet || userWallet === walletAddress) {
      return;
    }

    void supabase.auth.signOut();
  }, [session, supabase, userWallet, walletAddress]);

  const signInWithWallet = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Connect a Solana wallet before signing in.");
    }

    if (!wallet.signIn && !wallet.signMessage) {
      throw new Error("The connected wallet does not support message signing.");
    }

    setError("");
    setStatus("authenticating");

    const { data, error: signInError } = await supabase.auth.signInWithWeb3({
      chain: "solana",
      statement: SIGN_IN_STATEMENT,
      wallet: toSupabaseSolanaWallet(wallet),
    });

    if (signInError) {
      setStatus(session ? "authenticated" : "idle");
      setError(signInError.message);
      throw signInError;
    }

    setSession(data.session);
    setStatus("authenticated");
  }, [session, supabase, wallet]);

  const signOut = useCallback(async () => {
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
    setSession(null);
    setStatus("idle");
  }, [supabase]);

  useEffect(() => {
    if (!walletAddress) {
      autoSignAttemptedWalletRef.current = null;
      return;
    }

    if (
      !wallet.connected ||
      session ||
      status !== "idle" ||
      autoSignAttemptedWalletRef.current === walletAddress
    ) {
      return;
    }

    autoSignAttemptedWalletRef.current = walletAddress;
    void signInWithWallet();
  }, [session, signInWithWallet, status, wallet.connected, walletAddress]);

  const value = useMemo(
    () => ({
      error,
      session,
      signInWithWallet,
      signOut,
      status,
      userWallet,
    }),
    [error, session, signInWithWallet, signOut, status, userWallet],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const value = useContext(SupabaseAuthContext);
  if (!value) {
    throw new Error("useSupabaseAuth must be used inside SupabaseAuthProvider.");
  }
  return value;
}

function toSupabaseSolanaWallet(wallet: ReturnType<typeof useWallet>): SupabaseSolanaWallet {
  const supabaseWallet: SupabaseSolanaWallet = {
    publicKey: wallet.publicKey,
    signMessage: wallet.signMessage,
  };

  if (wallet.signIn) {
    supabaseWallet.signIn = async (...inputs: Parameters<SupabaseSolanaSignIn>) => {
      const output = await wallet.signIn?.(
        inputs[0] as Parameters<NonNullable<typeof wallet.signIn>>[0],
      );

      return output as Awaited<ReturnType<SupabaseSolanaSignIn>>;
    };
  }

  return supabaseWallet;
}

function getSessionWallet(session: Session | null) {
  const identity = session?.user.identities?.find((item) => item.provider === "web3");
  const identityWallet = getMetadataWallet(identity?.identity_data);
  if (identityWallet) return identityWallet;

  return getMetadataWallet(session?.user.user_metadata);
}

function getMetadataWallet(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  const candidates = [
    record.address,
    record.wallet_address,
    record.wallet,
    record.sub,
    record.provider_id,
  ];

  return candidates.find((value): value is string => typeof value === "string") ?? null;
}
