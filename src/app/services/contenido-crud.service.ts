
import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContenidoCrudService {

  private supabase = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        detectSessionInUrl: false
      }
    }
  );

  private async obtenerIdUsuario(): Promise<string> {
    const { data, error } =
      await this.supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error('Debes iniciar sesión.');
    }

    return data.user.id;
  }

  async editarPublicacion(
    id: number,
    contenido: string
  ): Promise<void> {
    const userId = await this.obtenerIdUsuario();
    const texto = contenido.trim();

    if (!texto || texto.length > 2000) {
      throw new Error(
        'La publicación debe tener entre 1 y 2000 caracteres.'
      );
    }

    const { data, error } = await this.supabase
      .from('publicaciones')
      .update({ contenido: texto })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        'No se pudo editar la publicación. Verifica tus permisos.'
      );
    }
  }

  async eliminarPublicacion(id: number): Promise<void> {
    const userId = await this.obtenerIdUsuario();

    const { data, error } = await this.supabase
      .from('publicaciones')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        'No se pudo eliminar la publicación. Verifica tus permisos.'
      );
    }
  }

  async editarComentario(
    id: number,
    contenido: string
  ): Promise<void> {
    const userId = await this.obtenerIdUsuario();
    const texto = contenido.trim();

    if (!texto || texto.length > 1000) {
      throw new Error(
        'El comentario debe tener entre 1 y 1000 caracteres.'
      );
    }

    const { data, error } = await this.supabase
      .from('comentarios')
      .update({ contenido: texto })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        'No se pudo editar el comentario. Verifica tus permisos.'
      );
    }
  }

  async eliminarComentario(id: number): Promise<void> {
    const userId = await this.obtenerIdUsuario();

    const { data, error } = await this.supabase
      .from('comentarios')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        'No se pudo eliminar el comentario. Verifica tus permisos.'
      );
    }
  }
}
