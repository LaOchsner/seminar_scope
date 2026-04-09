export interface GetCaseNotionsResponse {
    case_ocels_file_id: string;
}

export interface OCEL {
    [key: string]: unknown;
}

export interface CaseOcelResponse {
    origin_file_id_ocel: string;
    case_notion_type: string;
    object_type?: string;
    case_ocels: OCEL[];
}
