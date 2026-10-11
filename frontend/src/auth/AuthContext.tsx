import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ReactNode,
} from "react";

import {
    getBetaMe,
    logoutBetaSession,
    onboardBetaUser,
    startBetaSession,
} from "../services/authApi";

import type {
    BetaLeagueProfile,
    BetaOnboardResponse,
    BetaRiotAccount,
    BetaUser,
} from "../services/authApi";

import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from "./session";


export type ConnectStage =
    | "connecting"
    | "analysing";


interface AuthContextValue {
    loading: boolean;

    isAuthenticated: boolean;

    user:
        BetaUser | null;

    riotAccount:
        BetaRiotAccount | null;

    leagueProfile:
        BetaLeagueProfile | null;

    connect: (
        gameName: string,
        tagLine: string,
        platform: string,
        onStage?: (
            stage: ConnectStage,
        ) => void,
    ) => Promise<BetaOnboardResponse>;

    refreshSession:
        () => Promise<void>;

    logout:
        () => Promise<void>;
}


const AuthContext =
    createContext<
        AuthContextValue | undefined
    >(
        undefined,
    );


export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {

    const [
        loading,
        setLoading,
    ] = useState(
        true,
    );

    const [
        user,
        setUser,
    ] = useState<
        BetaUser | null
    >(
        null,
    );

    const [
        riotAccount,
        setRiotAccount,
    ] = useState<
        BetaRiotAccount | null
    >(
        null,
    );

    const [
        leagueProfile,
        setLeagueProfile,
    ] = useState<
        BetaLeagueProfile | null
    >(
        null,
    );


    const clearSessionState =
        useCallback(
            () => {
                clearAccessToken();

                setUser(
                    null,
                );

                setRiotAccount(
                    null,
                );

                setLeagueProfile(
                    null,
                );
            },
            [],
        );


    const refreshSession =
        useCallback(
            async () => {

                const token =
                    getAccessToken();

                if (!token) {
                    setUser(
                        null,
                    );

                    setRiotAccount(
                        null,
                    );

                    setLeagueProfile(
                        null,
                    );

                    return;
                }

                const result =
                    await getBetaMe();

                setUser(
                    result.user,
                );

                setRiotAccount(
                    result.riot_account,
                );

                setLeagueProfile(
                    result.league_profile,
                );
            },
            [],
        );


    useEffect(
        () => {

            let active =
                true;

            async function initialise() {

                try {

                    if (
                        !getAccessToken()
                    ) {
                        return;
                    }

                    const result =
                        await getBetaMe();

                    if (!active) {
                        return;
                    }

                    setUser(
                        result.user,
                    );

                    setRiotAccount(
                        result.riot_account,
                    );

                    setLeagueProfile(
                        result.league_profile,
                    );
                }
                catch {

                    if (
                        active
                    ) {
                        clearSessionState();
                    }
                }
                finally {

                    if (
                        active
                    ) {
                        setLoading(
                            false,
                        );
                    }
                }
            }

            initialise();

            return () => {
                active =
                    false;
            };
        },
        [
            clearSessionState,
        ],
    );


    const connect =
        useCallback(
            async (
                gameName: string,
                tagLine: string,
                platform: string,
                onStage?: (
                    stage: ConnectStage,
                ) => void,
            ) => {

                onStage?.(
                    "connecting",
                );

                const startResult =
                    await startBetaSession(
                        gameName,
                        tagLine,
                        platform,
                    );

                setAccessToken(
                    startResult.access_token,
                );

                setUser(
                    startResult.user,
                );

                setRiotAccount(
                    startResult.riot_account,
                );

                setLeagueProfile(
                    startResult.league_profile,
                );


                onStage?.(
                    "analysing",
                );

                const onboardingResult =
                    await onboardBetaUser();

                await refreshSession();

                return onboardingResult;
            },
            [
                refreshSession,
            ],
        );


    const logout =
        useCallback(
            async () => {

                try {

                    if (
                        getAccessToken()
                    ) {
                        await logoutBetaSession();
                    }
                }
                finally {

                    clearSessionState();
                }
            },
            [
                clearSessionState,
            ],
        );


    const value =
        useMemo<AuthContextValue>(
            () => ({
                loading,

                isAuthenticated:
                    Boolean(
                        user
                        && riotAccount
                    ),

                user,

                riotAccount,

                leagueProfile,

                connect,

                refreshSession,

                logout,
            }),
            [
                loading,
                user,
                riotAccount,
                leagueProfile,
                connect,
                refreshSession,
                logout,
            ],
        );


    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth():
    AuthContextValue {

    const context =
        useContext(
            AuthContext,
        );

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider.",
        );
    }

    return context;
}