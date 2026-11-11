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
- marca-personal: perfil inicial escrito el 2026-11-11 desde 6 refs (editor/perfis/marca-personal). Pendiente confirmación del usuario y color de marca del cliente.

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

## Versión 2 — "como combinar" (2026-11-11)
- Decisiones del usuario: perfil aprobado tal cual (se ajusta con feedback del cliente); subtítulos medianos pero con estilo
  (no "normales"), color de acento amarillo OK; SIN música: el usuario pone audio en tendencia al publicar;
  seguir con edición propia (Descript descartado por marca de agua del plan gratis).
- Multicámara Seedance (genhq-infinite-angle): bloqueado por créditos — Higgsfield plan gratis con 1,37 créditos; 6 s a 1080p = 96 créditos.
  Mientras tanto: "cámaras" simuladas con recortes del 4K (W 1.0 / M 1.3 / C 1.55 descentrado), cambio cada 2–4 s.
- v02: título gancho que se arma palabra a palabra ("¿BLANCO, TINTO / O NARANJA?"), subtítulos 2 palabras Inter Black itálica
  con pop+giro, y=1390; tarjeta amarilla a pantalla completa "TODO DEPENDE DEL COLOR DEL PLATO"; copas de vino animadas
  (blanco/tinto/naranja) junto a la cabeza; -14.7 LUFS. Scripts: render_clip.py (ampliado), graficos.py (nuevo).
- Pendiente: feedback del usuario/cliente sobre v02.
- Motion graphics: HyperFrames CLI v0.9.31 funciona en la nube (npx). Recorte de persona para "texto detrás": editor/scripts/recortar_persona.py
  (MediaPipe selfie_multiclass, requiere `apt-get install libegl1 libgles2` y el modelo en ~/.models). Maquetas de 2 estilos
  (A editorial crema/serif, B llamativo amarillo/negro) en editor/maquetas y perfis/marca-personal/analises/ejemplos_estilos.png. Pendiente elección.
