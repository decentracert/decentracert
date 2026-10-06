import { ethers } from 'ethers';
import { getCertificateContract } from './contractUtils';
import { claimsCsv, getClaimPage } from './analyticsUtils';

jest.mock('./contractUtils', () => ({ getCertificateContract: jest.fn() }));

const provider = { getNetwork: async () => ({ chainId: 31337 }), getBlockNumber: async () => 6000 };
let contract;
beforeEach(() => {
  contract = {
    name: async () => 'Workshop', totalSupply: async () => ethers.BigNumber.from(1),
    createdBlock: async () => ethers.BigNumber.from(1000), filters: { SoulboundCertificateIssued: () => 'claims' },
    queryFilter: jest.fn().mockResolvedValue([])
  };
  getCertificateContract.mockReturnValue(contract);
});

test('pages through bounded block ranges without gaps or overlaps', async () => {
  const first = await getClaimPage('addr', provider, 31337);
  const second = await getClaimPage('addr', provider, 31337, first.nextBlock);
  const third = await getClaimPage('addr', provider, 31337, second.nextBlock);
  expect(contract.queryFilter.mock.calls).toEqual([['claims', 4001, 6000], ['claims', 2001, 4000], ['claims', 1000, 2000]]);
  expect(third.nextBlock).toBeNull();
});

test('keeps claim data and reports RPC failures and network changes', async () => {
  contract.queryFilter.mockResolvedValueOnce([{ args: { soul: 'wallet', tokenId: ethers.BigNumber.from(1) }, blockNumber: 5000, transactionHash: 'tx' }]);
  expect((await getClaimPage('addr', provider, 31337)).claims).toEqual([{ wallet: 'wallet', tokenId: '1', block: 5000, txHash: 'tx' }]);
  await expect(getClaimPage('addr', provider, 11155111)).rejects.toThrow('network');
  contract.queryFilter.mockRejectedValueOnce(new Error('RPC unavailable'));
  await expect(getClaimPage('addr', provider, 31337)).rejects.toThrow('RPC unavailable');
});

test('quotes CSV fields and neutralizes spreadsheet formulas', () => {
  const claims = [{ wallet: 'wallet', tokenId: '1', block: 5000, txHash: 'tx' }];
  const csv = claimsCsv('Workshop, "security"\nclub', 'addr', claims);
  expect(csv).toContain('"Workshop, ""security""\nclub","addr","wallet","1","5000","tx"');
  for (const name of ['=1+1', ' +SUM(1,2)', '@SUM(1,2)', '\t-1']) {
    expect(claimsCsv(name, 'addr', claims)).toContain('"\'' + name + '"');
  }
});
