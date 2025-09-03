#!/opt/homebrew/bin/fish

# Usage: fish scripts/run-monitor.fish <cmd> [args...]
# Runs the command in background, monitors for 3 seconds to detect early failure,
# then reports status. If the process is still running after 3 seconds, it leaves
# it running and prints a brief head/tail of outputs captured so far.

function _echo
  set_color cyan
  echo "==> $argv"
  set_color normal
end

function _err
  set_color red
  echo "[ERROR] $argv"
  set_color normal
end

set quiet 0
if test (count $argv) -gt 0; and test $argv[1] = "--quiet"
  set quiet 1
  set argv $argv[2..-1]
end

if test (count $argv) -eq 0
  _err "No command provided"
  exit 2
end

set out (set -q RUNMON_OUT; and echo $RUNMON_OUT; or echo "/tmp/runmon.out.$fish_pid")
set err (set -q RUNMON_ERR; and echo $RUNMON_ERR; or echo "/tmp/runmon.err.$fish_pid")

if test $quiet -eq 0
  _echo "Running: $argv"
end
begin
  $argv > "$out" 2> "$err" &
end
set pid $last_pid

set waited 0
while test $waited -lt 3
  if not kill -0 $pid 2>/dev/null
    break
  end
  sleep 1
  set waited (math $waited + 1)
end

if kill -0 $pid 2>/dev/null
  if test $quiet -eq 0
    _echo "Still running after 3s (pid $pid). Showing first/last lines so far."
    if test -s "$err"
      _echo "stderr (tail):"
      tail -n 5 "$err"
    end
    if test -s "$out"
      _echo "stdout (head):"
      head -n 5 "$out"
    end
  end
  exit 0
else
  # process finished within 3s
  wait $pid
  set status_code $status
  if test $status_code -eq 0
    if test $quiet -eq 0
      _echo "Completed within 3s (exit 0). Output (head):"
      if test -s "$out"; head -n 10 "$out"; end
    else
      if test -s "$out"; cat "$out"; end
    end
    exit 0
  else
    _err "Exited within 3s (exit $status_code). stderr (tail):"
    if test -s "$err"; tail -n 10 "$err"; end
    _echo "stdout (head):"
    if test -s "$out"; head -n 10 "$out"; end
    exit $status_code
  end
end

