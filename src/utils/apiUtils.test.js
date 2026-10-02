import { cleanMetadata, publicUrl } from './apiUtils';
import { readContracts } from './storageUtils';

test('rejects executable and credential-bearing metadata URLs', () => {
  for (const uri of ['javascript:alert(1)', 'data:text/html,<script>bad</script>', 'file:///etc/passwd', 'https://user:pass@example.com/file', 'ipfs://bad', {}]) {
    expect(publicUrl(uri)).toBe('');
  }
  expect(publicUrl('ipfs://QmYwAPJzv5CZsnAzt8auVTL7fuuxoqGVV86N2azYzj5bWo')).toMatch(/^https:\/\/ipfs.io\/ipfs\//);
});

test('keeps metadata rendering safe with unexpected JSON shapes', () => {
  const data = cleanMetadata({ name: { html: '<script>' }, image: 'javascript:alert(1)', attributes: [{ trait_type: 'Date', value: {} }, { trait_type: 'Count', value: 3 }] });
  expect(data.name).toBe('');
  expect(data.image).toBe('');
  expect(data.attributes).toEqual([{ name: 'Count', value: '3' }]);
  expect(() => cleanMetadata([])).toThrow();
});

test('handles corrupt and invalid browser storage', () => {
  localStorage.setItem('decentracert.contracts', '{broken');
  expect(readContracts()).toEqual([]);
  localStorage.setItem('decentracert.contracts', JSON.stringify([{ address: 'invalid', chainId: 31337, name: 'Bad' }]));
  expect(readContracts()).toEqual([]);
});
