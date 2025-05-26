#!/usr/bin/env bash
# aws/s3-lifecycle.sh
set -euo pipefail

AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT=petswipe
UPLOADS_BUCKET="${PROJECT}-uploads-${AWS_ACCOUNT_ID}"
DAYS_TO_GLACIER=30
DAYS_TO_EXPIRE=365

echo "🔧 Applying lifecycle policy to $UPLOADS_BUCKET..."
cat > lifecycle.json <<EOF
{
  "Rules": [
    {
      "ID": "GlacierAfter${DAYS_TO_GLACIER}Days",
      "Status": "Enabled",
      "Prefix": "",
      "Transitions": [
        {
          "Days": $DAYS_TO_GLACIER,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": $DAYS_TO_EXPIRE
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$UPLOADS_BUCKET" \
  --lifecycle-configuration file://lifecycle.json

echo "✅ Lifecycle rule set: transition to GLACIER after $DAYS_TO_GLACIER days, expire after $DAYS_TO_EXPIRE days."
