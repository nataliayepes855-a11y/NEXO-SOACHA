
import {
  Component,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonSpinner,
  IonFooter
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  sendOutline,
  homeOutline,
  compassOutline,
  addCircleOutline,
  chatbubblesOutline,
  personCircleOutline,
  chatbubbleEllipsesOutline,
  sparklesOutline,
  refreshOutline
} from 'ionicons/icons';

import { marked } from 'marked';
import DOMPurify from 'dompurify';

import {
  SupabaseService,
  MensajeGemini
} from '../../services/supabase.service';

interface Mensaje {
  remitente: 'usuario' | 'bot';
  texto: string;
  tiempo: string;
  esError?: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonHeader,
    IonToolbar,
    IonIcon,
    IonSpinner,
    IonFooter
  ]
})
export class ChatbotPage {

  @ViewChild(IonContent)
  content!: IonContent;

  mensajeUsuario = '';
  cargandoRespuesta = false;
  errorChat = '';

  preguntasSugeridas: string[] = [
    '¿Qué es NEXO SOACHA?',
    '¿Cómo puedo crear una publicación?',
    '¿Cómo puedo participar en la comunidad?',
    '¿Qué puedo conocer sobre Soacha?'
  ];

  mensajes: Mensaje[] = [
    {
      remitente: 'bot',
      texto:
        '¡Hola! Soy NEXO IA, tu asistente virtual de NEXO SOACHA. ' +
        'Puedo ayudarte a conocer la plataforma, resolver tus dudas ' +
        'y orientarte sobre temas relacionados con nuestro municipio. ' +
        '¿En qué puedo ayudarte hoy?',
      tiempo: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {

    addIcons({
      sendOutline,
      homeOutline,
      compassOutline,
      addCircleOutline,
      chatbubblesOutline,
      personCircleOutline,
      chatbubbleEllipsesOutline,
      sparklesOutline,
      refreshOutline
    });

  }

  // FORMATO SEGURO DE LAS RESPUESTAS DE GEMINI

  formatearMensaje(texto: string): string {

    const html = marked.parse(texto, {
      async: false,
      breaks: true,
      gfm: true
    });

    return DOMPurify.sanitize(html);
  }

  // ENVIAR MENSAJE

  async enviarMensaje(): Promise<void> {

    const texto = this.mensajeUsuario.trim();

    if (!texto || this.cargandoRespuesta) {
      return;
    }

    if (texto.length > 2000) {

      this.errorChat =
        'La pregunta no puede superar los 2000 caracteres.';

      this.cdr.detectChanges();
      return;
    }

    this.errorChat = '';

    const historial: MensajeGemini[] = this.mensajes
      .slice(1)
      .filter(mensaje => !mensaje.esError)
      .slice(-10)
      .map(mensaje => ({
        remitente: mensaje.remitente,
        texto: mensaje.texto
      }));

    this.mensajes.push({
      remitente: 'usuario',
      texto,
      tiempo: this.obtenerHoraActual()
    });

    this.mensajeUsuario = '';
    this.cargandoRespuesta = true;

    // ACTUALIZAR LA INTERFAZ INMEDIATAMENTE
    this.cdr.detectChanges();
    this.scrollToBottom();

    try {

      console.log(
        'NEXO IA: enviando mensaje a Gemini...'
      );

      const respuesta =
        await this.supabaseService.consultarGemini(
          texto,
          historial
        );

      console.log(
        'NEXO IA: respuesta recibida correctamente.'
      );

      this.mensajes.push({
        remitente: 'bot',
        texto: respuesta,
        tiempo: this.obtenerHoraActual()
      });

      // MOSTRAR LA RESPUESTA DE GEMINI
      this.cdr.detectChanges();

    } catch (error) {

      console.error(
        'Error en NEXO IA:',
        error
      );

      this.errorChat =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.';

      this.mensajes.push({
        remitente: 'bot',
        texto:
          'No fue posible obtener una respuesta en este momento. ' +
          'Por favor, intenta nuevamente.',
        tiempo: this.obtenerHoraActual(),
        esError: true
      });

      this.cdr.detectChanges();

    } finally {

      // DESACTIVAR EL INDICADOR DE CARGA
      this.cargandoRespuesta = false;

      // FORZAR ACTUALIZACIÓN DE ANGULAR
      this.cdr.detectChanges();

      this.scrollToBottom();

      console.log(
        'NEXO IA: consulta finalizada.'
      );

    }
  }

  // PREGUNTAS SUGERIDAS

  async seleccionarPregunta(
    pregunta: string
  ): Promise<void> {

    if (this.cargandoRespuesta) {
      return;
    }

    this.mensajeUsuario = pregunta;

    this.cdr.detectChanges();

    await this.enviarMensaje();
  }

  // NUEVA CONVERSACIÓN

  nuevaConversacion(): void {

    if (this.cargandoRespuesta) {
      return;
    }

    this.mensajes = [
      {
        remitente: 'bot',
        texto:
          '¡Hola! Soy NEXO IA. ' +
          'Comencemos una nueva conversación. ' +
          '¿Qué te gustaría saber?',
        tiempo: this.obtenerHoraActual()
      }
    ];

    this.mensajeUsuario = '';
    this.errorChat = '';

    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  // HORA DE LOS MENSAJES

  private obtenerHoraActual(): string {

    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // DESPLAZAMIENTO AUTOMÁTICO

  private scrollToBottom(): void {

    setTimeout(() => {

      if (this.content) {
        void this.content.scrollToBottom(300);
      }

    }, 100);
  }
}
