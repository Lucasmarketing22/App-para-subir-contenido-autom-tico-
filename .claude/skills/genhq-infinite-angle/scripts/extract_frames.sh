#!/usr/bin/env bash
# Extract timestamped frames from a video.
# Usage: extract_frames.sh <video> <out_dir> <fps> [start_sec] [end_sec]
# Output names encode the time in seconds: t_03.25.jpg = 3.25 s.
# (Rebuilt for this repo: the original script was not included in the shared SKILL.md.)
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: $0 <video> <out_dir> <fps> [start_sec] [end_sec]" >&2
  exit 1
fi

video="$1"; out="$2"; fps="$3"; start="${4:-0}"; end="${5:-}"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
mkdir -p "$out"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

args=(-hide_banner -loglevel error -ss "$start")
[ -n "$end" ] && args+=(-to "$end")
ffmpeg "${args[@]}" -i "$video" -vf "fps=${fps},scale='min(960,iw)':-2" -q:v 3 "$tmp/f_%06d.jpg"

# Frame n (1-based) with fps filter is centred at start + (n-1)/fps.
for f in "$tmp"/f_*.jpg; do
  n=$((10#$(basename "$f" .jpg | sed 's/^f_//')))
  t=$(awk -v s="$start" -v n="$n" -v r="$fps" 'BEGIN{printf "%05.2f", s + (n-1)/r}')
  mv "$f" "$out/t_${t}.jpg"
done

echo "$(ls "$out" | wc -l) frames -> $out"
