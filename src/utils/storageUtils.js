import { validAddress } from './apiUtils';

const storageKey = 'decentracert.contracts';

export function readContracts() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw || raw.length > 20000) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(item =>
      item && validAddress(item.address) && [11155111, 31337].includes(item.chainId) && typeof item.name === 'string'
    ).slice(0, 50).map(item => ({ address: item.address, chainId: item.chainId, name: item.name.slice(0, 120) })) : [];
  } catch { return []; }
}

export function writeContracts(list) {
  try { localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 50))); return true; }
  catch { return false; }
}

export function saveContract(address, chainId, name) {
  const list = readContracts().filter(item => item.chainId !== chainId || item.address.toLowerCase() !== address.toLowerCase());
  return writeContracts([{ address, chainId, name }, ...list]);
}
