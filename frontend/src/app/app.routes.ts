import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Home } from './pages/home/home';
import { authGuard } from './guards/auth-guard';
import { Clip } from './pages/clip/clip';
import { Upload } from './pages/upload/upload';
import { guestGuard } from './guards/guest-guard';

export const routes: Routes = [
    { path: 'login', component: Login, title: 'Login Page', canActivate: [guestGuard] },
    { path: 'register', component: Register, title: 'Register Page', canActivate: [guestGuard] },


    { path: 'dashboard', component: Home, title: 'Dashboard', canActivate: [authGuard] },
    { path: 'profile/:username', component: Home, title: 'My Profile', canActivate: [authGuard] },
    { path: 'clip/:id', component: Clip, title: 'Clip'},
    { path: 'upload', component: Upload, title: 'Upload Your Clip', canActivate: [authGuard] },


    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
