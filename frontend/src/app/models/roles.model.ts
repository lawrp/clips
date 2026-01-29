

export enum UserRole {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
    USER = 'user',
    GUEST = 'guest'
}

export interface AdminStats {
    total_users: number;
    pending_approvals: number;
    approved_users: number;
    total_videos: number;
    total_comments: number;
    admins: number;
    moderators: number;
}

export interface UserRoleUpdate {
    role: UserRole
}

export interface UserApprovalUpdate {
    approved: boolean;
}