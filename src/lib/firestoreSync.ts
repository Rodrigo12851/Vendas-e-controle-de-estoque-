import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Supermercado,
  ItemEstoque,
  ProdutoCatalogo,
  Venda,
  OperadorCaixa,
} from '../types';

// Real-time listener for Supermercados
export function subscribeSupermercados(callback: (lojas: Supermercado[]) => void) {
  const colRef = collection(db, 'supermercados');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const lojas: Supermercado[] = [];
      snapshot.forEach((docSnap) => {
        lojas.push({ id: docSnap.id, ...docSnap.data() } as Supermercado);
      });
      if (lojas.length > 0) {
        callback(lojas);
      }
    },
    (err) => {
      console.warn('Firestore supermercados listener error:', err);
    }
  );
}

// Real-time listener for Estoque
export function subscribeEstoque(lojaId: string, callback: (itens: ItemEstoque[]) => void) {
  const colRef = collection(db, 'estoque');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const itens: ItemEstoque[] = [];
      snapshot.forEach((docSnap) => {
        itens.push(docSnap.data() as ItemEstoque);
      });
      callback(itens);
    },
    (err) => {
      console.warn('Firestore estoque listener error:', err);
    }
  );
}

// Real-time listener for Catálogo Global
export function subscribeCatalogo(callback: (produtos: ProdutoCatalogo[]) => void) {
  const colRef = collection(db, 'produtos_catalogo');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const prods: ProdutoCatalogo[] = [];
      snapshot.forEach((docSnap) => {
        prods.push(docSnap.data() as ProdutoCatalogo);
      });
      if (prods.length > 0) {
        callback(prods);
      }
    },
    (err) => {
      console.warn('Firestore catalogo listener error:', err);
    }
  );
}

// Real-time listener for Vendas
export function subscribeVendas(lojaId: string, callback: (vendas: Venda[]) => void) {
  const colRef = collection(db, 'vendas');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista: Venda[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() } as Venda);
      });
      // Sort by timestamp desc
      lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(lista);
    },
    (err) => {
      console.warn('Firestore vendas listener error:', err);
    }
  );
}

// Real-time listener for Operadores
export function subscribeOperadores(lojaId: string, callback: (operadores: OperadorCaixa[]) => void) {
  const colRef = collection(db, 'operadores');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista: OperadorCaixa[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() } as OperadorCaixa);
      });
      callback(lista);
    },
    (err) => {
      console.warn('Firestore operadores listener error:', err);
    }
  );
}

// Save or Update Supermercado
export async function salvarSupermercadoFirestore(loja: Supermercado) {
  try {
    const docRef = doc(db, 'supermercados', loja.id);
    await setDoc(docRef, loja, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar supermercado no Firestore:', err);
  }
}

// Save or Update Item no Estoque
export async function salvarItemEstoqueFirestore(item: ItemEstoque, lojaId: string) {
  try {
    const docId = `${lojaId}_${item.codigo}_${item.validade || 'semval'}_${item.lote || 'semlote'}`;
    const docRef = doc(db, 'estoque', docId);
    await setDoc(docRef, { ...item, lojaId }, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar item no estoque no Firestore:', err);
  }
}

// Sync entire Estoque list
export async function sincronizarEstoqueCompletoFirestore(itens: ItemEstoque[], lojaId: string) {
  try {
    for (const item of itens) {
      await salvarItemEstoqueFirestore(item, lojaId);
    }
  } catch (err) {
    console.error('Erro ao sincronizar estoque completo:', err);
  }
}

// Save or Update Produto no Catálogo Global
export async function salvarProdutoCatalogoFirestore(prod: ProdutoCatalogo) {
  try {
    const docRef = doc(db, 'produtos_catalogo', prod.codigo);
    await setDoc(docRef, prod, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar no catalogo global no Firestore:', err);
  }
}

// Save Venda
export async function salvarVendaFirestore(venda: Venda) {
  try {
    const docRef = doc(db, 'vendas', venda.id);
    await setDoc(docRef, venda, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar venda no Firestore:', err);
  }
}

// Save Operador
export async function salvarOperadorFirestore(op: OperadorCaixa) {
  try {
    const docRef = doc(db, 'operadores', op.id);
    await setDoc(docRef, op, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar operador no Firestore:', err);
  }
}

// Seed Initial Data into Firestore if collections are empty
export async function inicializarDadosIniciaisFirestore(
  lojasIniciais: Supermercado[],
  catalogoInicial: ProdutoCatalogo[],
  operadoresIniciais: OperadorCaixa[],
  vendasIniciais: Venda[]
) {
  try {
    // Check supermercados
    const snapLojas = await getDocs(collection(db, 'supermercados'));
    if (snapLojas.empty) {
      for (const l of lojasIniciais) {
        await salvarSupermercadoFirestore(l);
      }
    }

    // Check catalogo
    const snapCat = await getDocs(collection(db, 'produtos_catalogo'));
    if (snapCat.empty) {
      for (const p of catalogoInicial) {
        await salvarProdutoCatalogoFirestore(p);
      }
    }

    // Check operadores
    const snapOp = await getDocs(collection(db, 'operadores'));
    if (snapOp.empty) {
      for (const o of operadoresIniciais) {
        await salvarOperadorFirestore(o);
      }
    }

    // Check vendas
    const snapVen = await getDocs(collection(db, 'vendas'));
    if (snapVen.empty) {
      for (const v of vendasIniciais) {
        await salvarVendaFirestore(v);
      }
    }
  } catch (err) {
    console.warn('Aviso na inicializacao dos dados padrao Firestore:', err);
  }
}
