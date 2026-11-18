
import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SupabaseService } from './services/supabase.service';

// ==========================================
// GUARD PARA PROTEGER RUTAS PRIVADAS
// ==========================================

const authGuard = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    const usuario =
      await supabaseService.obtenerUsuarioActual();

    if (usuario) {
      return true;
    }

    return router.parseUrl('/auth');

  } catch (error) {
    console.error(
      'Error al verificar la autenticación:',
      error
    );

    return router.parseUrl('/auth');
  }
};

// ==========================================
// RUTAS DE NEXO SOACHA
// ==========================================

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth.page').then(
        (m) => m.AuthPage
      ),
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import(
        './pages/recuperar-contrasena/recuperar-contrasena.page'
      ).then(
        (m) => m.RecuperarContrasenaPage
      ),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then(
        (m) => m.HomePage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'explorar',
    loadComponent: () =>
      import('./pages/explorar/explorar.page').then(
        (m) => m.ExplorarPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'publicar',
    loadComponent: () =>
      import('./pages/publicar/publicar.page').then(
        (m) => m.PublicarPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'chatbot',
    loadComponent: () =>
      import('./pages/chatbot/chatbot.page').then(
        (m) => m.ChatbotPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil.page').then(
        (m) => m.PerfilPage
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
