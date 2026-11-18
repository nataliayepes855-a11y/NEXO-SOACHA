
import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface PerfilPublicoBD {
  id: string;
  nombre: string;
  foto_url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilesPublicosService {

  private supabase = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey
  );

  async obtenerPerfiles(
    usuariosIds: string[]
  ): Promise<PerfilPublicoBD[]> {

    const ids = [...new Set(
      usuariosIds.filter(
        (id) => typeof id === 'string' && id.length > 0
      )
    )];

    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, nombre, foto_url')
      .in('id', ids);

    if (error) {
      console.error(
        'Error consultando perfiles:',
        error.message
      );
      throw error;
    }

    return (data ?? []) as PerfilPublicoBD[];
  }
}
