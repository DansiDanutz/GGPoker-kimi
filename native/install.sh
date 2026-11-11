#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/native/build.sh"
ditto "$ROOT/dist/GGPoker-PlayMoney.app" "/Applications/GGPoker-PlayMoney.app"
open "/Applications/GGPoker-PlayMoney.app"
