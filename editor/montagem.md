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
- Tipo y formato: marca personal (persona hablando a cámara, estilo creador). Horizontal 16:9 para YouTube + vertical 9:16.
- Cliente: el material crudo lo envía la empresa que contrata; los videos son para ella (un perfil de estilo por cliente).
- Editor: todo pasa por Claude. Prueba comparativa con el mismo clip crudo: (A) edición propia
  FFmpeg + HyperFrames vs. (B) Descript (conector, a conectar por el usuario). Se elige el mejor o un híbrido.
- Meta de calidad: edición profesional, no "automática genérica".
- Pastas: ferramentas `editor/` en este repo; projeto <pendiente>
- Transcrição: probablemente ElevenLabs (nube, tiempo por palabra) — <confirmar>
- Notas faladas: <pendiente>
- Animação: <pendiente>
- Câmera: <pendiente>
- Som: <pendiente>
- Revisões: <pendiente>
- Entrega/publicação: <pendiente>
- Nomes: prefixo <…>; skill mestra /<…>

## Perfil
- <pendiente>

## Fluxo aprovado
<pendiente>

## Skills escritas
- [ ] regras comuns

## Próximo passo
Decisión 2: tipo de video, formato, duración y origen del material.
