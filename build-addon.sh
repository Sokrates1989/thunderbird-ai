#!/usr/bin/env bash
#
# Builds the flattened Thunderbird AI XPI on macOS.
#
set -euo pipefail

readonly SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="${SCRIPT_DIRECTORY}"

installer_language='auto'
output_path='thunderbird-ai.xpi'

print_usage() {
    printf 'Usage: %s [--installer-language auto|de|en] [--output PATH]\n' "$0"
}

while (($# > 0)); do
    case "$1" in
        --installer-language)
            [[ $# -ge 2 ]] || { print_usage >&2; exit 2; }
            installer_language="$2"
            shift 2
            ;;
        --output)
            [[ $# -ge 2 ]] || { print_usage >&2; exit 2; }
            output_path="$2"
            shift 2
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        *)
            printf 'Unknown argument: %s\n' "$1" >&2
            print_usage >&2
            exit 2
            ;;
    esac
done

case "${installer_language}" in
    auto|de|en) ;;
    *)
        printf 'Unsupported installer language: %s\n' "${installer_language}" >&2
        exit 2
        ;;
esac

for command_name in node zip unzip; do
    command -v "${command_name}" >/dev/null 2>&1 || {
        printf 'Required command not found: %s\n' "${command_name}" >&2
        exit 1
    }
done

if [[ "${output_path}" != /* ]]; then
    output_path="$(pwd)/${output_path}"
fi
mkdir -p -- "$(dirname -- "${output_path}")"

manifest_path="${REPOSITORY_ROOT}/thunderbird-ai/manifest.json"
manifest_metadata="$(node -e '
const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const version = String(manifest.version || "");
const extensionId = String(manifest.browser_specific_settings?.gecko?.id || "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Manifest version ${JSON.stringify(version)} is not semantic.`);
}
if (extensionId !== "thunderbird-ai@felicitas-wisdom.com") {
    throw new Error(`Unexpected extension ID ${JSON.stringify(extensionId)}.`);
}
process.stdout.write(`${version}\n${extensionId}`);
' "${manifest_path}")"
version="$(printf '%s\n' "${manifest_metadata}" | sed -n '1p')"
extension_id="$(printf '%s\n' "${manifest_metadata}" | sed -n '2p')"

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/thunderbird-ai-xpi.XXXXXX")"
trap 'rm -rf -- "${temporary_directory}"' EXIT
stage_directory="${temporary_directory}/stage"
mkdir -p -- "${stage_directory}"

# Copy one source tree into the XPI root and reject duplicate basenames.
copy_flattened_files() {
    local source_directory="$1"
    local source_path
    local destination_path

    while IFS= read -r source_path; do
        if [[ "${source_path}" == *'/_locales/'* ]]; then
            continue
        fi
        destination_path="${stage_directory}/$(basename -- "${source_path}")"
        if [[ -e "${destination_path}" ]]; then
            printf 'Flattened XPI filename conflict: %s\n' "$(basename -- "${source_path}")" >&2
            exit 1
        fi
        cp -- "${source_path}" "${destination_path}"
    done < <(find "${source_directory}" -type f -print | LC_ALL=C sort)
}

for required_directory in thunderbird-ai common; do
    source_directory="${REPOSITORY_ROOT}/${required_directory}"
    [[ -d "${source_directory}" ]] || {
        printf 'Required source directory not found: %s\n' "${source_directory}" >&2
        exit 1
    }
    copy_flattened_files "${source_directory}"
done

cp -R -- "${REPOSITORY_ROOT}/thunderbird-ai/_locales" "${stage_directory}/_locales"
cp -- "${REPOSITORY_ROOT}/LICENSE" "${stage_directory}/LICENSE"
node -e '
const fs = require("node:fs");
const output = `${JSON.stringify({ language: process.argv[2], version: process.argv[3] }, null, 2)}\n`;
fs.writeFileSync(process.argv[1], output, "utf8");
' "${stage_directory}/install-defaults.json" "${installer_language}" "${version}"

rm -f -- "${output_path}"
(
    cd -- "${stage_directory}"
    find . -type f -print | sed 's#^\./##' | LC_ALL=C sort | zip -q "${output_path}" -@
)

entry_names="$(unzip -Z1 "${output_path}")"
if printf '%s\n' "${entry_names}" | grep -F '\' >/dev/null; then
    printf 'XPI contains an entry with a Windows path separator.\n' >&2
    exit 1
fi
for required_entry in \
    manifest.json \
    LICENSE \
    install-defaults.json \
    _locales/de/messages.json \
    _locales/en/messages.json; do
    if ! printf '%s\n' "${entry_names}" | grep -Fx "${required_entry}" >/dev/null; then
        printf 'XPI omits required entry: %s\n' "${required_entry}" >&2
        exit 1
    fi
done

unzip -p "${output_path}" manifest.json | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { input += chunk; });
process.stdin.on("end", () => {
    const manifest = JSON.parse(input);
    if (manifest.version !== process.argv[1] ||
        manifest.browser_specific_settings?.gecko?.id !== process.argv[2]) {
        throw new Error("Packaged manifest does not match the source manifest.");
    }
});
' "${version}" "${extension_id}"

printf 'Created %s (%s bytes).\n' "${output_path}" "$(stat -f '%z' "${output_path}")"
