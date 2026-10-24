# CodeSight A2 — VSIX release-candidate acceptance

A2 is not accepted by unit tests alone. Complete this gate **before A3**.

## Build and install

1. Confirm required CI checks pass (including Linux/Windows extension-host tests). The PR-only **CodeSight A2 VSIX Validation (non-release)** workflow packages a pre-release VSIX without Marketplace publishing; it checks the packaged manifest and PNG icon and records a SHA-256 checksum.
2. From the PR's **CodeSight A2 VSIX Validation (non-release)** Actions run, download the `codesight-a2-rc-<commit>` artifact containing `codesight-a2-rc.vsix` and its `.sha256` checksum. Alternatively use the existing Extension CI `cassets-vsix-<commit>` artifact containing `cassets-ci.vsix`.
3. In a separate VS Code profile, run **Extensions: Install from VSIX…**, choose the extracted `.vsix`, and reload. Compare the file's SHA-256 with the accompanying checksum when using the dedicated RC workflow.
4. Verify the installed extension is **CAssets CodeSight — DevReady**, publisher `clusterassets`, and the installed version matches `package.json`.
5. Alternatively, after `npm ci`, run `npm run package:pre -- --out codesight-a2-rc.vsix` and install it with `code --install-extension codesight-a2-rc.vsix --force`. A clean VS Code profile is still recommended for acceptance. Packaging does not publish to Marketplace.

## Manual acceptance matrix

| Scenario | Expected behavior |
| --- | --- |
| Clean JS/TS project | Architecture Explorer opens; nodes and evidence reflect actual source |
| Multi-root workspace | Each selected root is scanned independently |
| Python, Rust, Go and manifests | Detected nodes have provisional language/type labels; no invented runtime edges |
| Unknown/external import | Reported as unresolved/external, never fabricated as a local edge |
| Symlink outside workspace | Excluded from scanning and source opening |
| Untrusted workspace | Scan blocked; no code execution or writes |
| Keyboard only | Tab to graph nodes/edges; Enter/Space selects or opens evidence |
| Zoom/pan then select | Zoom, scroll and keyboard focus remain usable |
| Large project (>=300 candidates) | Scan stays bounded and explicitly reports truncation |
| Empty project | No crash; meaningful empty state |
| VSIX install/reload | Commands appear and work without developer checkout |
| Marketplace icon | Actual installed icon matches approved CodeSight artwork at 128px and 256px |

Record host OS, VS Code version, VSIX SHA-256, elapsed scan time, approximate extension-host memory usage, any errors in **Developer: Toggle Developer Tools**, and pass/fail for each scenario.

## Acceptance rule

Do not publish to Marketplace or begin A3 until all required CI checks pass, the downloadable VSIX installs successfully, the manual matrix is completed, and critical/high defects are resolved. This checklist is a gate, **not** evidence that verification has already happened.
