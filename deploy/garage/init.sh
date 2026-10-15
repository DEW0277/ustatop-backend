#!/bin/sh
# Garage'ni bir martalik sozlash (idempotent — har `up`da qayta ishga tushsa ham xavfsiz):
# layout → S3 kalit (env'dagi aniq qiymat bilan) → bucket → kalitga ruxsat → public o'qish (website).
# Muhit: GARAGE_ADMIN_URL, GARAGE_ADMIN_TOKEN, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, GARAGE_CAPACITY (bayt).
set -eu

apk add --no-cache curl jq >/dev/null

API="${GARAGE_ADMIN_URL:-http://garage:3903}"
CAPACITY="${GARAGE_CAPACITY:-10000000000}"

api() { # api METHOD PATH [JSON]
  curl -sS --fail-with-body -X "$1" -H "Authorization: Bearer ${GARAGE_ADMIN_TOKEN}" \
    -H 'Content-Type: application/json' "${API}$2" ${3:+-d "$3"}
}

echo "Garage admin API kutilmoqda (${API})..."
i=0
until api GET /v2/GetClusterStatus >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -ge 60 ] && { echo "Garage 60 soniyada javob bermadi" >&2; exit 1; }
  sleep 1
done

STATUS=$(api GET /v2/GetClusterStatus)
if [ "$(echo "$STATUS" | jq -r '.layoutVersion')" = "0" ]; then
  NODE=$(echo "$STATUS" | jq -r '.nodes[0].id')
  echo "Layout: node ${NODE%"${NODE#????????????}"}... (${CAPACITY} bayt)"
  api POST /v2/UpdateClusterLayout \
    "{\"roles\":[{\"id\":\"${NODE}\",\"zone\":\"dc1\",\"capacity\":${CAPACITY},\"tags\":[]}]}" >/dev/null
  api POST /v2/ApplyClusterLayout '{"version":1}' >/dev/null
fi

if ! api GET "/v2/GetKeyInfo?id=${S3_ACCESS_KEY}" >/dev/null 2>&1; then
  echo "S3 kalit import qilinmoqda: ${S3_ACCESS_KEY}"
  api POST /v2/ImportKey \
    "{\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"secretAccessKey\":\"${S3_SECRET_KEY}\",\"name\":\"ustatop-backend\"}" >/dev/null
fi

if ! BUCKET_JSON=$(api GET "/v2/GetBucketInfo?globalAlias=${S3_BUCKET}" 2>/dev/null); then
  echo "Bucket yaratilmoqda: ${S3_BUCKET}"
  BUCKET_JSON=$(api POST /v2/CreateBucket "{\"globalAlias\":\"${S3_BUCKET}\"}")
fi
BUCKET_ID=$(echo "$BUCKET_JSON" | jq -r '.id')

api POST /v2/AllowBucketKey \
  "{\"bucketId\":\"${BUCKET_ID}\",\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":true}}" >/dev/null
api POST "/v2/UpdateBucket?id=${BUCKET_ID}" '{"websiteAccess":{"enabled":true,"indexDocument":"index.html"}}' >/dev/null

echo "Garage tayyor: bucket \"${S3_BUCKET}\" (public o'qish yoqilgan)."
