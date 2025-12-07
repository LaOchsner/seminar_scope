// TODO: Refine this OCEL interface based on the actual OCEL structure returned by the backend.
export interface OCEL {
    [key: string]: any;
}

export interface CaseOcelResponse {
    origin_file_id_ocel: string;
    case_notion_type: string;
    object_type?: string; // Corresponds to Option<String> with skip_serializing_if = "Option::is_none"
    case_notion_file_id: string;
    case_ocels: OCEL[];
}
