#!/usr/bin/env bash
#
# Builds the per-user macOS Installer package for Thunderbird AI Assistant.
#
set -euo pipefail
export COPYFILE_DISABLE=1

readonly SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIRECTORY}/../.." && pwd)"

skip_addon_build=false
signing_identity=''

print_usage() {
    printf 'Usage: %s [--skip-addon-build] [--sign IDENTITY]\n' "$0"
}

while (($# > 0)); do
    case "$1" in
        --skip-addon-build)
            skip_addon_build=true
            shift
            ;;
        --sign)
            [[ $# -ge 2 ]] || { print_usage >&2; exit 2; }
            signing_identity="$2"
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

for command_name in node pkgbuild productbuild pkgutil xmllint unzip xattr; do
    command -v "${command_name}" >/dev/null 2>&1 || {
        printf 'Required command not found: %s\n' "${command_name}" >&2
        exit 1
    }
done

manifest_path="${REPOSITORY_ROOT}/thunderbird-ai/manifest.json"
version="$(node -e '
const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const version = String(manifest.version || "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Manifest version ${JSON.stringify(version)} is not semantic.`);
}
if (manifest.browser_specific_settings?.gecko?.id !== "thunderbird-ai@felicitas-wisdom.com") {
    throw new Error("Manifest extension ID does not match the installer identity.");
}
process.stdout.write(version);
' "${manifest_path}")"

xpi_path="${REPOSITORY_ROOT}/thunderbird-ai.xpi"
if [[ "${skip_addon_build}" == false ]]; then
    "${REPOSITORY_ROOT}/build-addon.sh" \
        --installer-language auto \
        --output "${xpi_path}"
fi
[[ -f "${xpi_path}" ]] || {
    printf 'Required XPI not found: %s\n' "${xpi_path}" >&2
    exit 1
}

unzip -p "${xpi_path}" manifest.json | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { input += chunk; });
process.stdin.on("end", () => {
    const manifest = JSON.parse(input);
    if (manifest.version !== process.argv[1] ||
        manifest.browser_specific_settings?.gecko?.id !== "thunderbird-ai@felicitas-wisdom.com") {
        throw new Error("Packaged XPI does not match the source manifest.");
    }
});
' "${version}"

entry_names="$(unzip -Z1 "${xpi_path}")"
for required_entry in \
    LICENSE \
    install-defaults.json \
    _locales/de/messages.json \
    _locales/en/messages.json; do
    if ! printf '%s\n' "${entry_names}" | grep -Fx "${required_entry}" >/dev/null; then
        printf 'XPI omits required entry: %s\n' "${required_entry}" >&2
        exit 1
    fi
done
unzip -p "${xpi_path}" install-defaults.json | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { input += chunk; });
process.stdin.on("end", () => {
    const defaults = JSON.parse(input);
    if (defaults.language !== "auto" || defaults.version !== process.argv[1]) {
        throw new Error("macOS XPI contains unexpected install defaults.");
    }
});
' "${version}"

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/thunderbird-ai-pkg.XXXXXX")"
trap 'rm -rf -- "${temporary_directory}"' EXIT
payload_root="${temporary_directory}/payload"
payload_directory="${payload_root}/Library/Application Support/Thunderbird AI"
component_package="${temporary_directory}/Thunderbird-AI-component.pkg"
distribution_path="${temporary_directory}/distribution.xml"
expanded_package="${temporary_directory}/expanded"
resources_directory="${temporary_directory}/resources"
mkdir -p -- "${payload_directory}"
install -m 0644 -- "${xpi_path}" "${payload_directory}/thunderbird-ai.xpi"
install -m 0644 -- "${REPOSITORY_ROOT}/LICENSE" "${payload_directory}/LICENSE"
cp -R -- "${SCRIPT_DIRECTORY}/resources" "${resources_directory}"
install -m 0644 -- "${REPOSITORY_ROOT}/LICENSE" "${resources_directory}/LICENSE.txt"
xattr -cr "${payload_root}"

sed "s/@APP_VERSION@/${version}/g" \
    "${SCRIPT_DIRECTORY}/distribution.xml" >"${distribution_path}"
xmllint --noout "${distribution_path}"

pkgbuild \
    --root "${payload_root}" \
    --scripts "${SCRIPT_DIRECTORY}/scripts" \
    --identifier 'com.sokrates1989.thunderbird-ai' \
    --version "${version}" \
    --install-location '/' \
    "${component_package}"

artifacts_directory="${REPOSITORY_ROOT}/artifacts"
output_path="${artifacts_directory}/Thunderbird-AI-Setup-${version}-macos.pkg"
mkdir -p -- "${artifacts_directory}"
rm -f -- "${output_path}"

productbuild_arguments=(
    --distribution "${distribution_path}"
    --resources "${resources_directory}"
    --package-path "${temporary_directory}"
)
if [[ -n "${signing_identity}" ]]; then
    productbuild_arguments+=(--sign "${signing_identity}")
fi
productbuild "${productbuild_arguments[@]}" "${output_path}"

stable_output_path="${artifacts_directory}/Thunderbird-AI-Setup-macos.pkg"
cp -- "${output_path}" "${stable_output_path}"

pkgutil --expand "${output_path}" "${expanded_package}"
xmllint --noout "${expanded_package}/Distribution"
[[ -d "${expanded_package}/Thunderbird-AI-component.pkg" ]] || {
    printf 'Product archive omits its component package.\n' >&2
    exit 1
}

printf 'Created %s (%s bytes).\n' "${output_path}" "$(stat -f '%z' "${output_path}")"
printf 'Created stable release alias %s.\n' "${stable_output_path}"
