import { getCertificateContract } from './contractUtils';

export async function getClaimPage(addr, provider, chainId, before = null) {
  const [network, latest] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
  if (network.chainId !== chainId) throw new Error('Switch back to the event network to read its claims.');
  if (before !== null && (!Number.isSafeInteger(before) || before < 0)) throw new Error('Invalid block range.');
  const contract = getCertificateContract(addr, provider);
  const readAt = { blockTag: latest, gasLimit: 200000 };
  const [name, total, created] = await Promise.all([
    contract.name(readAt), contract.totalSupply(readAt), contract.createdBlock(readAt)
  ]);
  const first = created.toNumber();
  const toBlock = Math.min(before ?? latest, latest);
  if (first > toBlock) throw new Error('No event history in this block range.');
  const fromBlock = Math.max(first, toBlock - 1999);
  const events = await contract.queryFilter(contract.filters.SoulboundCertificateIssued(), fromBlock, toBlock);
  const claims = events.reverse().map(event => ({
    wallet: event.args.soul, tokenId: event.args.tokenId.toString(),
    block: event.blockNumber, txHash: event.transactionHash
  }));
  return { name, total: total.toString(), claims, fromBlock, toBlock, nextBlock: fromBlock > first ? fromBlock - 1 : null };
}

export function claimsCsv(name, addr, claims) {
  const cell = value => {
    let text = String(value);
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ['Event', 'Contract', 'Wallet', 'Token ID', 'Block', 'Transaction'],
    ...claims.map(claim => [name, addr, claim.wallet, claim.tokenId, claim.block, claim.txHash])
  ];
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
