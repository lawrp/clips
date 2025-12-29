export interface Clip {
    id: number;
    user_id: number;
    filename: string;
    file_path: string;
    title: string;
    description: string | null;
    uploaded_at: string;
    file_size: number;
    duration: number | null;
    username: string;
}

export interface ClipUploadRequest {
    title: string;
    description?: string;
    file: File;
}