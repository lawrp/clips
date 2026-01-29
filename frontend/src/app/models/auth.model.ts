import { UserRole } from "./roles.model";

export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    profile_picture_url: string | null;
    role: UserRole;
    approved: boolean;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export type StatusType = 'success' | 'error';

export interface PasswordRequest {
    email: string;
    username: string;
}

export interface PasswordResetRequest {
    token: string;
    new_password: string;
}

export interface ProfilePictureResponse {
    profile_picture_url: string;
    message: string;
}