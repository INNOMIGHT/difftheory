import type {
    CoachingResponse,
    RefreshResponse,
} from "../types/coaching";

import {
    getAuthorizationHeaders,
} from "../auth/session";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL
    ?? "http://127.0.0.1:8000";

export async function getPlayerCoaching(
    riotAccountId: number,
    limit = 10,
): Promise<CoachingResponse> {

    const response = await fetch(
        `${API_BASE_URL}/coaching/riot-account/${riotAccountId}?limit=${limit}`,
        {
            headers: {
                ...getAuthorizationHeaders(),
            },
        },
    );

    if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new Error(
            body?.detail
            ?? "Failed to load DiffTheory coaching profile.",
        );
    }

    return response.json();
}

export async function refreshPlayerCoaching(
    riotAccountId: number,
    limit = 10,
): Promise<RefreshResponse> {

    const response = await fetch(
        `${API_BASE_URL}/coaching/riot-account/${riotAccountId}/refresh?limit=${limit}`,
        {
            method: "POST",
                headers: {
                    ...getAuthorizationHeaders(),
                },
        },
    );

    if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new Error(
            body?.detail
            ?? "DiffTheory could not complete Judgement Day.",
        );
    }

    return response.json();
}


export interface DashboardMatch {
    match_id: string;
    internal_match_id: number;
    game_creation?: number | string | null;
    game_duration?: number | null;
    champion?: string | null;
    role?: string | null;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    analysis_cached: boolean;
    analysis_version?: string | null;
}

export interface DashboardMatchesResponse {
    riot_account_id: number;
    analysis_version: string;
    matches: DashboardMatch[];
}

export async function getPlayerMatches(
    riotAccountId: number,
    limit = 10,
): Promise<DashboardMatchesResponse> {
    const baseUrl =
        import.meta.env.VITE_API_BASE_URL
        ?? "http://127.0.0.1:8000";

    const response = await fetch(
        `${baseUrl}/coaching/riot-account/${riotAccountId}/matches?limit=${limit}`,
        {
            headers: {
                ...getAuthorizationHeaders(),
            },
        },
    );

    if (!response.ok) {
        throw new Error(
            "Unable to load recent matches.",
        );
    }

    return response.json();
}


export interface MatchAnalysis {
    match_id?: string | null;
    participant_id?: number | null;

    champion?: string | null;
    role?: string | null;

    win?: boolean;

    rank?: string | null;

    contextual_interval_count?: number;

    performance?: Record<string, unknown> | null;
    rank_performance?: Record<string, unknown> | null;

    farming_disruptions?: Array<Record<string, unknown>>;
    economy_efficiency?: Record<string, unknown> | null;

    economic_disruptions?: Array<Record<string, unknown>>;
    economic_disruption_analysis?: Record<string, unknown> | null;

    death_patterns?: Record<string, unknown> | null;

    critical_moments?: Array<Record<string, unknown>>;
    positive_moments?: Array<Record<string, unknown>>;

    impact_summary?: Record<string, unknown> | null;

    coaching_signals?: Array<Record<string, unknown>>;

    recommendations?:
        | Array<unknown>
        | Record<string, unknown>
        | null;

    loss_context?: Record<string, unknown> | null;
}


export interface MatchAnalysisResponse {
    riot_account_id: number;
    match_id: string;
    analysis_version: string;
    analysis: MatchAnalysis;
}


export async function getMatchAnalysis(
    riotAccountId: number,
    matchId: string,
): Promise<MatchAnalysisResponse> {
    const baseUrl =
        import.meta.env.VITE_API_BASE_URL
        ?? "http://127.0.0.1:8000";

    const response =
        await fetch(
            `${baseUrl}/coaching/riot-account/${riotAccountId}/matches/${encodeURIComponent(
                matchId,
            )}`,
            {
                headers: {
                    ...getAuthorizationHeaders(),
                },
            },
        );

    if (!response.ok) {
        if (
            response.status === 404
        ) {
            throw new Error(
                "DiffTheory analysis is not cached for this match yet.",
            );
        }

        throw new Error(
            "Unable to load this match analysis.",
        );
    }

    return response.json();
}


export type RankMetricValue = {
    rank: string;
    value: number | null;
};


export type RankMetric = {
    key: string;

    label: string;

    direction:
        | "HIGHER_BETTER"
        | "LOWER_BETTER";

    player_value:
        number
        | null;

    values: RankMetricValue[];

    monotonicity: number;

    direction_changes: number;

    trajectory_confidence: string;
};


export type RankRoleMetrics = {
    player_matches: number;

    metrics: RankMetric[];
};


export type RankMetricsResponse = {
    riot_account_id: number;

    current_rank:
        string
        | null;

    ranks: string[];

    roles: Record<
        string,
        RankRoleMetrics
    >;
};


export async function getRankMetrics(
    riotAccountId: number,
): Promise<RankMetricsResponse> {

    const baseUrl =
        import.meta.env.VITE_API_BASE_URL
        ?? "http://127.0.0.1:8000";


    const response =
        await fetch(
            `${baseUrl}/coaching/riot-account/${riotAccountId}/rank-metrics`,
            {
                headers: {
                    ...getAuthorizationHeaders(),
                },
            },
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "Unable to load rank metrics.",
        );
    }


    return response.json();
}