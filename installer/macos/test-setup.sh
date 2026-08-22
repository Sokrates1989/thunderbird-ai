#!/usr/bin/env bash
#
# Verifies the macOS package and profile installation in disposable directories.
#
set -euo pipefail

readonly SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIRECTORY}/../.." && pwd)"
readonly EXTENSION_ID='thunderbird-ai@felicitas-wisdom.com'

for command_name in node pkgutil installer unzip; do
    command -v "${command_name}" >/dev/null 2>&1 || {
        printf 'Required command not found: %s\n' "${command_name}" >&2
        exit 1
    }
done

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/thunderbird-ai-installer-test.XXXXXX")"
trap 'rm -rf -- "${temporary_directory}"' EXIT
test_home="${temporary_directory}/home"
profiles_root="${test_home}/Library/Thunderbird/Profiles"
first_profile="${profiles_root}/fixture.default"
second_profile="${profiles_root}/fixture.default-esr"
mkdir -p -- "${first_profile}/extensions" "${second_profile}"
printf 'old fixture\n' >"${first_profile}/extensions/${EXTENSION_ID}.xpi"
printf 'legacy fixture\n' >"${first_profile}/extensions/thunderbird-ai@example.com.xpi"

"${SCRIPT_DIRECTORY}/build-setup.sh"

version="$(node -p 'require(process.argv[1]).version' \
    "${REPOSITORY_ROOT}/thunderbird-ai/manifest.json")"
xpi_path="${REPOSITORY_ROOT}/thunderbird-ai.xpi"
package_path="${REPOSITORY_ROOT}/artifacts/Thunderbird-AI-Setup-${version}-macos.pkg"

THUNDERBIRD_AI_INSTALL_HOME="${test_home}" \
THUNDERBIRD_AI_PAYLOAD_PATH="${xpi_path}" \
THUNDERBIRD_AI_SKIP_LAUNCH=1 \
    "${SCRIPT_DIRECTORY}/scripts/postinstall"

for profile_directory in "${first_profile}" "${second_profile}"; do
    installed_xpi="${profile_directory}/extensions/${EXTENSION_ID}.xpi"
    [[ -f "${installed_xpi}" ]] || {
        printf 'Profile XPI was not installed: %s\n' "${installed_xpi}" >&2
        exit 1
    }
    cmp -s "${xpi_path}" "${installed_xpi}" || {
        printf 'Installed profile XPI differs from the package payload.\n' >&2
        exit 1
    }
done
[[ ! -e "${first_profile}/extensions/thunderbird-ai@example.com.xpi" ]] || {
    printf 'Legacy private extension identity was not removed.\n' >&2
    exit 1
}

defaults_json="$(unzip -p "${xpi_path}" install-defaults.json)"
node -e '
const defaults = JSON.parse(process.argv[1]);
if (defaults.language !== "auto" || defaults.version !== process.argv[2]) {
    throw new Error("macOS XPI contains unexpected install defaults.");
}
' "${defaults_json}" "${version}"

printf 'stale update fixture\n' >"${second_profile}/extensions/${EXTENSION_ID}.xpi"
THUNDERBIRD_AI_INSTALL_HOME="${test_home}" \
THUNDERBIRD_AI_PAYLOAD_PATH="${xpi_path}" \
THUNDERBIRD_AI_SKIP_LAUNCH=1 \
    "${SCRIPT_DIRECTORY}/scripts/postinstall"
cmp -s "${xpi_path}" "${second_profile}/extensions/${EXTENSION_ID}.xpi" || {
    printf 'Second installation did not update the profile XPI.\n' >&2
    exit 1
}

missing_home="${temporary_directory}/missing-home"
mkdir -p -- "${missing_home}"
if THUNDERBIRD_AI_INSTALL_HOME="${missing_home}" \
    THUNDERBIRD_AI_PAYLOAD_PATH="${xpi_path}" \
    THUNDERBIRD_AI_SKIP_LAUNCH=1 \
    "${SCRIPT_DIRECTORY}/scripts/postinstall" >/dev/null 2>&1; then
    printf 'Postinstall unexpectedly accepted a home without Thunderbird profiles.\n' >&2
    exit 1
fi

expanded_product="${temporary_directory}/expanded-product"
pkgutil --expand "${package_path}" "${expanded_product}"

grep -F 'enable_currentUserHome="true"' \
    "${expanded_product}/Distribution" >/dev/null
grep -F 'enable_localSystem="false"' \
    "${expanded_product}/Distribution" >/dev/null
grep -F '<app id="org.mozilla.thunderbird"/>' \
    "${expanded_product}/Distribution" >/dev/null
grep -F '<license file="LICENSE.txt" mime-type="text/plain"/>' \
    "${expanded_product}/Distribution" >/dev/null
grep -F "version=\"${version}\"" \
    "${expanded_product}/Distribution" >/dev/null
cmp -s \
    "${SCRIPT_DIRECTORY}/scripts/postinstall" \
    "${expanded_product}/Thunderbird-AI-component.pkg/Scripts/postinstall" || {
        printf 'Product archive contains an unexpected postinstall script.\n' >&2
    exit 1
}
grep -F "/usr/bin/open -b 'org.mozilla.thunderbird'" \
    "${expanded_product}/Thunderbird-AI-component.pkg/Scripts/postinstall" >/dev/null
grep -F '/bin/sleep 2' \
    "${expanded_product}/Thunderbird-AI-component.pkg/Scripts/postinstall" >/dev/null
payload_files="$(pkgutil --payload-files "${package_path}")"
printf '%s\n' "${payload_files}" | \
    grep -F 'Library/Application Support/Thunderbird AI/thunderbird-ai.xpi' >/dev/null
printf '%s\n' "${payload_files}" | \
    grep -F 'Library/Application Support/Thunderbird AI/LICENSE' >/dev/null
cmp -s \
    "${package_path}" \
    "${REPOSITORY_ROOT}/artifacts/Thunderbird-AI-Setup-macos.pkg" || {
        printf 'Stable macOS release alias differs from the versioned package.\n' >&2
        exit 1
    }

domain_information="$(installer -dominfo -pkg "${package_path}")"
printf '%s\n' "${domain_information}" | grep -F 'CurrentUserHomeDirectory' >/dev/null
if printf '%s\n' "${domain_information}" | grep -F 'LocalSystem' >/dev/null; then
    printf 'macOS package unexpectedly permits a system-wide install.\n' >&2
    exit 1
fi

printf 'Isolated Thunderbird AI macOS install/update and package verification: PASS\n'
