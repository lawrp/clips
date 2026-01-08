export interface Comment {
    id: number;
    videoId: number;
    commenterId: number;
    message: string;
    created_at: string;
    edited_at?: string;
    likes: number;
    dislikes: number;
    parentCommentId: number | null;
    replyCount?: number;
}