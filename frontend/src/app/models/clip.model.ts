export interface Clip {
    id: number;
    user_id: number;
    filename: string;
    file_path: string;
    thumbnail_path: string | null;
    title: string;
    description: string | null;
    uploaded_at: string;
    file_size: number;
    duration: number;
    username: string;
    likes: number;
    user_has_liked: boolean
    private: boolean
}

export interface ClipUploadRequest {
    title: string;
    description?: string;
    file: File;
}

export interface ClipLikeResponse {
    likes: number;
    user_has_liked: boolean
}

export interface ClipUpdate {
    title?: string;
    description?: string;
    private?: boolean
}