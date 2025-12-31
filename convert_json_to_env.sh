#!/bin/bash

# Script to convert JSON file to .env format
# Usage: ./convert_json_to_env.sh input.json [output.env]

set -e

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed." >&2
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
    exit 1
fi

# Check for input file
if [ $# -eq 0 ]; then
    echo "Usage: $0 <input.json> [output.env]" >&2
    echo "   or: cat input.json | $0 [output.env]" >&2
    exit 1
fi

# Determine input source
if [ -f "$1" ]; then
    input_file="$1"
    output_file="${2:-}"
    json_content=$(cat "$input_file")
else
    # Read from stdin
    json_content=$(cat)
    output_file="${1:-}"
fi

# Validate JSON
if ! echo "$json_content" | jq . > /dev/null 2>&1; then
    echo "Error: Invalid JSON format" >&2
    exit 1
fi

# Convert to .env format using jq
# Flattens nested objects with underscores, handles arrays as comma-separated values
env_content=$(echo "$json_content" | jq -r '
    def flatten_keys(prefix):
        to_entries | map(
            if .value | type == "object" and (.value | type != "array") then
                .value | flatten_keys(prefix + .key + "_")
            elif .value | type == "array" then
                {key: prefix + .key, value: (.value | map(tostring) | join(","))}
            else
                {key: prefix + .key, value: (.value | tostring)}
            end
        ) | .[];
    
    if type == "object" then
        flatten_keys("") | "\(.key)=\(.value)"
    else
        empty
    end
')

# Output results
if [ -n "$output_file" ]; then
    echo "$env_content" > "$output_file"
    echo "Converted JSON to .env format: $output_file"
else
    echo "$env_content"
fi