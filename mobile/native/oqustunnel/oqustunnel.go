// Package oqustunnel is a gomobile-friendly wrapper around the same tun2socks
// engine the Windows desktop app uses (xjasonlyu/tun2socks), plus an in-process
// Shadowsocks SOCKS5 client (shadowsocks-go) so we don't have to ship a second
// binary the way the desktop does.
//
// Why a wrapper: gomobile can only bind a narrow set of types across the JNI
// boundary — no structs, no slices, no time.Duration. tun2socks's engine.Key is
// all three, so we expose a flat string/int API that gomobile can actually see.
//
// Android hands us the TUN file descriptor; tun2socks reads packets off it via
// its `fd://<n>` device scheme and forwards them into our local SOCKS5, which
// speaks Shadowsocks out to the exit server. That is the whole tunnel:
//
//	   app traffic → TUN fd → tun2socks → SOCKS5 :10808 → Shadowsocks → exit
//
// Build (see mobile/native/build-aar.sh):
//	gomobile bind -target=android/arm64,android/arm -o oqustunnel.aar .
package oqustunnel

import (
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/xjasonlyu/tun2socks/v2/engine"

	"github.com/shadowsocks/go-shadowsocks2/core"
	"github.com/shadowsocks/go-shadowsocks2/socks"
)

var (
	mu      sync.Mutex
	running bool
	socksLn net.Listener
)

// Start brings the tunnel up.
//
// tunFd     — the fd from Android's VpnService.Builder.establish()
// mtu       — TUN MTU (1500)
// socksPort — local SOCKS5 port tun2socks forwards into
// server    — Shadowsocks host:port of the exit node
// method    — cipher, e.g. "chacha20-ietf-poly1305"
// password  — Shadowsocks password
//
// Returns an error string ("" on success) — gomobile maps Go's error to an
// exception, but a plain string keeps the Kotlin side simple and explicit.
func Start(tunFd int, mtu int, socksPort int, server string, method string, password string) string {
	mu.Lock()
	defer mu.Unlock()
	if running {
		return "already running"
	}

	// 1) Local SOCKS5 → Shadowsocks → exit server.
	cipher, err := core.PickCipher(method, nil, password)
	if err != nil {
		return fmt.Sprintf("bad cipher %q: %v", method, err)
	}
	addr := net.JoinHostPort("127.0.0.1", strconv.Itoa(socksPort))
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Sprintf("socks listen %s: %v", addr, err)
	}
	socksLn = ln
	go serveSocks(ln, server, cipher)

	// 2) tun2socks reads the Android TUN fd and forwards into that SOCKS5.
	//    `fd://` is what lets us hand over a descriptor we don't own the name of.
	key := &engine.Key{
		Device:   fmt.Sprintf("fd://%d", tunFd),
		Proxy:    fmt.Sprintf("socks5://%s", addr),
		MTU:      mtu,
		LogLevel: "warn",
	}
	engine.Insert(key)
	engine.Start()

	running = true
	return ""
}

// Stop tears the tunnel down. Safe to call when not running.
func Stop() string {
	mu.Lock()
	defer mu.Unlock()
	if !running {
		return ""
	}
	engine.Stop()
	if socksLn != nil {
		socksLn.Close()
		socksLn = nil
	}
	running = false
	return ""
}

// IsRunning reports tunnel state (gomobile binds bool fine).
func IsRunning() bool {
	mu.Lock()
	defer mu.Unlock()
	return running
}

// serveSocks accepts local SOCKS5 connections from tun2socks and relays each
// one to the Shadowsocks exit server with the negotiated cipher.
func serveSocks(ln net.Listener, server string, cipher core.Cipher) {
	for {
		c, err := ln.Accept()
		if err != nil {
			return // listener closed by Stop()
		}
		go func(c net.Conn) {
			defer c.Close()
			tgt, err := socks.Handshake(c)
			if err != nil {
				return
			}
			rc, err := net.Dial("tcp", server)
			if err != nil {
				return
			}
			defer rc.Close()
			rc = cipher.StreamConn(rc)
			if _, err = rc.Write(tgt); err != nil {
				return
			}
			relay(c, rc)
		}(c)
	}
}

// relay pipes two connections together until both directions close.
func relay(a, b net.Conn) {
	var wg sync.WaitGroup
	wg.Add(2)
	pipe := func(dst, src net.Conn) {
		defer wg.Done()
		buf := make([]byte, 32*1024)
		for {
			n, err := src.Read(buf)
			if n > 0 {
				if _, werr := dst.Write(buf[:n]); werr != nil {
					break
				}
			}
			if err != nil {
				break
			}
		}
		// Force the opposite direction's blocked Read to return so both
		// goroutines finish and the connections can be closed.
		now := time.Now()
		a.SetDeadline(now)
		b.SetDeadline(now)
	}
	go pipe(a, b)
	go pipe(b, a)
	wg.Wait()
}
