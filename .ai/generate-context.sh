#!/bin/bash
FEATURE=$1
LAYER=$2

if [ -z "$FEATURE" ] || [ -z "$LAYER" ]; then
  echo "Usage: $0 <feature> <backend|frontend>"
  exit 1
fi

# Generate context pack contents
OUTPUT_FILE="/tmp/context_pack.txt"
SUBAGENTS_DIR="SUBAGENTS"
mkdir -p "$SUBAGENTS_DIR"
DEST_FILE="$SUBAGENTS_DIR/context_${FEATURE}_${LAYER}.md"

{
  echo "=== CONTEXT PACK: $FEATURE ($LAYER) ==="
  echo "CONTRACT:"
  cat "shared/contracts/$FEATURE/feature.yaml"

  if [ "$LAYER" = "backend" ]; then
    FILES=$(find back-api/back-* -path "*/$FEATURE/*" -type f)
  else
    FILES=$(find front-* -path "*/$FEATURE/*" -type f)
  fi

  for file in $FILES; do
    echo -e "\n--- $file ---"
    head -n 300 "$file"
  done

  git diff -- $FILES
} > "$OUTPUT_FILE"

cp "$OUTPUT_FILE" "$DEST_FILE"

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < "$OUTPUT_FILE"
  echo "Context pack (size: $(wc -c < "$OUTPUT_FILE") bytes) copied to clipboard!"
elif command -v clip.exe >/dev/null 2>&1; then
  clip.exe < "$OUTPUT_FILE"
  echo "Context pack copied to Windows clipboard."
else
  echo "Context pack written to $OUTPUT_FILE"
fi

echo "Context pack saved to $DEST_FILE"
