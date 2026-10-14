# DecentraCert

Wallet-bound participation certificates for college events. Built with React, Express and Solidity, using Sepolia or a local Hardhat chain. [Hosted app](https://decentracert.onrender.com).

- Publish an event with a fixed participant list and IPFS metadata.
- Import a claim file, claim once and share a public verification link.
- Save event contracts in the browser and export loaded claims as CSV.

## Run locally

Use Node **22.23.3**, also pinned in `.node-version`.

```sh
git clone https://github.com/decentracert/decentracert.git
cd decentracert
npm ci
npm run demo
```

Open **http://localhost:3001**. The demo starts a local chain, publishes an event and claims one certificate, so you can try verification without a wallet or credentials. Data resets each run. Stop it with Ctrl+C.

To try claiming with MetaMask, restart with `DEMO_WALLET=0xYourWalletAddress npm run demo`. Add a custom network with RPC `http://127.0.0.1:8545`, chain ID `31337` and symbol `ETH`. The demo funds that address with local test ETH. Download the demo claim file and import it on the claim page.

## Develop or use Sepolia

Stop the demo first. Copy `.env.example` to `.env`; the default public RPC is enough for verification. For uploads, set `PINATA_JWT` and a random `UPLOAD_KEY` of at least 24 characters. Only share that key with event organizers. Existing IPFS metadata works without upload credentials.

```sh
cp .env.example .env
npm run dev                 # React on :3000, API on :3001
# or serve a production build
npm run build
npm start                   # app and API on :3001
```

Issuing and claiming on Sepolia need MetaMask and Sepolia test ETH. Publish from the Issue page, save the claim file and share it with participants. The Render setup in `render.yaml` uses the same build and start commands.

```sh
npm test                    # contract, utility and HTTP tests
npm run demo -- --check      # local deployment, claim and API check, then exit
```

## How it works

The browser hashes participant addresses into a sorted-pair Merkle tree. Each event contract stores its root, issuer and metadata URI at deployment. A wallet submits its proof to mint one ERC721 certificate; transfers and approvals are disabled. The claim file carries the proofs, and the browser checks its event details against the contract before claiming.

Images and metadata live on IPFS. Express protects uploads and reads the chain for public verification, including `ownerOf`; RPC credentials stay on the server. Saved addresses use localStorage, and claim history loads 2000 blocks at a time.

A record proves ownership from a contract, not the issuer's real identity. Older contracts allowed claimant-selected metadata and are marked as legacy. See [security notes](SECURITY.md) for limits and remaining dependency advisories. [MIT license](LICENSE); bundled fonts use [OFL](src/fonts/OFL.txt).
