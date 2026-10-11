export interface TrendData {
    direction?: string;
    classification?: string;

    recent_intensity?: number | null;
    older_intensity?: number | null;
    change?: number | null;
}


export interface Priority {
    key?: string;
    theme?: string;

    title?: string;
    category?: string;

    description?: string;
    action?: string;

    score?: number;
    priority_score?: number;

    priority_level?:
        | "VERY_HIGH"
        | "HIGH"
        | "MODERATE"
        | "LOW";

    priority_score_explanation?: string;

    matches_affected?: number;
    affected_matches?: number;

    matches_analyzed?: number;

    frequency?: number;
    average_intensity?: number;

    signal_types?: string[];
    evidence_types?: string[];

    signal_type_count?: number;
    evidence_count?: number;

    examples?: unknown[];
    all_evidence?: unknown[];

    trend?: TrendData | string;
}


export interface Strength {
    key?: string;

    title?: string;
    category?: string;

    score?: number;
    strength_score?: number;

    matches_supported?: number;
    matches_analyzed?: number;

    frequency?: number;
    average_intensity?: number;

    signal_types?: string[];

    evidence_count?: number;

    examples?: unknown[];
    all_evidence?: unknown[];
}


export interface MixedPattern {
    key: string;

    title: string;
    category: string;

    classification: string;

    negative_score: number;
    positive_score: number;

    negative_frequency: number;
    positive_frequency: number;

    negative_matches: number;
    positive_matches: number;

    matches_analyzed: number;

    negative_signal_types?: string[];
    positive_signal_types?: string[];

    negative_examples?: unknown[];
    positive_examples?: unknown[];

    interpretation?: string;
}


export interface RecordSummary {
    wins: number;
    losses: number;
    win_rate: number;
}

export interface CoachingProfile {
    matches_analyzed: number;

    record?: {
        wins: number;
        losses: number;
        win_rate: number;
    };

    top_priorities: Priority[];

    all_priorities: Priority[];

    has_more_priorities?: boolean;

    remaining_priority_count?: number;

    strengths: Strength[];

    mixed_patterns: MixedPattern[];

    category_summary: Record<
        string,
        CategorySummaryItem
    >;

    rank_readiness?: RankReadiness;

    role_breakdown: Record<
        string,
        RoleBreakdownItem
    >;
}


export interface CoachingResponse {
    riot_account_id: number;

    game_name?: string | null;
    tag_line?: string | null;

    rank?: string | null;

    analysis_version: string;

    cached_matches?: number;

    coaching: CoachingProfile;
}


export interface RefreshResponse {
    riot_account_id: number;
    analysis_version: string;
    matches_processed: number;
    generated: number;
    cached: number;
    coaching: CoachingProfile;
}


export interface RankReadinessDriver {
    key: string;
    title: string;

    net: number;
    occurrences: number;
}


export interface RankReadiness {
    score: number | null;

    scale_min: number;
    scale_max: number;

    classification:
        | "BELOW_CURRENT_RANK"
        | "CURRENT_RANK_FIT"
        | "UPWARD_PRESSURE"
        | "STRONG_RANK_UP_READINESS"
        | "INSUFFICIENT_DATA";

    current_rank: string;
    next_rank: string | null;

    summary: string;

    positive_drivers: RankReadinessDriver[];
    negative_drivers: RankReadinessDriver[];

    positive_signal_count: number;
    negative_signal_count: number;

    evidence_count: number;
    matches_analyzed: number;

    confidence:
        | "LOW"
        | "MEDIUM"
        | "HIGH";

    method: string;

    calibrated: boolean;

    disclaimer: string;
}


export interface CategorySummaryItem {
    priority_count: number;
    highest_score: number;
}


export interface RoleRecord {
    wins: number;
    losses: number;
    win_rate: number;
}


export interface RoleBreakdownItem {
    matches_analyzed: number;

    record?: RoleRecord;

    top_priorities?: Priority[];

    strengths?: Strength[];

    mixed_patterns?: MixedPattern[];
}
