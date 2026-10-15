#!/usr/bin/env sh
# Windows için tek dosyalık TheDeceiver.exe üretir (Electron + oyun içinde gömülü).
# Gerekenler: curl, unzip, zip, sha256sum, Go, npx (Node), go-winres (go install github.com/tc-hib/go-winres@latest)
set -eu
cd "$(dirname "$0")"
EV=44.4.5
CACHE=${CACHE:-.cache}
OUT=dist/TheDeceiver
mkdir -p "$CACHE"
ZIP="$CACHE/electron-v$EV-win32-x64.zip"
if [ ! -f "$ZIP" ]; then
  curl -fsSL -o "$ZIP" "https://github.com/electron/electron/releases/download/v$EV/electron-v$EV-win32-x64.zip"
  curl -fsSL -o "$CACHE/SHASUMS256-$EV.txt" "https://github.com/electron/electron/releases/download/v$EV/SHASUMS256.txt"
fi
WANT=$(grep " \*electron-v$EV-win32-x64.zip" "$CACHE/SHASUMS256-$EV.txt" | cut -d' ' -f1)
echo "$WANT  $ZIP" | sha256sum -c -

rm -rf dist && mkdir -p "$OUT"
unzip -q "$ZIP" -d "$OUT"
# Yalnızca Türkçe ve İngilizce dil dosyaları kalsın
find "$OUT/locales" -type f ! -name 'tr.pak' ! -name 'en-US.pak' -delete
rm -f "$OUT/resources/default_app.asar"

# Uygulama + oyun dosyaları -> resources/app.asar
STAGE=dist/stage
mkdir -p "$STAGE/game"
cp app/main.js app/preload.js app/package.json "$STAGE/"
cp ../index.html "$STAGE/game/"
cp -r ../css ../js ../assets "$STAGE/game/"
npx --yes @electron/asar@3.2.17 pack "$STAGE" "$OUT/resources/app.asar"
rm -rf "$STAGE"

# Exe adı, simgesi ve sürüm bilgisi
mv "$OUT/electron.exe" "$OUT/TheDeceiver.exe"
go-winres patch --in winres.json --no-backup --authenticode remove "$OUT/TheDeceiver.exe"

# Tek dosya: Electron klasörü zip'lenip küçük bir Go başlatıcısına gömülür -> dist/TheDeceiver.exe
(cd "$OUT" && zip -9 -q -r ../../launcher/payload.zip .)
ID=$(sha256sum launcher/payload.zip | cut -c1-12)
cp icon.ico launcher/icon.ico
(cd launcher && go-winres make --in ../winres.json --arch amd64 >/dev/null && \
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui -X main.payloadID=$ID" -o ../dist/TheDeceiver.exe .)
rm -f launcher/payload.zip launcher/icon.ico launcher/*.syso
rm -rf "$OUT"
echo "Hazır: desktop/dist/TheDeceiver.exe"
