//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

func showError(title, msg string) { fmt.Fprintf(os.Stderr, "%s: %s\n", title, msg) }

func openDefault(url string) error {
	if runtime.GOOS == "darwin" {
		return exec.Command("open", url).Start()
	}
	return exec.Command("xdg-open", url).Start()
}
