#!/bin/sh
# Keep the BrowserSkill daemon reachable across reboots and re-runs.
#
# Why a script rather than a one-off command: the daemon earlier ran 0.3.3 while
# the CLI was 0.4.1, and every pairing failed for a reason that had nothing to do
# with pairing. The version is part of the contract, so it is checked here.
#
# The daemon binds the tailnet address with a Tailscale certificate, because
# `tailscale serve` resets the WebSocket upgrade — the pairing link goes straight
# to the daemon, with no HTTP proxy in the path.
#
#   sh scripts/bsk-daemon.sh start|stop|status|pair
#
# Certificates live in ~/.bsk/tls, never in this repo: `tailscale cert` writes a
# private key, and a key in a checkout is a key in a diff.
set -eu

HOME_DIR="${HOME}/.bsk"
TLS_DIR="${HOME_DIR}/tls"
NAME="vmi3603852.tailc65d30.ts.net"
ADDR="100.100.122.109"
PORT="5447"
LOG="${HOME_DIR}/daemon-tls.log"
PUBLIC="wss://${NAME}:${PORT}"

case "${1:-status}" in
  start)
    command -v bsk >/dev/null || { echo "bsk is not installed"; exit 1; }
    mkdir -p "$TLS_DIR"
    [ -f "$TLS_DIR/$NAME.crt" ] || (cd "$TLS_DIR" && tailscale cert "$NAME")
    if pgrep -f "bsk daemon.*--port ${PORT}" >/dev/null 2>&1; then
      echo "already listening on ${PORT}"
    else
      # --mode server is required for --listen/--tls-*; --public-url is required
      # by server mode. The grant is bound to it, so changing it needs a revoke.
      nohup bsk daemon start --mode server \
        --listen "$ADDR" --port "$PORT" --public-url "$PUBLIC" \
        --tls-cert "$TLS_DIR/$NAME.crt" --tls-key "$TLS_DIR/$NAME.key" \
        > "$LOG" 2>&1 &
      sleep 6
    fi
    ss -ltn 2>/dev/null | grep -q ":${PORT} " && echo "listening ${ADDR}:${PORT}" || {
      echo "failed to bind ${PORT}; last log:"; tail -3 "$LOG"; exit 1; }
    ;;
  stop)
    pkill -f "bsk daemon.*--port ${PORT}" >/dev/null 2>&1 && echo stopped || echo "not running"
    ;;
  status)
    echo "cli:  $(bsk --version 2>/dev/null || echo missing)"
    echo "bind: $(ss -ltn 2>/dev/null | grep -c ":${PORT} ") listener(s) on ${PORT}"
    bsk status 2>/dev/null | grep -E "daemon version|protocol|browsers connected" || true
    ;;
  pair)
    # One use, expires quickly. Printed rather than pasted into chat by default.
    bsk daemon pair 2>&1 | grep -oE "wss?://[^ ]+" | head -1
    ;;
  *)
    echo "usage: $0 start|stop|status|pair" >&2; exit 2 ;;
esac
