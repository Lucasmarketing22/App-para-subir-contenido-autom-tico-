# Montagem do fluxo de edição

Fase atual: 2 (entrevista) · Atualizado em 2026-11-10

## Ambiente
- 100% nube: Claude Code web/app, contenedor efímero (nada local).
- Sistema: Linux · Python 3.13 · FFmpeg 6.1 · Node.js 22 · Git 2.43 · GPU: no (4 CPU, 15 GB RAM)
- Persistencia: todo lo que deba sobrevivir se guarda y se sube a este repo
  (skills en `.claude/skills/`, herramientas/perfil/scripts en `editor/`).
- Conectores disponibles: ElevenLabs (transcripción), Google Drive (entrada/entrega),
  Upload-Post (publicación automática), HyperFrames (motion, ya en el repo), Higgsfield/Canva.
- Instalado en esta montagem: nada todavía.

## Decisiones
- Revisión: video terminado (sin programa de edición). Render en la nube y ajustes por chat.
- Objetivo: edición lo más automática posible; luego entrega a clientes y/o publicación automática.
- Tipo y formato: marca personal (persona hablando a cámara). ENTRADA: videos completos en crudo (largos) de la empresa. SALIDA: videos cortos (clips de los mejores momentos) como entrega de prueba para el cliente. Formatos: vertical 9:16 (y horizontal 16:9 para YouTube si se pide).
- Cliente: el material crudo lo envía la empresa que contrata; los videos son para ella (un perfil de estilo por cliente).
- Editor: todo pasa por Claude. Prueba comparativa con el mismo clip crudo: (A) edición propia
  FFmpeg + HyperFrames vs. (B) Descript (conector conectado y verificado el 2026-11-10; Agent Underlord edita por instrucciones; exporta FCPXML/Premiere/DaVinci XML; publica con enlace de descarga). Se elige el mejor o un híbrido.
- Meta de calidad: edición profesional, no "automática genérica".
- Pastas: ferramentas `editor/` en este repo; projeto <pendiente>
- Transcrição: probablemente ElevenLabs (nube, tiempo por palabra) — <confirmar>
- Notas faladas: <pendiente>
- Animação: <pendiente>
- Câmera: <pendiente>
- Som: Epidemic Sound. El usuario descarga a mano y sube a Drive "Audios para Claude" (subcarpetas por categoría). Sin conector MCP por ahora. Licencia: plan Personal no cubre clientes; Pro/Business según uso (confirmar si habrá anuncios pagados).
- Revisões: <pendiente>
- Entrega/publicação: <pendiente>
- Nomes: prefixo <…>; skill mestra /<…>

## Perfil
- Referencias: Drive "INSPIRACION" = motion graphics (ya existe). El usuario creará una carpeta nueva de referencias de marca personal (sugerido: "INSPIRACION MARCA PERSONAL").

## Fluxo aprovado
<pendiente>

## Skills escritas
- [ ] regras comuns

## Próximo passo
Prueba comparativa: falta el clip crudo (1–3 min) y 3–5 referencias de estilo. Pendiente: cuántos clips por video, duración y formatos.
