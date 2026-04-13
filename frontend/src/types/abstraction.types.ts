export type DirectlyFollowsRelation = [from: string, to: string];

export interface OCLanguageAbstraction {
    convergent_ev_type_per_ob_type: Record<string, string[]>;
    deficient_ev_type_per_ob_type: Record<string, string[]>;
    directly_follows_ev_types_per_ob_type: Record<string, DirectlyFollowsRelation[]>;
    divergent_ev_type_per_ob_type: Record<string, string[]>;
    end_ev_type_per_ob_type: Record<string, string[]>;
    ident: unknown[];
    optional_ev_type_per_ob_type: Record<string, string[]>;
    related_ev_type_per_ob_type: Record<string, string[]>;
    start_ev_type_per_ob_type: Record<string, string[]>;
}
