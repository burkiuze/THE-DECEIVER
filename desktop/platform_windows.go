//go:build windows

package main

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

const webview2Download = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

var (
	user32            = syscall.NewLazyDLL("user32.dll")
	procMessageBox    = user32.NewProc("MessageBoxW")
	procGetLong       = user32.NewProc("GetWindowLongPtrW")
	procSetLong       = user32.NewProc("SetWindowLongPtrW")
	procGetRect       = user32.NewProc("GetWindowRect")
	procSetPos        = user32.NewProc("SetWindowPos")
	procMonitorFrom   = user32.NewProc("MonitorFromWindow")
	procMonitorInfo   = user32.NewProc("GetMonitorInfoW")
	procSysParams     = user32.NewProc("SystemParametersInfoW")
	procFindWindow    = user32.NewProc("FindWindowW")
	procShowWindow    = user32.NewProc("ShowWindow")
	procSetForeground = user32.NewProc("SetForegroundWindow")
	procIsIconic      = user32.NewProc("IsIconic")
)

const (
	gwlStyle           = ^uintptr(15) // -16
	wsOverlappedWindow = 0x00CF0000
	swpNoZOrder        = 0x0004
	swpNoOwnerZOrder   = 0x0200
	swpFrameChanged    = 0x0020
	iconResourceID     = 2 // rsrc: 1 = manifest, 2 = simge grubu
)

type rect struct{ Left, Top, Right, Bottom int32 }

type monitorInfo struct {
	Size    uint32
	Monitor rect
	Work    rect
	Flags   uint32
}

func init() { runtime.LockOSThread() }

// WebView2 kitaplığı hataları log ile bildirir (bazen log.Fatal ile çıkar). GUI uygulamasında
// konsol olmadığından bunları bir dosyaya yazar ve kullanıcıya gösteririz.
type errWriter struct{}

func (errWriter) Write(b []byte) (int, error) {
	_ = os.MkdirAll(dataDir(), 0o755)
	if f, err := os.OpenFile(filepath.Join(dataDir(), "hata.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644); err == nil {
		_, _ = f.Write(b)
		_ = f.Close()
	}
	if strings.Contains(string(b), "Webview2Loader") {
		return len(b), nil // runWindow kurulum mesajını kendisi gösterir
	}
	showError(appName, "Oyun penceresi açılırken bir sorun oluştu:\n"+string(b)+
		"\nMicrosoft WebView2'nin yüklü ve güncel olduğundan emin ol.")
	return len(b), nil
}

func runWindow(url string) {
	log.SetFlags(0)
	log.SetOutput(errWriter{})
	w, h := windowSize()
	wv := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:  filepath.Join(dataDir(), "webview"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title:  appName,
			Width:  w,
			Height: h,
			IconId: iconResourceID,
			Center: true,
		},
	})
	if wv == nil {
		showError(appName, "Oyun penceresi için Microsoft WebView2 gerekiyor.\n"+
			"Tamam'a bastığında indirme sayfası açılacak. Kurduktan sonra oyunu yeniden başlat.")
		cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", webview2Download)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		_ = cmd.Start()
		os.Exit(1)
	}
	defer wv.Destroy()

	hwnd := uintptr(wv.Window())
	// Pencere işlemleri olay işleyicisinin dışında, mesaj döngüsünde yapılır.
	_ = wv.Bind("deceiverFullscreen", func(on bool) bool { wv.Dispatch(func() { setFullscreen(hwnd, on) }); return on })
	_ = wv.Bind("deceiverQuit", func() { wv.Dispatch(wv.Terminate) })
	wv.SetSize(960, 600, webview2.HintMin)
	wv.Navigate(url)
	wv.Run()
}

// windowSize, ekranın çalışma alanının ~%85'ini 16:10'a yakın bir oranla kaplar.
func windowSize() (uint, uint) {
	var wa rect
	procSysParams.Call(0x30 /* SPI_GETWORKAREA */, 0, uintptr(unsafe.Pointer(&wa)), 0)
	sw, sh := int(wa.Right-wa.Left), int(wa.Bottom-wa.Top)
	if sw <= 0 || sh <= 0 {
		return 1280, 800
	}
	w, h := sw*85/100, sh*85/100
	if w > h*16/10 {
		w = h * 16 / 10
	}
	return uint(w), uint(h)
}

var (
	isFull    bool
	savedRect rect
	savedSty  uintptr
)

func setFullscreen(hwnd uintptr, on bool) {
	if on == isFull {
		return
	}
	if on {
		savedSty, _, _ = procGetLong.Call(hwnd, gwlStyle)
		procGetRect.Call(hwnd, uintptr(unsafe.Pointer(&savedRect)))
		mon, _, _ := procMonitorFrom.Call(hwnd, 2 /* MONITOR_DEFAULTTONEAREST */)
		mi := monitorInfo{Size: uint32(unsafe.Sizeof(monitorInfo{}))}
		procMonitorInfo.Call(mon, uintptr(unsafe.Pointer(&mi)))
		procSetLong.Call(hwnd, gwlStyle, savedSty&^wsOverlappedWindow)
		r := mi.Monitor
		procSetPos.Call(hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top),
			swpNoOwnerZOrder|swpFrameChanged)
	} else {
		procSetLong.Call(hwnd, gwlStyle, savedSty)
		r := savedRect
		procSetPos.Call(hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top),
			swpNoZOrder|swpNoOwnerZOrder|swpFrameChanged)
	}
	isFull = on
}

func focusExisting() {
	cls, _ := syscall.UTF16PtrFromString("webview")
	title, _ := syscall.UTF16PtrFromString(appName)
	hwnd, _, _ := procFindWindow.Call(uintptr(unsafe.Pointer(cls)), uintptr(unsafe.Pointer(title)))
	if hwnd == 0 {
		showError(appName, "Oyun zaten açık.")
		return
	}
	if min, _, _ := procIsIconic.Call(hwnd); min != 0 {
		procShowWindow.Call(hwnd, 9 /* SW_RESTORE */)
	}
	procSetForeground.Call(hwnd)
}

func showError(title, msg string) {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(msg)
	procMessageBox.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10 /* MB_ICONERROR */)
}
