import { Venda } from '../types';
import { salvarVendaFirestore } from './firestoreSync';

const CHAVE_FILA_OFFLINE = 'vendas_pendentes_sync_offline';

export function obterVendasPendentesOffline(): Venda[] {
  try {
    const salvo = localStorage.getItem(CHAVE_FILA_OFFLINE);
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

export function adicionarVendaFilaOffline(venda: Venda) {
  const fila = obterVendasPendentesOffline();
  const novaFila = [...fila, venda];
  localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(novaFila));
}

export async function sincronizarVendasPendentesFirestore(): Promise<number> {
  if (!navigator.onLine) return 0;

  const fila = obterVendasPendentesOffline();
  if (fila.length === 0) return 0;

  let sincronizadas = 0;
  const restantes: Venda[] = [];

  for (const venda of fila) {
    try {
      await salvarVendaFirestore(venda);
      sincronizadas++;
    } catch (err) {
      console.error('Erro ao sincronizar venda offline:', err);
      restantes.push(venda);
    }
  }

  localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(restantes));
  return sincronizadas;
}
