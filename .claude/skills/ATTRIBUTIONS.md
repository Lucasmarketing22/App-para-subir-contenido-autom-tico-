# Skills incluidas — atribución y licencias

Estas skills fueron instaladas desde proyectos de código abierto de terceros.
Todas se distribuyen bajo licencia **MIT**; se conservan sus archivos de licencia.

| Skill(s) | Proyecto | Repositorio | Versión | Licencia |
|---|---|---|---|---|
| `cast`, `paint` + `genjutsu/_jutsu/*` (15 sub-skills) | genjutsu (AThevon) | https://github.com/AThevon/genjutsu | 3.3.0 | MIT (`genjutsu/LICENSE`) |
| `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`, `gsap-performance` | gsap-skills (GreenSock) | https://github.com/greensock/gsap-skills | 1.0.0 | MIT (`gsap-skills-LICENSE`) |
| `design-dna` | design-dna (zanwei) | https://github.com/zanwei/design-dna | — | MIT (`design-dna/LICENSE`) |

## Notas de instalación

- **genjutsu** es originalmente un *plugin* con orquestadores (`cast`, `paint`) que
  cargan sub-skills internas ubicadas en `genjutsu/_jutsu/`. Los orquestadores
  resuelven esa carpeta automáticamente sondeando `*/.claude/skills/*/_jutsu`, por lo
  que la estructura debe mantenerse: no muevas ni renombres `genjutsu/_jutsu/`.
  Las sub-skills llevan prefijo `_` porque son internas y no se invocan directamente.
- **gsap-skills** se instaló aplanando sus 8 skills a nivel superior para que cada una
  se descubra de forma independiente.
- **design-dna** conserva sus carpetas `references/` y `docs/` (rutas relativas usadas
  por la skill).

Instaladas el 2026-08-25.

## fish-audio (agregada aparte)

`fish-audio/` es una skill escrita a medida a partir de la **referencia pública de la API de Fish Audio**
(https://docs.fish.audio), no un repo de terceros empaquetado. Lee la clave desde la variable de entorno
`FISH_AUDIO_API_KEY` — nunca contiene ni debe contener la clave. Añadida el 2026-08-26.

## hyperframes (HeyGen) — 20 skills

Instaladas desde https://github.com/heygen-com/hyperframes (Apache-2.0, v0.8.15).
Se extrajeron solo las skills de usuario de `skills/` (router `hyperframes` + skills de
dominio + workflows), aplanadas como hermanas para preservar sus referencias `../../<skill>/`.
NO se instaló el `.claude/settings.json` del repo (define hooks pre-commit) ni el monorepo
(`packages/`, 202MB). Para renderizar video, las skills usan el CLI `npx hyperframes`
(paquete npm, requiere red). Licencia en `hyperframes-LICENSE`. Añadidas el 2026-08-27.
