# Security notes

This is a test-network project, with no external contract audit. Check the issuer wallet and contract address with the event organizer. Anyone can deploy a contract, and a successful ownership lookup does not establish who the issuer is.

## Boundaries

- New contracts fix the participant root and metadata URI at deployment. There is no revocation, wallet recovery or edit function. Old deployments cannot be patched; legacy previews may contain claimant-selected metadata.
- IPFS content needs to stay pinned. A fixed URI does not guarantee availability. Public previews load the issuer's metadata and image in the browser, so the gateway can see the viewer's IP address.
- Participant wallets are public when they claim. The downloaded claim file also contains the full eligible wallet list. Share it with care and keep personal information out of metadata.
- The organizer upload key protects the server's Pinata account. Use HTTPS, keep the key private and rotate it if exposed. It is not an organizer identity check. Upload rate limits are in memory and reset when the server restarts.
- Use the dev server and Hardhat demo on loopback only. Local test wallets and funds have no value outside the demo.

## Dependency advisories

The lockfile keeps the original CRA and ethers 5 stack. The audit still reports three underlying advisories, including their dependent packages:

| Package | Severity | Where it is used |
| --- | --- | --- |
| `braces` 3.0.3 | High | Build and test tooling; deeply nested patterns can exhaust the stack. |
| `sprintf-js` 1.1.3 | Moderate | Tooling; unbounded precision can cause denial of service. |
| `elliptic` 6.6.1 | Low | ethers 5, including the browser bundle and server. Its curve implementation has a timing-risk advisory. |

References: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), [elliptic](https://github.com/advisories/GHSA-848j-6mx2-7j84).

There are no patched releases of these packages in the current audit. `npm audit` reports 72 findings (51 high, 5 moderate, 16 low); `npm audit --omit=dev` reports 14 low findings. The latter covers the server dependency tree, not the compiled browser bundle. MetaMask handles browser transaction signing. Blindly running `npm audit fix --force` would change the stack or downgrade CRA without resolving this properly.

Recheck with `npm audit` when updating dependencies. Local HTTP tests use a mock pinning service; live Pinata uploads and Sepolia transactions need a separate check with configured credentials and test funds.
