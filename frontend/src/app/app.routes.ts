import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Home } from './pages/home/home';
import { authGuard } from './guards/auth-guard';
import { ClipPage } from './pages/clip/clip';
import { Upload } from './pages/upload/upload';
import { guestGuard } from './guards/guest-guard';
import { Profile } from './pages/profile/profile';
import { RecoverPage } from './auth/recover-page/recover-page';
import { ResetPassword } from './auth/reset-password/reset-password';
import { AdminPanel } from './pages/admin-panel/admin-panel';
import { adminGuard } from './guards/admin-guard-guard';

export const routes: Routes = [
    { path: 'login', component: Login, title: 'Login Page', canActivate: [guestGuard] },
    { path: 'register', component: Register, title: 'Register Page', canActivate: [guestGuard] },
    { path: 'recover', component: RecoverPage, title: 'Revovery page', canActivate: [guestGuard] },
    { path: 'reset-password', component: ResetPassword, title: 'Reset Password', canActivate: [guestGuard] },

    { path: 'dashboard', component: Home, title: 'Dashboard', canActivate: [authGuard] },
    { path: 'profile/:username', component: Profile, title: 'My Profile', canActivate: [authGuard]},
    { path: 'clip/:id', component: ClipPage, title: 'Clip'},
    { path: 'upload', component: Upload, title: 'Upload Your Clip', canActivate: [authGuard] },
    { path: 'admin', component: AdminPanel, title: 'Admin Panel', canActivate: [adminGuard] },

    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
