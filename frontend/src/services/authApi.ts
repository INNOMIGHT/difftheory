import {
    getAuthorizationHeaders,
} from "../auth/session";


const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL
    ?? "http://127.0.0.1:8000";


export interface BetaUser {
    id: number;
    auth_provider?: string;
}


export interface BetaRiotAccount {
    id: number;
    puuid: string;
    game_name: string;
    tag_line: string;
}


export interface BetaLeagueProfile {
    platform: string;
    region: string;
    summoner_level?: number | null;
    profile_icon_id?: number | null;
}


export interface BetaStartResponse {
    access_token: string;
    token_type: string;

    user: BetaUser;

    riot_account: BetaRiotAccount;

    league_profile:
        BetaLeagueProfile;
}


export interface BetaMeResponse {
    user: BetaUser;

    riot_account:
        BetaRiotAccount | null;

    league_profile:
        BetaLeagueProfile | null;
}


export interface BetaOnboardResponse {
    status: string;

    user_id: number;

    riot_account_id: number;

    game_name: string;
    tag_line: string;

    matches: {
        requested: number;
        found: number;
        saved: number;
        existing: number;
        failed: number;
    };

    analysis?: unknown;
}


async function getErrorMessage(
    response: Response,
    fallback: string,
): Promise<string> {

    const body =
        await response
            .json()
            .catch(
                () => null,
            );

    return (
        body?.detail
        ?? fallback
    );
}


export async function startBetaSession(
    gameName: string,
    tagLine: string,
    platform: string,
): Promise<BetaStartResponse> {

    const response =
        await fetch(
            `${API_BASE_URL}/beta/start`,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify({
                        game_name:
                            gameName,

                        tag_line:
                            tagLine.replace(
                                /^#/,
                                "",
                            ),

                        platform:
                            platform,
                    }),
            },
        );

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "Unable to connect your Riot account.",
            ),
        );
    }

    return response.json();
}


export async function getBetaMe():
    Promise<BetaMeResponse> {

    const response =
        await fetch(
            `${API_BASE_URL}/beta/me`,
            {
                headers: {
                    ...getAuthorizationHeaders(),
                },
            },
        );

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "Your DiffTheory session has expired.",
            ),
        );
    }

    return response.json();
}


export async function onboardBetaUser():
    Promise<BetaOnboardResponse> {

    const response =
        await fetch(
            `${API_BASE_URL}/beta/onboard`,
            {
                method:
                    "POST",

                headers: {
                    ...getAuthorizationHeaders(),
                },
            },
        );

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "DiffTheory could not analyse your recent games.",
            ),
        );
    }

    return response.json();
}


export async function logoutBetaSession():
    Promise<void> {

    const response =
        await fetch(
            `${API_BASE_URL}/beta/logout`,
            {
                method:
                    "POST",

                headers: {
                    ...getAuthorizationHeaders(),
                },
            },
        );

    if (!response.ok) {
        throw new Error(
            "Unable to close the DiffTheory session.",
        );
    }
}