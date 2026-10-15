#!/usr/bin/env sh
# Windows için TheDeceiver.exe üretir: oyun dosyalarını gömer, simgeyi ekler ve zip'ler.
# Gerekenler: Go 1.22+, zip. Simge için: go install github.com/akavel/rsrc@latest
set -eu
cd "$(dirname "$0")"
rm -rf game dist && mkdir -p game dist
cp ../index.html game/
cp -r ../css ../js ../assets game/
if command -v rsrc >/dev/null 2>&1 && [ -f icon.ico ]; then
  rsrc -ico icon.ico -arch amd64 -o rsrc_windows_amd64.syso
fi
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o dist/TheDeceiver.exe .
cp OKU.txt dist/
(cd dist && zip -9 -q TheDeceiver.zip TheDeceiver.exe OKU.txt)
echo "Hazır: desktop/dist/TheDeceiver.zip"
