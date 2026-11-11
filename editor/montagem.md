# Montagem do fluxo de edição

Fase atual: 2 (entrevista) · Atualizado em 2026-11-10

## Ambiente
- 100% nube: Claude Code web/app, contenedor efímero (nada local).
- Sistema: Linux · Python 3.13 · FFmpeg 6.1 · Node.js 22 · Git 2.43 · GPU: no (4 CPU, 15 GB RAM)
- Persistencia: todo lo que deba sobrevivir se guarda y se sube a este repo
  (skills en `.claude/skills/`, herramientas/perfil/scripts en `editor/`).
- Conectores disponibles: ElevenLabs (transcripción), Google Drive (entrada/entrega),
  Upload-Post (publicación automática), HyperFrames (motion, ya en el repo), Higgsfield/Canva.
- Instalado en esta montagem: skill genhq-infinite-angle (+ script extract_frames.sh probado).

## Decisiones
- Revisión: video terminado (sin programa de edición). Render en la nube y ajustes por chat.
- Objetivo: edición lo más automática posible; luego entrega a clientes y/o publicación automática.
- Tipo y formato: marca personal (persona hablando a cámara). ENTRADA: videos completos en crudo de la empresa. SALIDA: clips cortos SOLO VERTICAL 9:16, ~60 s cada uno como referencia; cantidad y duración las decide Claude según el material (se corrige con feedback). Prioridad absoluta: calidad, nada mal editado.
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
Prueba comparativa: falta el clip crudo (1–3 min) y 3–5 referencias de estilo. Skill genhq-infinite-angle instalada (multicámara opcional vía Higgsfield/Seedance).

## Prueba comparativa 1 — "como combinar" (Cuadro Barcelona, 2026-11-11)
- Crudo: 1:38, 4K HEVC vertical 25 fps. Toma buena 0:39–0:95. Sin música/SFX (carpeta de audios vacía).
- A (Claude: faster-whisper medium + render_clip.py): 52 s, 1080x1920, 12 segmentos, zooms 1.0/1.15/1.35,
  subtítulos 3 palabras con palabras clave en color, -15.6 LUFS.
- B (Descript create_social_clips): 49 s, 720x1280 con marca de agua "descript" (plan actual),
  subtítulos largos (3 líneas) con resaltado karaoke, no pudo colorear palabras clave, -17.8 LUFS, 27 créditos IA.
- Proyecto Descript: https://web.descript.com/96708bb5-bb70-4751-8354-90d16ca2d2b8
- Pendiente: veredicto del usuario.
- Scripts nuevos: editor/scripts/transcribir.py, editor/scripts/render_clip.py (plan de ejemplo en editor/ejemplo_plan_como-combinar.json).
