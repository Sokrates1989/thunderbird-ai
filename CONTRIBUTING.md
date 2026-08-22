# Contributing

Thank you for improving Thunderbird AI Assistant. Fork the repository, create a focused branch, and open a pull request against `main`. Bug reports and feature proposals belong in GitHub Issues before broad or compatibility-breaking work begins.

## Development checks

Use Node.js 20 or newer from the repository root:

```bash
node --test tests/*.test.mjs
./build-addon.sh
./installer/macos/test-setup.sh
```

Windows installer changes additionally require the PowerShell and Inno Setup checks documented in [Windows installer testing](docs/windows-installer-testing.md).

Keep German and English user-facing text synchronized. Do not include API keys, email content, profile data, generated installers, or other personal information in commits or test fixtures.

## License of contributions

By submitting a contribution, you agree that it may be distributed under the repository's [GNU General Public License Version 3 or later](LICENSE). You certify that you wrote the contribution or otherwise have the right to submit it under those terms.
