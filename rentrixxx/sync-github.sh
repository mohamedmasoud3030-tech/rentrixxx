#!/bin/bash
# Rentrix - GitHub Sync Script
# Usage: bash sync-github.sh "commit message"

MSG=${1:-"تحديث المشروع - $(date '+%Y-%m-%d %H:%M')"}

echo "🔄 مزامنة مع GitHub..."
git add -A
git commit -m "$MSG" 2>&1

if git push github main 2>&1; then
  echo "✅ تمت المزامنة بنجاح!"
  echo "🔗 https://github.com/mohamedmasoud3030-tech/rentrix"
else
  echo "❌ فشلت المزامنة. تحقق من الاتصال."
fi
