#!/usr/bin/env bash
# Run a single SQL statement against the Supabase project via Management API.
# Usage: q.sh "SQL"   (retries on flaky 5xx/timeouts)
SQL="$1"
PROJECT="gexzpkbqodoyoxudzklb"
URL="https://api.supabase.com/v1/projects/$PROJECT/database/query"
BODY=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$SQL")
for i in 1 2 3 4 5 6 7 8; do
  RESP=$(curl -s -w "\n%{http_code}" --cacert /root/.ccr/ca-bundle.crt \
    -X POST "$URL" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  CODE=$(echo "$RESP" | tail -1)
  OUT=$(echo "$RESP" | sed '$d')
  if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then echo "$OUT"; exit 0; fi
  echo "attempt $i: HTTP $CODE" >&2
  sleep $((i*2))
done
echo "FAILED: $OUT" >&2; exit 1
