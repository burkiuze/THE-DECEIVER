//go:build !windows

package main

// Windows dışındaki sistemlerde (geliştirme/test için) oyun Chrome/Chromium'un uygulama
// penceresinde açılır; pencere kapanınca ya da kalp atışı kesilince program kapanır.

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

func runWindow(url string) {
	started := time.Now()
	var done chan struct{}
	if bin := findBrowser(); bin != "" {
		profile := filepath.Join(dataDir(), "browser")
		_ = os.MkdirAll(profile, 0o755)
		cmd := exec.Command(bin, "--app="+url, "--user-data-dir="+profile, "--no-first-run",
			"--no-default-browser-check", "--window-size=1280,800")
		if err := cmd.Start(); err == nil {
			done = make(chan struct{})
			go func() { _ = cmd.Wait(); close(done) }()
		}
	}
	if done == nil {
		if err := openDefault(url); err != nil {
			fail("Tarayıcı açılamadı. Şu adresi elle aç:\n" + url)
		}
	}
	for {
		time.Sleep(time.Second)
		if done != nil {
			select {
			case <-done:
				if time.Since(started) > 5*time.Second {
					return
				}
				done = nil
			default:
			}
		}
		lp := lastPing.Load()
		if lp == 0 {
			if time.Since(started) > 90*time.Second {
				return
			}
			continue
		}
		if time.Since(time.Unix(0, lp)) > 150*time.Second {
			return
		}
	}
}

func findBrowser() string {
	if b := os.Getenv("DECEIVER_BROWSER"); b != "" {
		return b
	}
	for _, name := range []string{"chromium", "chromium-browser", "google-chrome", "microsoft-edge"} {
		if p, err := exec.LookPath(name); err == nil {
			return p
		}
	}
	return ""
}

func focusExisting() { fmt.Fprintln(os.Stderr, "Oyun zaten açık.") }

func showError(title, msg string) { fmt.Fprintf(os.Stderr, "%s: %s\n", title, msg) }

func openDefault(url string) error {
	if runtime.GOOS == "darwin" {
		return exec.Command("open", url).Start()
	}
	return exec.Command("xdg-open", url).Start()
}
