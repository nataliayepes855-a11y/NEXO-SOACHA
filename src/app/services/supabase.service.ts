
import { Injectable } from '@angular/core';
import {
  createClient,
  type AuthChangeEvent
} from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

// ==========================================
// INTERFACES DE LA BASE DE DATOS
// ==========================================

export interface PublicacionBD {
  id: number;
  user_id: string | null;
  autor: string;
  categoria: string;
  contenido: string;
  imagen_url: string | null;
  created_at: string;
}

export interface ComentarioBD {
  id: number;
  publicacion_id: number;
  user_id: string | null;
  autor: string;
  contenido: string;
  created_at: string;
}

export interface ReaccionBD {
  id: number;
  publicacion_id: number;
  user_id: string;
  created_at: string;
}

export interface MensajeGemini {
  remitente: 'usuario' | 'bot';
  texto: string;
}

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  correo: string;
  foto_url: string | null;
}

// ==========================================
// SERVICIO PRINCIPAL
// ==========================================

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {

  private supabase = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey
  );

  private readonly bucketImagenes =
    'imagenes-publicaciones';

  private readonly bucketPerfiles =
    'fotos-perfil';

  // ==========================================
  // CONTROL DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  private recuperacionAutorizada = false;
  private recuperacionDetectada = false;

  constructor() {

    this.supabase.auth.onAuthStateChange(
      (evento: AuthChangeEvent) => {

        if (evento === 'PASSWORD_RECOVERY') {
          this.recuperacionDetectada = true;
        }

        if (evento === 'SIGNED_OUT') {
          this.recuperacionDetectada = false;
          this.recuperacionAutorizada = false;
        }

      }
    );

  }

  // ==========================================
  // REGISTRO E INICIO DE SESIÓN
  // ==========================================

  async registrarUsuario(
    nombre: string,
    correo: string,
    contrasena: string
  ): Promise<boolean> {

    const { data, error } =
      await this.supabase.auth.signUp({
        email: correo.trim(),
        password: contrasena,
        options: {
          data: {
            display_name: nombre.trim(),
          },
        },
      });

    if (error) {
      console.error(
        'Error al registrar usuario:',
        error.message
      );
      throw error;
    }

    return !data.session;
  }

  async iniciarSesion(
    correo: string,
    contrasena: string
  ): Promise<void> {

    const { error } =
      await this.supabase.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      });

    if (error) {
      console.error(
        'Error al iniciar sesión:',
        error.message
      );
      throw error;
    }
  }

  async cerrarSesion(): Promise<void> {

    const { error } =
      await this.supabase.auth.signOut();

    if (error) {
      console.error(
        'Error al cerrar sesión:',
        error.message
      );
      throw error;
    }
  }

  // ==========================================
  // PUBLICACIONES
  // ==========================================

  async obtenerPublicaciones(): Promise<PublicacionBD[]> {

    const { data, error } = await this.supabase
      .from('publicaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Error al consultar publicaciones:',
        error.message
      );
      throw error;
    }

    return (data ?? []) as PublicacionBD[];
  }

  async obtenerMisPublicaciones(): Promise<PublicacionBD[]> {

    const { data: usuario, error: errorUsuario } =
      await this.supabase.auth.getUser();

    if (errorUsuario || !usuario.user) {
      throw new Error(
        'Debes iniciar sesión para ver tus publicaciones.'
      );
    }

    const { data, error } = await this.supabase
      .from('publicaciones')
      .select('*')
      .eq('user_id', usuario.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Error al consultar mis publicaciones:',
        error.message
      );
      throw error;
    }

    return (data ?? []) as PublicacionBD[];
  }

  // ==========================================
  // SUBIR FOTOGRAFÍA DE PUBLICACIÓN
  // ==========================================

  private async subirImagenPublicacion(
    archivo: File,
    usuarioId: string
  ): Promise<{ url: string; ruta: string }> {

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      throw new Error(
        'Solo se permiten fotografías JPG, PNG o WEBP.'
      );
    }

    const tamanoMaximo = 5 * 1024 * 1024;

    if (archivo.size > tamanoMaximo) {
      throw new Error(
        'La fotografía no puede superar los 5 MB.'
      );
    }

    const extension =
      archivo.type === 'image/png'
        ? 'png'
        : archivo.type === 'image/webp'
          ? 'webp'
          : 'jpg';

    const nombreArchivo =
      `${crypto.randomUUID()}.${extension}`;

    const ruta =
      `${usuarioId}/${nombreArchivo}`;

    // Leer el contenido de la fotografía
const contenidoImagen = await archivo.arrayBuffer();

// Verificar que la fotografía tenga contenido
if (contenidoImagen.byteLength === 0) {
  throw new Error(
    'La fotografía está vacía o no se pudo leer. Selecciona otra imagen.'
  );
}

// Subir la fotografía a Supabase Storage
const { error } =
  await this.supabase.storage
    .from(this.bucketImagenes)
    .upload(ruta, contenidoImagen, {
      contentType: archivo.type,
      upsert: false,
    });

    if (error) {
      console.error(
        'Error al subir fotografía:',
        error.message
      );

      throw new Error(
        'No se pudo subir la fotografía: ' +
        error.message
      );
    }

    const { data } = this.supabase.storage
      .from(this.bucketImagenes)
      .getPublicUrl(ruta);

    return {
      url: data.publicUrl,
      ruta,
    };
  }

  // ==========================================
  // CREAR PUBLICACIÓN
  // ==========================================

  async crearPublicacion(
    categoria: string,
    contenido: string,
    imagen: File | null = null
  ): Promise<PublicacionBD> {

    const {
      data: { user },
      error: errorUsuario,
    } = await this.supabase.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error(
        'Debes iniciar sesión para publicar.'
      );
    }

    const texto = contenido.trim();

    if (!texto) {
      throw new Error(
        'Escribe el contenido de tu publicación.'
      );
    }

    if (texto.length > 2000) {
      throw new Error(
        'La publicación no puede superar los 2000 caracteres.'
      );
    }

    const nombreUsuario =
      user.user_metadata?.['display_name'] ||
      user.email?.split('@')[0] ||
      'Usuario';

    let imagenUrl: string | null = null;
    let rutaImagen: string | null = null;

    try {

      if (imagen) {
        const resultado =
          await this.subirImagenPublicacion(
            imagen,
            user.id
          );

        imagenUrl = resultado.url;
        rutaImagen = resultado.ruta;
      }

      const { data, error } = await this.supabase
        .from('publicaciones')
        .insert({
          user_id: user.id,
          autor: nombreUsuario,
          categoria,
          contenido: texto,
          imagen_url: imagenUrl,
        })
        .select('*')
        .single();

      if (error) {
        console.error(
          'Error al guardar publicación:',
          error.message
        );
        throw error;
      }

      return data as PublicacionBD;

    } catch (error) {

      if (rutaImagen) {

        const { error: errorLimpieza } =
          await this.supabase.storage
            .from(this.bucketImagenes)
            .remove([rutaImagen]);

        if (errorLimpieza) {
          console.error(
            'No se pudo limpiar la imagen:',
            errorLimpieza.message
          );
        }
      }

      throw error;
    }
  }

  // ==========================================
  // COMENTARIOS
  // ==========================================

  async obtenerComentarios(
    publicacionId: number
  ): Promise<ComentarioBD[]> {

    const { data, error } = await this.supabase
      .from('comentarios')
      .select('*')
      .eq('publicacion_id', publicacionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(
        'Error al consultar comentarios:',
        error.message
      );
      throw error;
    }

    return (data ?? []) as ComentarioBD[];
  }

  async crearComentario(
    publicacionId: number,
    contenido: string
  ): Promise<ComentarioBD> {

    const {
      data: { user },
      error: errorUsuario,
    } = await this.supabase.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error(
        'Debes iniciar sesión para comentar.'
      );
    }

    const texto = contenido.trim();

    if (!texto) {
      throw new Error(
        'El comentario no puede estar vacío.'
      );
    }

    if (texto.length > 1000) {
      throw new Error(
        'El comentario no puede superar los 1000 caracteres.'
      );
    }

    const nombreUsuario =
      user.user_metadata?.['display_name'] ||
      user.email?.split('@')[0] ||
      'Usuario';

    const { data, error } = await this.supabase
      .from('comentarios')
      .insert({
        publicacion_id: publicacionId,
        user_id: user.id,
        autor: nombreUsuario,
        contenido: texto,
      })
      .select('*')
      .single();

    if (error) {
      console.error(
        'Error al guardar comentario:',
        error.message
      );
      throw error;
    }

    return data as ComentarioBD;
  }

  // ==========================================
  // REACCIONES (ME GUSTA)
  // ==========================================

  async obtenerUsuarioActualId(): Promise<string | null> {

    const { data, error } =
      await this.supabase.auth.getSession();

    if (error) {
      console.error(
        'Error al consultar la sesión:',
        error.message
      );
      return null;
    }

    return data.session?.user.id ?? null;
  }

  async obtenerReacciones(): Promise<ReaccionBD[]> {

    const { data, error } = await this.supabase
      .from('reacciones')
      .select(
        'id, publicacion_id, user_id, created_at'
      );

    if (error) {
      console.error(
        'Error al consultar reacciones:',
        error.message
      );
      throw error;
    }

    return (data ?? []) as ReaccionBD[];
  }

  async darMeGusta(
    publicacionId: number
  ): Promise<void> {

    const {
      data: { user },
      error: errorUsuario,
    } = await this.supabase.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error(
        'Debes iniciar sesión para dar me gusta.'
      );
    }

    const { error } = await this.supabase
      .from('reacciones')
      .insert({
        publicacion_id: publicacionId,
        user_id: user.id,
      });

    if (error) {
      if (error.code === '23505') {
        return;
      }

      console.error(
        'Error al guardar me gusta:',
        error.message
      );
      throw error;
    }
  }

  async quitarMeGusta(
    publicacionId: number
  ): Promise<void> {

    const {
      data: { user },
      error: errorUsuario,
    } = await this.supabase.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error(
        'Debes iniciar sesión para quitar tu me gusta.'
      );
    }

    const { error } = await this.supabase
      .from('reacciones')
      .delete()
      .eq('publicacion_id', publicacionId)
      .eq('user_id', user.id);

    if (error) {
      console.error(
        'Error al quitar me gusta:',
        error.message
      );
      throw error;
    }
  }

  // ==========================================
  // PERFIL: OBTENER USUARIO
  // ==========================================

  async obtenerUsuarioActual(): Promise<UsuarioPerfil | null> {

    const { data, error } =
      await this.supabase.auth.getUser();

    if (error) {
      console.error(
        'Error al consultar el usuario:',
        error.message
      );
      throw error;
    }

    const user = data.user;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      nombre:
        user.user_metadata?.['display_name'] ||
        user.email?.split('@')[0] ||
        'Usuario',
      correo: user.email ?? '',
      foto_url:
        user.user_metadata?.['avatar_url'] ?? null,
    };
  }

  // ==========================================
  // PERFIL: ACTUALIZAR NOMBRE
  // ==========================================

  async actualizarNombrePerfil(
    nombre: string
  ): Promise<void> {

    const nombreLimpio = nombre.trim();

    if (nombreLimpio.length < 2) {
      throw new Error(
        'El nombre debe tener al menos 2 caracteres.'
      );
    }

    if (nombreLimpio.length > 80) {
      throw new Error(
        'El nombre no puede superar los 80 caracteres.'
      );
    }

    const { data: usuario, error: errorUsuario } =
      await this.supabase.auth.getUser();

    if (errorUsuario || !usuario.user) {
      throw new Error(
        'Debes iniciar sesión para editar tu perfil.'
      );
    }

    const { error } =
      await this.supabase.auth.updateUser({
        data: {
          display_name: nombreLimpio,
        },
      });

    if (error) {
      console.error(
        'Error al actualizar nombre:',
        error.message
      );
      throw error;
    }
  }

  // ==========================================
  // PERFIL: SUBIR O CAMBIAR FOTOGRAFÍA
  // ==========================================

  async actualizarFotoPerfil(
    archivo: File
  ): Promise<string> {

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      throw new Error(
        'La foto debe estar en formato JPG, PNG o WEBP.'
      );
    }

    if (archivo.size > 5 * 1024 * 1024) {
      throw new Error(
        'La foto no puede superar los 5 MB.'
      );
    }

    const {
      data: usuario,
      error: errorUsuario
    } = await this.supabase.auth.getUser();

    if (errorUsuario || !usuario.user) {
      throw new Error(
        'Debes iniciar sesión para cambiar tu foto.'
      );
    }

    const user = usuario.user;

    const fotoAnterior =
      user.user_metadata?.['avatar_url'] as
        string | undefined;

    const extension =
      archivo.type === 'image/png'
        ? 'png'
        : archivo.type === 'image/webp'
          ? 'webp'
          : 'jpg';

    const ruta =
      `${user.id}/${crypto.randomUUID()}.${extension}`;

    // Leer la fotografía antes de enviarla a Supabase
const contenidoFoto = await archivo.arrayBuffer();

if (contenidoFoto.byteLength === 0) {
  throw new Error(
    'La fotografía está vacía o no se pudo leer. Selecciona otra imagen.'
  );
}

// Subir la fotografía a Supabase Storage
const { error: errorSubida } =
  await this.supabase.storage
    .from(this.bucketPerfiles)
    .upload(ruta, contenidoFoto, {
      contentType: archivo.type,
      upsert: false,
    });

    if (errorSubida) {
      console.error(
        'Error al subir foto de perfil:',
        errorSubida
      );

      throw new Error(
        'No se pudo subir la fotografía: ' +
        errorSubida.message
      );
    }

    const { data: urlData } =
      this.supabase.storage
        .from(this.bucketPerfiles)
        .getPublicUrl(ruta);

    const nuevaUrl = urlData.publicUrl;

    const { error: errorActualizacion } =
      await this.supabase.auth.updateUser({
        data: {
          avatar_url: nuevaUrl,
        },
      });

    if (errorActualizacion) {

      await this.supabase.storage
        .from(this.bucketPerfiles)
        .remove([ruta]);

      throw new Error(
        'No se pudo guardar la foto en el perfil: ' +
        errorActualizacion.message
      );
    }

    if (fotoAnterior) {
      try {

        const urlAnterior =
          new URL(fotoAnterior);

        const marcador =
          `/storage/v1/object/public/${this.bucketPerfiles}/`;

        const posicion =
          urlAnterior.pathname.indexOf(marcador);

        if (posicion !== -1) {

          const rutaAnterior =
            decodeURIComponent(
              urlAnterior.pathname.substring(
                posicion + marcador.length
              )
            );

          if (
            rutaAnterior.startsWith(`${user.id}/`) &&
            rutaAnterior !== ruta
          ) {

            const { error: errorLimpieza } =
              await this.supabase.storage
                .from(this.bucketPerfiles)
                .remove([rutaAnterior]);

            if (errorLimpieza) {
              console.warn(
                'No se pudo eliminar la foto anterior:',
                errorLimpieza.message
              );
            }
          }
        }

      } catch (error) {
        console.warn(
          'No se pudo revisar la foto anterior:',
          error
        );
      }
    }

    return nuevaUrl;
  }

  // ==========================================
  // CHATBOT CON GEMINI
  // ==========================================

  async consultarGemini(
    mensaje: string,
    historial: MensajeGemini[] = []
  ): Promise<string> {

    const texto = mensaje.trim();

    if (!texto) {
      throw new Error(
        'Debes escribir una pregunta.'
      );
    }

    if (texto.length > 2000) {
      throw new Error(
        'La pregunta no puede superar los 2000 caracteres.'
      );
    }

    const {
      data: { session },
      error: errorSesion,
    } = await this.supabase.auth.getSession();

    if (errorSesion || !session) {
      throw new Error(
        'Debes iniciar sesión para utilizar el asistente virtual.'
      );
    }

    const { data, error } =
      await this.supabase.functions.invoke(
        'chatbot-gemini',
        {
          body: {
            mensaje: texto,
            historial: historial.slice(-10),
          },
        }
      );

    if (error) {
      console.error(
        'Error al consultar Gemini:',
        error
      );

      throw new Error(
        'No fue posible conectar con el asistente virtual. Intenta nuevamente.'
      );
    }

    if (
      !data ||
      typeof data.respuesta !== 'string' ||
      !data.respuesta.trim()
    ) {
      throw new Error(
        data?.error ||
        'El asistente no devolvió una respuesta válida.'
      );
    }

    return data.respuesta.trim();
  }

  // ==========================================
  // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  async solicitarRecuperacion(
    correo: string
  ): Promise<void> {

    this.recuperacionDetectada = false;
    this.recuperacionAutorizada = false;

    const { error } =
      await this.supabase.auth.resetPasswordForEmail(
        correo.trim(),
        {
          redirectTo:
            window.location.origin +
            '/recuperar-contrasena'
        }
      );

    if (error) {
      console.error(
        'Error al solicitar recuperación:',
        error.message
      );
      throw error;
    }
  }

  // ==========================================
  // VALIDAR ENLACE DE RECUPERACIÓN
  // ==========================================

  async verificarRecuperacion(): Promise<boolean> {

    this.recuperacionAutorizada = false;

    const { error } =
      await this.supabase.auth.initialize();

    if (error) {
      console.error(
        'Error al inicializar recuperación:',
        error.message
      );
      return false;
    }

    if (!this.recuperacionDetectada) {
      return false;
    }

    const { data, error: errorUsuario } =
      await this.supabase.auth.getUser();

    if (errorUsuario || !data.user) {
      return false;
    }

    this.recuperacionAutorizada = true;

    return true;
  }

  // ==========================================
  // CAMBIAR CONTRASEÑA
  // ==========================================

  async cambiarContrasena(
    nuevaContrasena: string
  ): Promise<void> {

    if (!this.recuperacionAutorizada) {
      throw new Error(
        'Debes utilizar un enlace válido de recuperación.'
      );
    }

    if (nuevaContrasena.length < 8) {
      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
    }

    const { error } =
      await this.supabase.auth.updateUser({
        password: nuevaContrasena
      });

    if (error) {
      console.error(
        'Error al cambiar contraseña:',
        error.message
      );
      throw error;
    }

    this.recuperacionAutorizada = false;
    this.recuperacionDetectada = false;

    const { error: errorSalida } =
      await this.supabase.auth.signOut({
        scope: 'local'
      });

    if (errorSalida) {
      console.warn(
        'La contraseña cambió, pero no se pudo cerrar la sesión:',
        errorSalida.message
      );
    }
  }
}
