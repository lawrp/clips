export interface CommentResponse {
    id: number;
    video_id: number;
    commenter_id: number;
    commenter_username: string;
    message: string;
    created_at: string;
    edited_at: string | null;
    parent_comment_id: number | null;
    likes: number;
    dislikes: number;
    reply_count: number;
    is_deleted: boolean;
    user_has_liked: boolean;
    user_has_disliked: boolean;
}

export interface CommentCreate {
    video_id: number;
    message: string;
    parent_comment_id?: number | null;
}

export interface CommentUpdate {
    message: string;
}