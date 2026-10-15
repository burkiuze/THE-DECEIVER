// The Deceiver tek dosya başlatıcısı: Electron paketi bu exe'nin içine gömülüdür.
// İlk açılışta %LOCALAPPDATA%\TheDeceiver\app\<sürüm> klasörüne açılır, sonraki
// açılışlar doğrudan oyunu çalıştırır.
package main

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

//go:embed payload.zip
var payload []byte

var payloadID = "dev" // -ldflags "-X main.payloadID=..."

func main() {
	base := os.Getenv("LocalAppData")
	if base == "" {
		base, _ = os.UserCacheDir()
	}
	root := filepath.Join(base, "TheDeceiver", "app")
	dir := filepath.Join(root, payloadID)
	exe := filepath.Join(dir, "TheDeceiver.exe")
	if _, err := os.Stat(filepath.Join(dir, ".ok")); err != nil {
		if err := extract(root, dir); err != nil {
			msg("Oyun dosyaları açılamadı:\n"+err.Error()+"\n\nDiskte yeterli yer olduğundan emin ol.", 0x10)
			os.Exit(1)
		}
	}
	cmd := exec.Command(exe)
	cmd.Dir = dir
	if err := cmd.Start(); err != nil {
		msg("Oyun başlatılamadı:\n"+err.Error()+"\n\nAntivirüs dosyayı engellemiş olabilir.", 0x10)
		os.Exit(1)
	}
	_ = cmd.Wait()
}

func extract(root, dir string) error {
	_ = os.MkdirAll(root, 0o755)
	tmp := dir + ".tmp"
	_ = os.RemoveAll(tmp)
	zr, err := zip.NewReader(bytes.NewReader(payload), int64(len(payload)))
	if err != nil {
		return err
	}
	for _, f := range zr.File {
		p := filepath.Join(tmp, filepath.FromSlash(f.Name))
		if !strings.HasPrefix(p, filepath.Clean(tmp)+string(os.PathSeparator)) {
			continue
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(p, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(p)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		if cerr := out.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			return err
		}
	}
	if err := os.WriteFile(filepath.Join(tmp, ".ok"), []byte("ok"), 0o644); err != nil {
		return err
	}
	_ = os.RemoveAll(dir)
	if err := os.Rename(tmp, dir); err != nil {
		return err
	}
	// Eski sürümleri temizle
	if ents, err := os.ReadDir(root); err == nil {
		for _, e := range ents {
			if e.Name() != payloadID {
				_ = os.RemoveAll(filepath.Join(root, e.Name()))
			}
		}
	}
	return nil
}

func msg(text string, flags uintptr) {
	t, _ := syscall.UTF16PtrFromString("The Deceiver")
	m, _ := syscall.UTF16PtrFromString(text)
	syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), flags)
}
