#!/bin/bash
FEATURE=$1
LAYER=$2

if [ -z "$FEATURE" ] || [ -z "$LAYER" ]; then
  echo "Usage: $0 <feature> <backend|frontend>"
  exit 1
fi

# Generate context pack for specified feature
echo "=== CONTEXT PACK: $FEATURE ($LAYER) ===" > /tmp/context_pack.txt
echo "CONTRACT:" >> /tmp/context_pack.txt
cat shared/contracts/$FEATURE/feature.yaml >> /tmp/context_pack.txt

# Add relevant files
if [ "$LAYER" = "backend" ]; then
  FILES=$(find back-api/back-* -path "*/$FEATURE/*" -type f)
else
  FILES=$(find front-* -path "*/$FEATURE/*" -type f)
fi

for file in $FILES; do
  echo -e "\n--- $file ---" >> /tmp/context_pack.txt
  head -n 300 $file >> /tmp/context_pack.txt
done

# Add current diff
git diff -- $FILES >> /tmp/context_pack.txt

pbcopy < /tmp/context_pack.txt
echo "Context pack (size: $(wc -c < /tmp/context_pack.txt) bytes) copied to clipboard!"
