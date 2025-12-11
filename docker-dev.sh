#!/bin/bash
# Wrapper script - actual implementation in infrastructure/local/
exec "$(dirname "$0")/infrastructure/local/docker-dev.sh" "$@"
