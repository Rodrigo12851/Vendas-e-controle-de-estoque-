import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  Venda,
  VendaItem,
  ProdutoCatalogo,
  ItemEstoque,
  PermissoesLoja,
  PermissoesOperador,
  OperadorCaixa,
  Supermercado,
  PERMISSOES_LOJA_PADRAO,
  PERMISSOES_CAIXA_PADRAO,
  PERMISSOES_ADMIN_PADRAO,
} from './types';
import { RelatorioVendasModal } from './components/RelatorioVendasModal';
import { GraficosVendasModal } from './components/GraficosVendasModal';
import {
  subscribeSupermercados,
  subscribeEstoque,
  subscribeCatalogo,
  subscribeVendas,
  subscribeOperadores,
  salvarSupermercadoFirestore,
  salvarItemEstoqueFirestore,
  salvarProdutoCatalogoFirestore,
  salvarVendaFirestore,
  salvarOperadorFirestore,
  inicializarDadosIniciaisFirestore,
} from './lib/firestoreSync';

const LISTA_CATEGORIAS = [
  'Mercearia / Grãos & Cereais',
  'Massas & Molhos',
  'Laticínios & Frios',
  'Açougue / Carnes & Aves',
  'Peixaria & Frutos do Mar',
  'Padaria & Confeitaria',
  'Hortifrúti (Frutas, Legumes & Verduras)',
  'Bebidas Não Alcoólicas (Sucos, Refrigerantes, Águas)',
  'Bebidas Alcoólicas (Cervejas, Vinhos, Destilados)',
  'Matinais & Cereais (Café, Chá, Achocolatados)',
  'Congelados & Pratos Prontos',
  'Enlatados, Conservas & Condimentos',
  'Doces, Chocolates & Bomboniere',
  'Biscoitos, Snacks & Salgadinhos',
  'Óleos, Azeites & Temperos',
  'Sobremesas & Confeitaria',
  'Alimentos Saudáveis & Diet / Light / Zero',
  'Higiene Pessoal',
  'Limpeza Doméstica',
  'Bebês & Infantil',
  'Pet Shop',
  'Outros',
];

export default function App() {
  // Global & Store States
  const [supermercadoAtual, setSupermercadoAtual] = useState<string>(
    () => localStorage.getItem('supermercadoAtualId') || 'loja_matriz_01'
  );
  const [nomeSupermercadoAtivo, setNomeSupermercadoAtivo] = useState<string>(
    () => localStorage.getItem('supermercadoNome') || 'Supermercado Matriz'
  );

  const [catalogoGlobal, setCatalogoGlobal] = useState<ProdutoCatalogo[]>(() => {
    const salvo = localStorage.getItem('catalogoGlobalFirebase');
    return salvo
      ? JSON.parse(salvo)
      : [
          {
            codigo: '7891000100102',
            nome: 'Arroz Integral 1kg',
            marca: 'Marca Exemplo',
            categoria: 'Grãos',
            unidade_medida: 'kg',
            imagem: '',
            descricao: 'Arroz integral',
          },
        ];
  });

  const [estoque, setEstoque] = useState<ItemEstoque[]>(() => {
    const currentStoreId = localStorage.getItem('supermercadoAtualId') || 'loja_matriz_01';
    const salvo = localStorage.getItem(`estoque_${currentStoreId}`);
    return salvo ? JSON.parse(salvo) : [];
  });

  // UI Search & Navigation States
  const [busca, setBusca] = useState<string>('');
  const [menuAtivo, setMenuAtivo] = useState<boolean>(false);

  // Scanner States
  const [leitorAtivo, setLeitorAtivo] = useState<boolean>(false);
  const [destinoLeitor, setDestinoLeitor] = useState<'busca' | 'cadastro' | 'lote' | 'relatorio'>('busca');
  const [processandoOCR, setProcessandoOCR] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const destinoLeitorRef = useRef<string>(destinoLeitor);

  useEffect(() => {
    destinoLeitorRef.current = destinoLeitor;
  }, [destinoLeitor]);

  // Modals visibility
  const [modalSupermercadoVisivel, setModalSupermercadoVisivel] = useState<boolean>(false);
  const [modalCadastroVisivel, setModalCadastroVisivel] = useState<boolean>(false);
  const [modalVendaVisivel, setModalVendaVisivel] = useState<boolean>(false);
  const [modalNotificacoesVisivel, setModalNotificacoesVisivel] = useState<boolean>(false);

  // Full Screen Report
  const [relatorioCheioVisivel, setRelatorioCheioVisivel] = useState<boolean>(false);
  const [modoRelatorioAtual, setModoRelatorioAtual] = useState<'estoque' | 'catalogo'>('estoque');
  const [buscaRelatorio, setBuscaRelatorio] = useState<string>('');
  const [consultandoEAN, setConsultandoEAN] = useState<boolean>(false);

  // Supermarket Form & Store List
  const [listaSupermercados, setListaSupermercados] = useState<Supermercado[]>(() => {
    const salvo = localStorage.getItem('lista_supermercados_app');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {}
    }
    return [
      {
        id: 'loja_matriz_01',
        nome: 'Supermercado Matriz',
        cnpj: '00.000.000/0001-00',
        senha: 'admin',
        dataCadastro: new Date().toLocaleDateString('pt-BR'),
      },
    ];
  });
  const [lojaEditandoId, setLojaEditandoId] = useState<string | null>(null);
  const [buscaLoja, setBuscaLoja] = useState<string>('');
  const [senhasVisiveisLista, setSenhasVisiveisLista] = useState<Record<string, boolean>>({});

  const [regLojaNome, setRegLojaNome] = useState<string>('');
  const [regLojaCnpj, setRegLojaCnpj] = useState<string>('');
  const [regLojaSenha, setRegLojaSenha] = useState<string>('');
  const [regLojaPermissoes, setRegLojaPermissoes] = useState<PermissoesLoja>(PERMISSOES_LOJA_PADRAO);
  const [senhaVisivel, setSenhaVisivel] = useState<boolean>(false);
  const [msgRegLoja, setMsgRegLoja] = useState<React.ReactNode>('');

  // Active User Profile & Session State
  const [perfilAtivo, setPerfilAtivo] = useState<'dona_app' | 'admin_loja' | 'caixa'>(() => {
    return (localStorage.getItem('perfilAtivoTipo') as any) || 'dona_app';
  });
  const [operadorAtivoId, setOperadorAtivoId] = useState<string | null>(() => {
    return localStorage.getItem('operadorAtivoId') || null;
  });

  // Operators / Cashiers List (Per Store)
  const [listaOperadores, setListaOperadores] = useState<OperadorCaixa[]>(() => {
    const storeId = localStorage.getItem('supermercadoAtualId') || 'loja_matriz_01';
    const salvo = localStorage.getItem(`operadores_caixa_${storeId}`);
    if (salvo) {
      try { return JSON.parse(salvo); } catch (e) {}
    }
    return [
      {
        id: 'op_padrao_01',
        lojaId: storeId,
        nome: 'João Silva (Operador Caixa)',
        cargo: 'Operador de Caixa',
        cpfOuUsuario: 'caixa01',
        pinSenha: '123',
        permissoes: PERMISSOES_CAIXA_PADRAO,
        ativo: true,
        dataCadastro: new Date().toLocaleDateString('pt-BR'),
      },
      {
        id: 'op_padrao_02',
        lojaId: storeId,
        nome: 'Maria Souza (Supervisora)',
        cargo: 'Supervisor',
        cpfOuUsuario: 'supervisor',
        pinSenha: '123',
        permissoes: PERMISSOES_ADMIN_PADRAO,
        ativo: true,
        dataCadastro: new Date().toLocaleDateString('pt-BR'),
      },
    ];
  });

  // Operator Modal & Form States
  const [modalOperadoresVisivel, setModalOperadoresVisivel] = useState<boolean>(false);
  const [opEditandoId, setOpEditandoId] = useState<string | null>(null);
  const [regOpNome, setRegOpNome] = useState<string>('');
  const [regOpCpf, setRegOpCpf] = useState<string>('');
  const [regOpSenha, setRegOpSenha] = useState<string>('');
  const [regOpCargo, setRegOpCargo] = useState<'Operador de Caixa' | 'Supervisor' | 'Administrador'>('Operador de Caixa');
  const [regOpPermissoes, setRegOpPermissoes] = useState<PermissoesOperador>(PERMISSOES_CAIXA_PADRAO);
  const [msgRegOp, setMsgRegOp] = useState<React.ReactNode>('');

  // Restricted Access Warning Popup
  const [avisoRestrito, setAvisoRestrito] = useState<string | null>(null);

  // Product Form
  const [codigoEditando, setCodigoEditando] = useState<{ codigo: string; validade: string; lote: string } | null>(null);
  const [cadCod, setCadCod] = useState<string>('');
  const [cadNome, setCadNome] = useState<string>('');
  const [cadMarca, setCadMarca] = useState<string>('');
  const [cadCategoria, setCadCategoria] = useState<string>('');
  const [cadQtd, setCadQtd] = useState<string>('1');
  const [cadLote, setCadLote] = useState<string>('');
  const [cadVal, setCadVal] = useState<string>('');
  const [cadCusto, setCadCusto] = useState<string>('');
  const [cadPreco, setCadPreco] = useState<string>('');
  const [fotoTemp, setFotoTemp] = useState<string>('');
  const [msgCad, setMsgCad] = useState<React.ReactNode>('');

  // Stock Sale/Markdown Modal
  const [prodAtual, setProdAtual] = useState<ItemEstoque | null>(null);
  const [qtdBaixa, setQtdBaixa] = useState<number>(1);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix'>('pix');
  const [msgVenda, setMsgVenda] = useState<React.ReactNode>('');

  // Vendas, Estornos & Gráficos Modals
  const [modalRelatorioVendasVisivel, setModalRelatorioVendasVisivel] = useState<boolean>(false);
  const [modalGraficosVendasVisivel, setModalGraficosVendasVisivel] = useState<boolean>(false);

  // Sales History List (Per Store)
  const [vendas, setVendas] = useState<Venda[]>(() => {
    const storeId = localStorage.getItem('supermercadoAtualId') || 'loja_matriz_01';
    const salvo = localStorage.getItem(`vendas_${storeId}`);
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {}
    }
    // Seed initial sales data for demonstration
    const hoje = new Date();
    const hojeIso = hoje.toISOString().slice(0, 10);
    const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
    const ontemIso = ontem.toISOString().slice(0, 10);
    const ha3dias = new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000);
    const ha3diasIso = ha3dias.toISOString().slice(0, 10);

    const vendasIniciais: Venda[] = [
      {
        id: 'ven_1001',
        lojaId: storeId,
        data: hojeIso,
        hora: '10:15',
        timestamp: hoje.getTime() - 4 * 3600 * 1000,
        operadorId: 'op_padrao_01',
        operadorNome: 'João Silva (Operador Caixa)',
        itens: [
          { codigo: '7891000100102', nome: 'Arroz Integral 1kg', quantidade: 3, preco_unitario: 8.90, subtotal: 26.70, lote: 'L001', validade: '2027-01-15' },
          { codigo: '7891000379585', nome: 'Nescau 2.0 370g', quantidade: 2, preco_unitario: 12.50, subtotal: 25.00, lote: 'L002', validade: '2026-12-10' },
        ],
        valorTotal: 51.70,
        formaPagamento: 'pix',
        status: 'concluida',
      },
      {
        id: 'ven_1002',
        lojaId: storeId,
        data: hojeIso,
        hora: '11:42',
        timestamp: hoje.getTime() - 2 * 3600 * 1000,
        operadorId: 'op_padrao_02',
        operadorNome: 'Maria Souza (Supervisora)',
        itens: [
          { codigo: '7891000100102', nome: 'Arroz Integral 1kg', quantidade: 5, preco_unitario: 8.90, subtotal: 44.50, lote: 'L001', validade: '2027-01-15' },
        ],
        valorTotal: 44.50,
        formaPagamento: 'cartao_credito',
        status: 'concluida',
      },
      {
        id: 'ven_1003',
        lojaId: storeId,
        data: ontemIso,
        hora: '16:30',
        timestamp: ontem.getTime(),
        operadorId: 'op_padrao_01',
        operadorNome: 'João Silva (Operador Caixa)',
        itens: [
          { codigo: '7891000379585', nome: 'Nescau 2.0 370g', quantidade: 4, preco_unitario: 12.50, subtotal: 50.00, lote: 'L002', validade: '2026-12-10' },
        ],
        valorTotal: 50.00,
        formaPagamento: 'cartao_debito',
        status: 'concluida',
      },
      {
        id: 'ven_1004',
        lojaId: storeId,
        data: ha3diasIso,
        hora: '14:20',
        timestamp: ha3dias.getTime(),
        operadorId: 'op_padrao_02',
        operadorNome: 'Maria Souza (Supervisora)',
        itens: [
          { codigo: '7891000100102', nome: 'Arroz Integral 1kg', quantidade: 2, preco_unitario: 8.90, subtotal: 17.80, lote: 'L001', validade: '2027-01-15' },
        ],
        valorTotal: 17.80,
        formaPagamento: 'dinheiro',
        status: 'estornada',
        dataEstorno: ha3diasIso + ' 15:00',
        operadorEstornoNome: 'Maria Souza (Supervisora)',
        motivoEstorno: 'Desistência do cliente',
      },
    ];

    localStorage.setItem(`vendas_${storeId}`, JSON.stringify(vendasIniciais));
    return vendasIniciais;
  });

  // Firebase Firestore Real-time Cloud Database Sync & Initial Seeding
  useEffect(() => {
    // Seed default data if empty in Firestore
    inicializarDadosIniciaisFirestore(listaSupermercados, catalogoGlobal, listaOperadores, vendas);

    // Subscribe to Supermercados
    const unsubLojas = subscribeSupermercados((lojas) => {
      setListaSupermercados(lojas);
      localStorage.setItem('lista_supermercados_app', JSON.stringify(lojas));
    });

    // Subscribe to Catálogo Global
    const unsubCat = subscribeCatalogo((prods) => {
      setCatalogoGlobal(prods);
      localStorage.setItem('catalogoGlobalFirebase', JSON.stringify(prods));
    });

    return () => {
      unsubLojas();
      unsubCat();
    };
  }, []);

  useEffect(() => {
    if (!supermercadoAtual) return;

    // Subscribe to Estoque for active store
    const unsubEstoque = subscribeEstoque(supermercadoAtual, (itens) => {
      setEstoque(itens);
      localStorage.setItem(`estoque_${supermercadoAtual}`, JSON.stringify(itens));
    });

    // Subscribe to Vendas for active store
    const unsubVendas = subscribeVendas(supermercadoAtual, (listaVendas) => {
      setVendas(listaVendas);
      localStorage.setItem(`vendas_${supermercadoAtual}`, JSON.stringify(listaVendas));
    });

    // Subscribe to Operadores for active store
    const unsubOperadores = subscribeOperadores(supermercadoAtual, (ops) => {
      setListaOperadores(ops);
      localStorage.setItem(`operadores_caixa_${supermercadoAtual}`, JSON.stringify(ops));
    });

    return () => {
      unsubEstoque();
      unsubVendas();
      unsubOperadores();
    };
  }, [supermercadoAtual]);

  // BroadcastChannel for Real-time Cross-Tab / Cross-Device Sync
  useEffect(() => {
    let syncChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel('estoque_sync_channel');
      syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC') {
          recarregarDadosLocais();
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('estoque_') || e.key === 'catalogoGlobalFirebase' || e.key === 'supermercadoAtualId') {
        recarregarDadosLocais();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (syncChannel) syncChannel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [supermercadoAtual]);

  const notificarSincronizacao = () => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('estoque_sync_channel');
        channel.postMessage({ type: 'SYNC', storeId: supermercadoAtual });
        channel.close();
      } catch (e) {
        console.log('Sync broadcast:', e);
      }
    }
  };

  const recarregarDadosLocais = () => {
    const storeId = localStorage.getItem('supermercadoAtualId') || 'loja_matriz_01';
    const storeName = localStorage.getItem('supermercadoNome') || 'Supermercado Matriz';
    setSupermercadoAtual(storeId);
    setNomeSupermercadoAtivo(storeName);

    const estSalvo = localStorage.getItem(`estoque_${storeId}`);
    setEstoque(estSalvo ? JSON.parse(estSalvo) : []);

    const vendSalvo = localStorage.getItem(`vendas_${storeId}`);
    if (vendSalvo) {
      try {
        setVendas(JSON.parse(vendSalvo));
      } catch (e) {}
    }

    const catSalvo = localStorage.getItem('catalogoGlobalFirebase');
    if (catSalvo) setCatalogoGlobal(JSON.parse(catSalvo));

    const listaSalva = localStorage.getItem('lista_supermercados_app');
    if (listaSalva) {
      try {
        setListaSupermercados(JSON.parse(listaSalva));
      } catch (e) {}
    }
  };

  // Helper to format date YYYY-MM-DD -> DD/MM/YYYY
  const formatarData = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Menu Drawer
  const abrirMenu = () => setMenuAtivo(true);
  const fecharMenu = () => setMenuAtivo(false);

  // Supermarket Management Modal / Screen
  const abrirModalSupermercado = () => {
    fecharMenu();
    setLojaEditandoId(null);
    setRegLojaNome('');
    setRegLojaCnpj('');
    setRegLojaSenha('');
    setRegLojaPermissoes(PERMISSOES_LOJA_PADRAO);
    setSenhaVisivel(false);
    setMsgRegLoja('');
    setModalSupermercadoVisivel(true);
  };

  const alternarVisibilidadeSenha = () => {
    setSenhaVisivel((prev) => !prev);
  };

  const alternarPermissaoLoja = (chave: keyof PermissoesLoja) => {
    setRegLojaPermissoes((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  const marcarTodasPermissoesLoja = (status: boolean) => {
    setRegLojaPermissoes({
      caixa: status,
      estoque: status,
      usuarios: status,
      relatorios: status,
      estorno: status,
      graficos: status,
      inteligencia_estoque: status,
      ocr_ia: status,
      etiquetas: status,
      alertas: status,
      baixa_estoque: status,
      exportar_dados: status,
    });
  };

  const salvarNovoSupermercado = () => {
    const nome = regLojaNome.trim();
    const cnpj = regLojaCnpj.trim();
    const senha = regLojaSenha.trim();

    if (!nome || !cnpj || !senha) {
      setMsgRegLoja(<span style={{ color: 'var(--erro)' }}>Preencha todos os campos!</span>);
      return;
    }

    const idLoja = lojaEditandoId || 'loja_' + cnpj.replace(/\D/g, '');
    const dadosLoja: Supermercado = {
      id: idLoja,
      nome,
      cnpj,
      senha,
      permissoesLoja: regLojaPermissoes,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
    };

    let novaLista = [...listaSupermercados];
    const index = novaLista.findIndex((l) => l.id === idLoja);
    if (index !== -1) {
      novaLista[index] = { ...novaLista[index], nome, cnpj, senha, permissoesLoja: regLojaPermissoes };
    } else {
      novaLista.push(dadosLoja);
    }

    setListaSupermercados(novaLista);
    localStorage.setItem('lista_supermercados_app', JSON.stringify(novaLista));
    localStorage.setItem(`config_supermercado_${idLoja}`, JSON.stringify(dadosLoja));
    salvarSupermercadoFirestore(dadosLoja);

    setSupermercadoAtual(idLoja);
    setNomeSupermercadoAtivo(nome);

    localStorage.setItem('supermercadoAtualId', idLoja);
    localStorage.setItem('supermercadoNome', nome);

    const estSalvo = localStorage.getItem(`estoque_${idLoja}`);
    setEstoque(estSalvo ? JSON.parse(estSalvo) : []);

    setMsgRegLoja(<span style={{ color: 'var(--sucesso)' }}>✅ Supermercado salvo com suas permissões!</span>);
    notificarSincronizacao();

    setLojaEditandoId(null);
    setRegLojaNome('');
    setRegLojaCnpj('');
    setRegLojaSenha('');
    setRegLojaPermissoes(PERMISSOES_LOJA_PADRAO);

    setTimeout(() => {
      setMsgRegLoja('');
    }, 2000);
  };

  const prepararEdicaoLoja = (loja: Supermercado) => {
    setLojaEditandoId(loja.id);
    setRegLojaNome(loja.nome);
    setRegLojaCnpj(loja.cnpj);
    setRegLojaSenha(loja.senha || '');
    setRegLojaPermissoes(loja.permissoesLoja || PERMISSOES_LOJA_PADRAO);
    setSenhaVisivel(true);
    setMsgRegLoja(<span style={{ color: 'var(--primario)' }}>Editando: {loja.nome}</span>);
  };

  // --- OPERATOR / CASHIER MANAGEMENT HANDLERS ---
  const abrirModalOperadores = () => {
    fecharMenu();
    setOpEditandoId(null);
    setRegOpNome('');
    setRegOpCpf('');
    setRegOpSenha('');
    setRegOpCargo('Operador de Caixa');
    setRegOpPermissoes(PERMISSOES_CAIXA_PADRAO);
    setMsgRegOp('');

    // Load operators for current active store
    const salvo = localStorage.getItem(`operadores_caixa_${supermercadoAtual}`);
    if (salvo) {
      try {
        setListaOperadores(JSON.parse(salvo));
      } catch (e) {}
    }
    setModalOperadoresVisivel(true);
  };

  const fecharModalOperadores = () => {
    setModalOperadoresVisivel(false);
  };

  const alternarPermissaoOperador = (chave: keyof PermissoesOperador) => {
    setRegOpPermissoes((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  const aplicarPermissoesPorCargo = (cargo: 'Operador de Caixa' | 'Supervisor' | 'Administrador') => {
    setRegOpCargo(cargo);
    if (cargo === 'Operador de Caixa') {
      setRegOpPermissoes(PERMISSOES_CAIXA_PADRAO);
    } else {
      setRegOpPermissoes(PERMISSOES_ADMIN_PADRAO);
    }
  };

  const salvarOperador = () => {
    const nome = regOpNome.trim();
    const cpf = regOpCpf.trim();
    const pin = regOpSenha.trim();

    if (!nome || !cpf) {
      setMsgRegOp(<span style={{ color: 'var(--erro)' }}>Preencha Nome e CPF/Usuário do operador!</span>);
      return;
    }

    const idOp = opEditandoId || 'op_' + Date.now();
    const novoOp: OperadorCaixa = {
      id: idOp,
      lojaId: supermercadoAtual,
      nome,
      cargo: regOpCargo,
      cpfOuUsuario: cpf,
      pinSenha: pin || '1234',
      permissoes: regOpPermissoes,
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
    };

    let novaLista = [...listaOperadores];
    const index = novaLista.findIndex((o) => o.id === idOp);
    if (index !== -1) {
      novaLista[index] = novoOp;
    } else {
      novaLista.push(novoOp);
    }

    setListaOperadores(novaLista);
    localStorage.setItem(`operadores_caixa_${supermercadoAtual}`, JSON.stringify(novaLista));
    salvarOperadorFirestore(novoOp);

    setMsgRegOp(<span style={{ color: 'var(--sucesso)' }}>✅ Funcionário / Operador salvo com sucesso!</span>);
    setOpEditandoId(null);
    setRegOpNome('');
    setRegOpCpf('');
    setRegOpSenha('');
    setRegOpCargo('Operador de Caixa');
    setRegOpPermissoes(PERMISSOES_CAIXA_PADRAO);

    setTimeout(() => {
      setMsgRegOp('');
    }, 2000);
  };

  const prepararEdicaoOperador = (op: OperadorCaixa) => {
    setOpEditandoId(op.id);
    setRegOpNome(op.nome);
    setRegOpCpf(op.cpfOuUsuario);
    setRegOpSenha(op.pinSenha);
    setRegOpCargo(op.cargo);
    setRegOpPermissoes(op.permissoes || PERMISSOES_CAIXA_PADRAO);
    setMsgRegOp(<span style={{ color: 'var(--primario)' }}>Editando: {op.nome}</span>);
  };

  const alternarStatusOperador = (idOp: string) => {
    let opAtualizado: OperadorCaixa | null = null;
    const novaLista = listaOperadores.map((op) => {
      if (op.id === idOp) {
        opAtualizado = { ...op, ativo: !op.ativo };
        return opAtualizado;
      }
      return op;
    });
    setListaOperadores(novaLista);
    localStorage.setItem(`operadores_caixa_${supermercadoAtual}`, JSON.stringify(novaLista));
    if (opAtualizado) salvarOperadorFirestore(opAtualizado);
  };

  const excluirOperador = (idOp: string) => {
    if (confirm('Deseja excluir este operador de caixa/funcionário?')) {
      const novaLista = listaOperadores.filter((op) => op.id !== idOp);
      setListaOperadores(novaLista);
      localStorage.setItem(`operadores_caixa_${supermercadoAtual}`, JSON.stringify(novaLista));
    }
  };

  // Switch Active User / Session (Super Admin, Store Owner, Cashier)
  const trocarPerfilAtivo = (tipo: 'dona_app' | 'admin_loja' | 'caixa', opId?: string) => {
    setPerfilAtivo(tipo);
    localStorage.setItem('perfilAtivoTipo', tipo);
    if (tipo === 'caixa' && opId) {
      setOperadorAtivoId(opId);
      localStorage.setItem('operadorAtivoId', opId);
    } else {
      setOperadorAtivoId(null);
      localStorage.removeItem('operadorAtivoId');
    }
  };

  // Helper to verify permissions before triggering restricted features
  const verificarPermissaoOuAvisar = (
    tipoModuloLoja: keyof PermissoesLoja,
    acaoOperador?: keyof PermissoesOperador,
    nomeAcaoFormatado?: string
  ): boolean => {
    // 1. Super Admin (Dona do App) has full access
    if (perfilAtivo === 'dona_app') return true;

    // 2. Check Store Permissions (configured by Dona do App)
    const lojaAtualConfig = listaSupermercados.find((l) => l.id === supermercadoAtual);
    const permLoja = lojaAtualConfig?.permissoesLoja || PERMISSOES_LOJA_PADRAO;

    if (!permLoja[tipoModuloLoja]) {
      setAvisoRestrito(
        `🔒 Acesso Bloqueado pela Dona do Aplicativo: O módulo "${nomeAcaoFormatado || tipoModuloLoja}" está desabilitado para o supermercado "${nomeSupermercadoAtivo}".`
      );
      return false;
    }

    // 3. Store Owner / Admin has full access to enabled store modules
    if (perfilAtivo === 'admin_loja') return true;

    // 4. Cashier / Staff Operator permissions check (configured by Store Owner)
    if (perfilAtivo === 'caixa' && acaoOperador) {
      const opAtual = listaOperadores.find((o) => o.id === operadorAtivoId);
      if (!opAtual || !opAtual.ativo) {
        setAvisoRestrito('🔒 Operador inativo ou não selecionado. Faça login com uma conta válida.');
        return false;
      }
      const permOp = opAtual.permissoes || PERMISSOES_CAIXA_PADRAO;
      if (!permOp[acaoOperador]) {
        setAvisoRestrito(
          `🔒 Acesso Restrito ao Operador: O funcionário "${opAtual.nome}" (${opAtual.cargo}) não tem permissão de "${nomeAcaoFormatado || acaoOperador}". Peça autorização ao Administrador do Supermercado.`
        );
        return false;
      }
    }

    return true;
  };

  const alternarLojaAtiva = (loja: Supermercado) => {
    setSupermercadoAtual(loja.id);
    setNomeSupermercadoAtivo(loja.nome);
    localStorage.setItem('supermercadoAtualId', loja.id);
    localStorage.setItem('supermercadoNome', loja.nome);

    const estSalvo = localStorage.getItem(`estoque_${loja.id}`);
    setEstoque(estSalvo ? JSON.parse(estSalvo) : []);
    notificarSincronizacao();
  };

  const excluirSupermercado = (idLoja: string) => {
    if (listaSupermercados.length <= 1) {
      alert('É necessário ter pelo menos um supermercado cadastrado!');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta loja?')) {
      const novaLista = listaSupermercados.filter((l) => l.id !== idLoja);
      setListaSupermercados(novaLista);
      localStorage.setItem('lista_supermercados_app', JSON.stringify(novaLista));

      if (supermercadoAtual === idLoja) {
        const proxima = novaLista[0];
        alternarLojaAtiva(proxima);
      }
      notificarSincronizacao();
    }
  };

  const toggleVisibilidadeSenhaLoja = (idLoja: string) => {
    setSenhasVisiveisLista((prev) => ({
      ...prev,
      [idLoja]: !prev[idLoja],
    }));
  };

  // Barcode Scanner Camera Logic
  const abrirLeitorGeral = () => {
    setDestinoLeitor('busca');
    iniciarLeitor();
  };

  const abrirLeitorCadastro = () => {
    setDestinoLeitor('cadastro');
    iniciarLeitor();
  };

  const abrirLeitorLote = () => {
    setDestinoLeitor('lote');
    iniciarLeitor();
  };

  const abrirLeitorRelatorio = () => {
    setDestinoLeitor('relatorio');
    iniciarLeitor();
  };

  const processarCodigoScaneado = (codigoLido: string) => {
    const codLimpo = codigoLido.trim();
    const destino = destinoLeitorRef.current;

    fecharLeitor();

    if (navigator.vibrate) {
      try {
        navigator.vibrate(120);
      } catch (e) {}
    }

    if (destino === 'busca') {
      setBusca(codLimpo);
      const achou = estoque.find((p) => p.codigo === codLimpo);
      if (achou) {
        abrirVenda(achou.codigo, achou.validade, achou.lote);
      }
    } else if (destino === 'cadastro') {
      setCadCod(codLimpo);
      const achouCat = catalogoGlobal.find((c) => c.codigo === codLimpo);
      if (achouCat) {
        setCadNome(achouCat.nome || '');
        setCadMarca(achouCat.marca || '');
        setCadCategoria(achouCat.categoria || '');
        if (achouCat.imagem) setFotoTemp(achouCat.imagem);
      }
      // AUTOMATICALLY query Gemini & Open Food Facts for title, brand, category & studio image
      consultarEANGemini(codLimpo);
    } else if (destino === 'lote') {
      setCadLote(codLimpo);
    } else if (destino === 'relatorio') {
      setBuscaRelatorio(codLimpo);
    }
  };

  const iniciarLeitor = async () => {
    setLeitorAtivo(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      let escaneou = false;
      const onDetect = (rawText: string) => {
        if (escaneou || !rawText) return;
        escaneou = true;
        processarCodigoScaneado(rawText);
      };

      // 1. ZXing MultiFormat Reader (Runs on ALL Browsers: Chrome, iOS Safari, Android, Webviews)
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      if (videoRef.current) {
        try {
          const decodePromise = codeReaderRef.current.decodeFromVideoElement(
            videoRef.current,
            (result, err) => {
              if (result && !escaneou) {
                const txt = result.getText();
                if (txt) onDetect(txt);
              }
            }
          );
          if (decodePromise && typeof decodePromise.catch === 'function') {
            decodePromise.catch(() => {
              // Silently handle stream closure / video end without throwing
            });
          }
        } catch (e) {
          // Ignore scanner initialization errors
        }
      }

      // 2. Native BarcodeDetector (Hardware Accelerated if available)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          const scanLoop = async () => {
            if (escaneou || !videoRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  onDetect(barcodes[0].rawValue);
                  return;
                }
              }
            } catch (e) {}
            if (!escaneou) {
              requestAnimationFrame(scanLoop);
            }
          };
          requestAnimationFrame(scanLoop);
        } catch (e) {
          console.warn('Native BarcodeDetector not supported or failed initialization:', e);
        }
      }
    } catch (err: any) {
      alert('Erro ao acessar a câmera: ' + (err.message || 'Verifique as permissões de câmera no navegador'));
      fecharLeitor();
    }
  };

  const fecharLeitor = () => {
    setLeitorAtivo(false);
    setProcessandoOCR(false);
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Process image for OCR - Auto fills Product Name, Category, Lot, Expiration & Barcode
  const processarImagemOCR = async (base64Image: string, usarGemini: boolean = true) => {
    setProcessandoOCR(true);

    if (usarGemini) {
      try {
        const res = await fetch('/api/ocr-lote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        const data = await res.json();
        setProcessandoOCR(false);

        if (data.error) {
          // Fallback to local if Gemini API has issue
          console.warn('Erro Gemini API, tentando local:', data.error);
          return await processarImagemOCR(base64Image, false);
        }

        const nomeEncontrado = data.nomeProduto || '';
        const catEncontrada = data.categoria || '';
        const loteEncontrado = data.lote || '';
        const validadeEncontrada = data.validade || '';
        const codBarrasEncontrado = data.codigoBarras || '';

        if (nomeEncontrado) setCadNome(nomeEncontrado);
        if (catEncontrada) {
          const catMatch = LISTA_CATEGORIAS.find(
            (c) => c.toLowerCase().includes(catEncontrada.toLowerCase()) || catEncontrada.toLowerCase().includes(c.toLowerCase())
          );
          setCadCategoria(catMatch || catEncontrada);
        }
        if (loteEncontrado) setCadLote(loteEncontrado);
        if (validadeEncontrada) setCadVal(validadeEncontrada);
        if (codBarrasEncontrado && !cadCod) setCadCod(codBarrasEncontrado);

        let msgResumo = '🤖 Leitura do Produto Concluída!\n\n';
        if (nomeEncontrado) msgResumo += `• Produto: ${nomeEncontrado}\n`;
        if (catEncontrada) msgResumo += `• Categoria: ${catEncontrada}\n`;
        if (loteEncontrado) msgResumo += `• Lote: ${loteEncontrado || 'Não identificado'}\n`;
        if (validadeEncontrada) msgResumo += `• Validade: ${formatarData(validadeEncontrada) || 'Não identificada'}\n`;
        if (codBarrasEncontrado) msgResumo += `• Cód. Barras: ${codBarrasEncontrado}\n`;

        msgResumo += `\n🔒 A foto foi analisada e os campos foram preenchidos. A imagem foi descartada imediatamente da memória!`;

        alert(msgResumo);
        fecharLeitor();
        return;
      } catch (err) {
        console.warn('Falha no Gemini, tentando local...', err);
      }
    }

    // Local Tesseract OCR fallback with Canvas Preprocessing (Grayscale + Thresholding + Scaling)
    try {
      // Create high-contrast preprocessed canvas
      const img = new Image();
      img.src = base64Image;
      await new Promise((resolve) => (img.onload = resolve));

      const scale = 2.5; // Scale up for small printed text
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        // Binarize / High Contrast Grayscale
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
          const v = avg > 120 ? 255 : 0;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const processedBase64 = canvas.toDataURL('image/png');

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      const ret = await worker.recognize(processedBase64);
      const textoLido = ret.data.text || '';
      await worker.terminate();

      setProcessandoOCR(false);

      // Regex matching for Lot and Validity
      let loteEncontrado = '';
      let validadeEncontrada = '';

      // Pattern matching for Lot
      const matchLote = textoLido.match(/(?:LOTE|LOT|L|P|DF|FAB)\s*[:.-]?\s*([A-Z0-9]{3,12})/i);
      if (matchLote && matchLote[1]) {
        loteEncontrado = matchLote[1].trim();
      }

      // Pattern matching for Validade (DD/MM/YYYY or YYYY-MM-DD or DD/MM/YY)
      const matchValData = textoLido.match(/(?:VAL|VENC|EXP|VAL\.)?\s*[:.-]?\s*(\d{2})[./\s-]?(\d{2})[./\s-]?(\d{2,4})/i);
      if (matchValData) {
        const dia = matchValData[1];
        const mes = matchValData[2];
        let ano = matchValData[3];
        if (ano.length === 2) ano = '20' + ano;

        if (parseInt(mes, 10) <= 12 && parseInt(dia, 10) <= 31) {
          validadeEncontrada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
      }

      if (loteEncontrado) setCadLote(loteEncontrado);
      if (validadeEncontrada) setCadVal(validadeEncontrada);

      if (!loteEncontrado && !validadeEncontrada && textoLido.trim()) {
        const palavras = textoLido.replace(/[^A-Z0-9]/gi, ' ').trim().split(/\s+/);
        if (palavras.length > 0 && palavras[0].length >= 3) {
          setCadLote(palavras[0]);
          loteEncontrado = palavras[0];
        }
      }

      alert(
        `⚡ Leitura Local Concluída!\n\n` +
          `Lote: ${loteEncontrado || 'Não identificado (pode digitar manualmente)'}\n` +
          `Validade: ${validadeEncontrada ? formatarData(validadeEncontrada) : 'Não identificada'}\n\n` +
          `🔒 Imagem descartada imediatamente!`
      );
      fecharLeitor();
    } catch (err: any) {
      setProcessandoOCR(false);
      alert('Erro ao processar imagem: ' + err.message);
    }
  };

  const capturarFotoEProcessarOCR = async (usarGemini: boolean = true) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    await processarImagemOCR(dataUrl, usarGemini);
  };

  const processarArquivoOCR = (e: React.ChangeEvent<HTMLInputElement>, usarGemini: boolean = true) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await processarImagemOCR(dataUrl, usarGemini);
    };
    reader.readAsDataURL(file);
  };

  // Direct client-side lookup in Open Food Facts (Works 100% on static hosts like Vercel)
  const buscarProdutoEANClientSide = async (ean: string) => {
    const cleanEan = ean.trim().replace(/\D/g, '');
    if (!cleanEan) return null;

    const urls = [
      `https://br.openfoodfacts.org/api/v2/product/${cleanEan}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${cleanEan}.json`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 1 && data.product) {
            const prod = data.product;
            const nome = prod.product_name_pt || prod.product_name || '';
            const marca = prod.brands || '';
            const qtd = prod.quantity || '';
            const tipo = prod.generic_name_pt || prod.generic_name || '';
            const foto = prod.image_front_url || prod.image_url || prod.image_front_small_url || prod.image_small_url || '';

            let categoria = 'Mercearia / Grãos & Cereais';
            if (prod.categories_tags && Array.isArray(prod.categories_tags)) {
              const catsStr = prod.categories_tags.join(' ').toLowerCase();
              if (catsStr.includes('beverage') || catsStr.includes('drink') || catsStr.includes('bebida') || catsStr.includes('juice') || catsStr.includes('soda')) {
                categoria = 'Bebidas Não Alcoólicas';
              } else if (catsStr.includes('dairy') || catsStr.includes('milk') || catsStr.includes('leite') || catsStr.includes('cheese') || catsStr.includes('cream')) {
                categoria = 'Laticínios & Frios';
              } else if (catsStr.includes('snack') || catsStr.includes('biscuit') || catsStr.includes('cookie') || catsStr.includes('biscoito')) {
                categoria = 'Biscoitos & Snacks';
              } else if (catsStr.includes('cleaning') || catsStr.includes('detergent') || catsStr.includes('limpeza')) {
                categoria = 'Limpeza Doméstica';
              }
            }

            // Build detailed supermarket title: Tipo + Marca + Nome + Quantidade
            let partes: string[] = [];
            if (tipo && !nome.toLowerCase().includes(tipo.toLowerCase())) {
              partes.push(tipo);
            }
            if (marca && !nome.toLowerCase().includes(marca.toLowerCase())) {
              partes.push(marca);
            }
            partes.push(nome);
            if (qtd && !nome.toLowerCase().includes(qtd.toLowerCase())) {
              partes.push(qtd);
            }

            let nomeCompleto = partes.filter(Boolean).join(' ').trim();
            if (!nomeCompleto) nomeCompleto = `${marca} ${nome} ${qtd}`.trim();

            return {
              nomeProduto: nomeCompleto || nome,
              marca,
              categoria,
              fotoUrl: foto,
              fonte: 'Open Food Facts (Direto)',
            };
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar Open Food Facts client-side:', e);
      }
    }

    return null;
  };

  // Query Gemini AI or Open Food Facts for Product Name, Category and Image by Barcode EAN
  const consultarEANGemini = async (codigoOpcional?: string) => {
    const codParaConsultar = (codigoOpcional || cadCod).trim();
    if (!codParaConsultar) {
      alert('Por favor, informe ou escaneie o código de barras primeiro!');
      return;
    }

    setConsultandoEAN(true);
    let data: any = null;

    // 1. Try server endpoint safely
    try {
      const res = await fetch('/api/consultar-produto-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ean: codParaConsultar }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        data = await res.json();
      }
    } catch (err) {
      console.warn('Endpoint do servidor indisponível ou erro de resposta HTML, usando fallback client-side...', err);
    }

    // 2. Fallback to direct client-side lookup if server returned error / HTML / missing name
    if (!data || !data.nomeProduto) {
      const resultClient = await buscarProdutoEANClientSide(codParaConsultar);
      if (resultClient) {
        data = resultClient;
      }
    }

    setConsultandoEAN(false);

    if (data && data.nomeProduto) {
      setCadNome(data.nomeProduto);
      if (data.marca) setCadMarca(data.marca);
      if (data.categoria) {
        const matchCat = LISTA_CATEGORIAS.find(
          (c) => c.toLowerCase().includes(data.categoria.toLowerCase()) || data.categoria.toLowerCase().includes(c.toLowerCase())
        );
        setCadCategoria(matchCat || data.categoria);
      }
      if (data.fotoUrl) {
        setFotoTemp(data.fotoUrl);
      }

      alert(
        `✨ Campos do Formulário Preenchidos!\n\n` +
          `• Produto: ${data.nomeProduto}\n` +
          (data.marca ? `• Marca: ${data.marca}\n` : '') +
          `• Categoria: ${data.categoria || 'Geral'}\n` +
          (data.fotoUrl ? `• Foto do produto anexada! 📸\n\n` : '\n') +
          `Os campos foram preenchidos na tela. Complete com o lote e validade!`
      );
    } else {
      alert(
        `⚠️ Código de barras lido (${codParaConsultar}), mas o produto não foi localizado nos bancos de dados online.\n\nPor favor, digite o nome e a marca do produto manualmente.`
      );
    }
  };

  // Product Catalog Look Up
  const verificarCatalogoCodigo = (cod: string) => {
    const codigoLimpo = cod.trim();
    if (!codigoLimpo) return;

    const itemCat = catalogoGlobal.find((c) => c.codigo === codigoLimpo);
    if (itemCat) {
      setCadNome(itemCat.nome || '');
      setCadMarca(itemCat.marca || '');
      setCadCategoria(itemCat.categoria || '');
      if (itemCat.imagem) {
        setFotoTemp(itemCat.imagem);
      }
    }
  };

  // Image Upload Handling
  const carregarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = (ev) => {
      const result = ev.target?.result as string;
      setFotoTemp(result);
    };
    leitor.readAsDataURL(arq);
  };

  // Add / Edit Product Modal
  const abrirCadastro = () => {
    fecharMenu();
    setCodigoEditando(null);
    setFotoTemp('');
    setCadCod('');
    setCadNome('');
    setCadMarca('');
    setCadCategoria('');
    setCadQtd('1');
    setCadLote('');
    setCadVal('');
    setCadCusto('');
    setCadPreco('');
    setMsgCad('');
    setModalCadastroVisivel(true);
  };

  const editarProduto = (cod: string, val: string, lote: string) => {
    setRelatorioCheioVisivel(false);
    const p = estoque.find((item) => item.codigo === cod && item.validade === val && item.lote === lote);
    if (!p) return;

    setCodigoEditando({ codigo: cod, validade: val, lote });
    setCadCod(p.codigo);
    setCadNome(p.nome);
    setCadQtd(String(p.quantidade));
    setCadLote(p.lote || '');
    setCadVal(p.validade);
    setCadCusto(p.preco_custo !== undefined ? String(p.preco_custo) : '');
    setCadPreco(String(p.preco_venda));
    setFotoTemp(p.foto || '');
    setMsgCad('');
    setModalCadastroVisivel(true);
  };

  const excluirProduto = (cod: string, val: string, lote: string) => {
    if (confirm('Deseja realmente excluir este item do estoque?')) {
      const novoEstoque = estoque.filter(
        (p) => !(p.codigo === cod && p.validade === val && p.lote === lote)
      );
      setEstoque(novoEstoque);
      localStorage.setItem(`estoque_${supermercadoAtual}`, JSON.stringify(novoEstoque));
      notificarSincronizacao();
    }
  };

  const salvarProduto = () => {
    const codigoDigitado = cadCod.trim();
    const nomeDigitado = cadNome.trim();
    const marcaDigitada = cadMarca.trim();
    const categoriaDigitada = cadCategoria.trim();
    const qtdDigitada = parseInt(cadQtd, 10);
    const loteDigitado = cadLote.trim();
    const valDigitada = cadVal;
    const custoDigitado = parseFloat(cadCusto) || 0;
    const precoDigitado = parseFloat(cadPreco);

    if (!codigoDigitado || !nomeDigitado || isNaN(qtdDigitada) || !valDigitada || isNaN(precoDigitado)) {
      setMsgCad(<span style={{ color: 'var(--erro)' }}>Preencha os campos obrigatórios!</span>);
      return;
    }

    // Update Global Catalog
    const novoCatalogo = [...catalogoGlobal];
    const indexCat = novoCatalogo.findIndex((c) => c.codigo === codigoDigitado);
    const dadosGlobal: ProdutoCatalogo = {
      codigo: codigoDigitado,
      nome: nomeDigitado,
      marca: marcaDigitada,
      categoria: categoriaDigitada,
      unidade_medida: 'un',
      imagem: fotoTemp,
      descricao: nomeDigitado,
    };

    if (indexCat !== -1) {
      novoCatalogo[indexCat] = dadosGlobal;
    } else {
      novoCatalogo.push(dadosGlobal);
    }
    setCatalogoGlobal(novoCatalogo);
    localStorage.setItem('catalogoGlobalFirebase', JSON.stringify(novoCatalogo));
    salvarProdutoCatalogoFirestore(dadosGlobal);

    // Update Store Inventory
    let novoEstoque = [...estoque];
    if (codigoEditando) {
      novoEstoque = novoEstoque.filter(
        (p) =>
          !(
            p.codigo === codigoEditando.codigo &&
            p.validade === codigoEditando.validade &&
            p.lote === codigoEditando.lote
          )
      );
    }

    const indexExistente = novoEstoque.findIndex(
      (p) => p.codigo === codigoDigitado && p.validade === valDigitada && p.lote === loteDigitado
    );

    if (indexExistente !== -1 && !codigoEditando) {
      novoEstoque[indexExistente].quantidade += qtdDigitada;
      novoEstoque[indexExistente].preco_venda = precoDigitado;
      novoEstoque[indexExistente].preco_custo = custoDigitado;
      if (fotoTemp) novoEstoque[indexExistente].foto = fotoTemp;
    } else {
      novoEstoque.push({
        codigo_barras: codigoDigitado,
        codigo: codigoDigitado,
        nome: nomeDigitado,
        quantidade: qtdDigitada,
        lote: loteDigitado,
        validade: valDigitada,
        preco_custo: custoDigitado,
        preco_venda: precoDigitado,
        foto: fotoTemp,
      });
    }

    const itemSalvar: ItemEstoque = {
      codigo_barras: codigoDigitado,
      codigo: codigoDigitado,
      nome: nomeDigitado,
      quantidade: indexExistente !== -1 && !codigoEditando ? novoEstoque[indexExistente].quantidade : qtdDigitada,
      lote: loteDigitado,
      validade: valDigitada,
      preco_custo: custoDigitado,
      preco_venda: precoDigitado,
      foto: fotoTemp,
    };

    setEstoque(novoEstoque);
    localStorage.setItem(`estoque_${supermercadoAtual}`, JSON.stringify(novoEstoque));
    salvarItemEstoqueFirestore(itemSalvar, supermercadoAtual);
    setMsgCad(<span style={{ color: 'var(--sucesso)' }}>✅ Salvo com sucesso!</span>);
    notificarSincronizacao();

    setTimeout(() => {
      setModalCadastroVisivel(false);
    }, 800);
  };

  // Stock Sale / Low Stock / Expiration Markdown
  const abrirVenda = (cod: string, val: string, lote: string) => {
    const item = estoque.find((p) => p.codigo === cod && p.validade === val && p.lote === lote);
    if (!item) return;

    setProdAtual(item);
    setQtdBaixa(1);
    setMsgVenda('');
    setModalNotificacoesVisivel(false);
    setModalVendaVisivel(true);
  };

  const confirmarBaixa = () => {
    if (!prodAtual || isNaN(qtdBaixa) || qtdBaixa < 1) {
      setMsgVenda(<span style={{ color: 'var(--erro)' }}>Digite uma quantidade válida!</span>);
      return;
    }

    if (qtdBaixa > prodAtual.quantidade) {
      setMsgVenda(<span style={{ color: 'var(--erro)' }}>Estoque insuficiente!</span>);
      return;
    }

    let novoEstoque = [...estoque];
    const index = novoEstoque.findIndex(
      (p) => p.codigo === prodAtual.codigo && p.validade === prodAtual.validade && p.lote === prodAtual.lote
    );

    if (index !== -1) {
      novoEstoque[index].quantidade -= qtdBaixa;
      if (novoEstoque[index].quantidade <= 0) {
        novoEstoque = novoEstoque.filter(
          (p) =>
            !(p.codigo === prodAtual.codigo && p.validade === prodAtual.validade && p.lote === prodAtual.lote)
        );
      }
    }

    // Determine cashier / seller name
    const opAtivo = listaOperadores.find((op) => op.id === operadorAtivoId);
    const nomeOperador = opAtivo ? opAtivo.nome : 'Administrador do Supermercado';

    // Create Sale Object
    const novaVenda: Venda = {
      id: 'ven_' + Date.now(),
      lojaId: supermercadoAtual,
      data: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      operadorId: operadorAtivoId || 'admin',
      operadorNome: nomeOperador,
      itens: [
        {
          codigo: prodAtual.codigo,
          nome: prodAtual.nome,
          quantidade: qtdBaixa,
          preco_unitario: prodAtual.preco_venda,
          preco_custo: prodAtual.preco_custo,
          subtotal: prodAtual.preco_venda * qtdBaixa,
          lote: prodAtual.lote,
          validade: prodAtual.validade,
          foto: prodAtual.foto,
        },
      ],
      valorTotal: prodAtual.preco_venda * qtdBaixa,
      formaPagamento: formaPagamento,
      status: 'concluida',
    };

    const novasVendas = [novaVenda, ...vendas];
    setVendas(novasVendas);
    localStorage.setItem(`vendas_${supermercadoAtual}`, JSON.stringify(novasVendas));
    salvarVendaFirestore(novaVenda);

    setEstoque(novoEstoque);
    localStorage.setItem(`estoque_${supermercadoAtual}`, JSON.stringify(novoEstoque));
    if (index !== -1 && novoEstoque[index]) {
      salvarItemEstoqueFirestore(novoEstoque[index], supermercadoAtual);
    }
    setMsgVenda(
      <span style={{ color: 'var(--sucesso)' }}>
        ✅ Venda/Baixa realizada com sucesso! Restam {index !== -1 ? Math.max(0, novoEstoque[index]?.quantidade || 0) : 0} un.
      </span>
    );
    notificarSincronizacao();

    setTimeout(() => {
      setModalVendaVisivel(false);
    }, 900);
  };

  // Sales Reversal (Estorno) Handler
  const handleEstornarVenda = (vendaId: string, motivo: string) => {
    const vendaIndex = vendas.findIndex((v) => v.id === vendaId);
    if (vendaIndex === -1) return;

    const venda = vendas[vendaIndex];
    if (venda.status === 'estornada') return;

    const opAtivo = listaOperadores.find((op) => op.id === operadorAtivoId);
    const nomeOperadorEstorno = opAtivo ? opAtivo.nome : 'Administrador do Supermercado';
    const dataHoraEstorno = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    // 1. Mark sale as estornada
    const novasVendas = [...vendas];
    novasVendas[vendaIndex] = {
      ...venda,
      status: 'estornada',
      dataEstorno: dataHoraEstorno,
      operadorEstornoNome: nomeOperadorEstorno,
      motivoEstorno: motivo,
    };

    // 2. Return sold items back to inventory
    let novoEstoque = [...estoque];
    venda.itens.forEach((itemVenda) => {
      const idxEst = novoEstoque.findIndex(
        (p) => p.codigo === itemVenda.codigo && p.lote === itemVenda.lote && p.validade === itemVenda.validade
      );

      if (idxEst !== -1) {
        novoEstoque[idxEst] = {
          ...novoEstoque[idxEst],
          quantidade: novoEstoque[idxEst].quantidade + itemVenda.quantidade,
        };
      } else {
        // Re-create stock entry if it was completely sold out
        novoEstoque.push({
          codigo: itemVenda.codigo,
          nome: itemVenda.nome,
          quantidade: itemVenda.quantidade,
          lote: itemVenda.lote || 'LOTE_ESTORNO',
          validade: itemVenda.validade || new Date().toISOString().slice(0, 10),
          preco_custo: itemVenda.preco_custo || 0,
          preco_venda: itemVenda.preco_unitario,
          foto: itemVenda.foto,
        });
      }
    });

    setEstoque(novoEstoque);
    localStorage.setItem(`estoque_${supermercadoAtual}`, JSON.stringify(novoEstoque));

    setVendas(novasVendas);
    localStorage.setItem(`vendas_${supermercadoAtual}`, JSON.stringify(novasVendas));

    salvarVendaFirestore(novasVendas[vendaIndex]);
    venda.itens.forEach((itemVenda) => {
      const idxEst = novoEstoque.findIndex(
        (p) => p.codigo === itemVenda.codigo && p.lote === itemVenda.lote && p.validade === itemVenda.validade
      );
      if (idxEst !== -1) {
        salvarItemEstoqueFirestore(novoEstoque[idxEst], supermercadoAtual);
      }
    });

    notificarSincronizacao();
  };

  const abrirRelatorioVendas = () => {
    fecharMenu();
    if (!verificarPermissaoOuAvisar('relatorios', 'ver_relatorios', 'Ver Relatório de Vendas')) return;
    setModalRelatorioVendasVisivel(true);
  };

  const abrirGraficosVendas = () => {
    fecharMenu();
    if (!verificarPermissaoOuAvisar('relatorios', 'ver_relatorios', 'Ver Gráficos de Desempenho')) return;
    setModalGraficosVendasVisivel(true);
  };

  // Notifications Modal
  const abrirNotificacoes = () => {
    setModalNotificacoesVisivel(true);
  };

  // Full Reports
  const abrirRelatorio = () => {
    fecharMenu();
    setModoRelatorioAtual('estoque');
    setBuscaRelatorio('');
    setRelatorioCheioVisivel(true);
  };

  const abrirRelatorioCatalogo = () => {
    fecharMenu();
    setModoRelatorioAtual('catalogo');
    setBuscaRelatorio('');
    setRelatorioCheioVisivel(true);
  };

  const fecharRelatorio = () => {
    setRelatorioCheioVisivel(false);
  };

  // Calculate Expiration Alerts
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencidosOuHoje = estoque.filter((p) => {
    const dataVal = new Date(p.validade + 'T00:00:00');
    const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);
    return dias <= 0;
  });

  const proximoVencimento = estoque.filter((p) => {
    const dataVal = new Date(p.validade + 'T00:00:00');
    const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);
    return dias <= 10;
  });

  // Filtered Inventory List for Main View
  const termoBusca = busca.trim().toLowerCase();
  const estoqueFiltrado = estoque.filter(
    (p) => p.codigo.toLowerCase().includes(termoBusca) || p.nome.toLowerCase().includes(termoBusca)
  );

  // Group items by product barcode for clean main dashboard layout
  const agrupados: Record<
    string,
    {
      codigo: string;
      nome: string;
      foto?: string;
      preco_venda: number;
      qtdTotal: number;
      lotes: { validade: string; qtd: number; lote: string }[];
    }
  > = {};

  estoqueFiltrado.forEach((p) => {
    if (!agrupados[p.codigo]) {
      agrupados[p.codigo] = {
        codigo: p.codigo,
        nome: p.nome,
        foto: p.foto,
        preco_venda: p.preco_venda,
        qtdTotal: 0,
        lotes: [],
      };
    }
    agrupados[p.codigo].qtdTotal += p.quantidade;
    agrupados[p.codigo].lotes.push({ validade: p.validade, qtd: p.quantidade, lote: p.lote });
  });

  const listaAgrupada = Object.values(agrupados);

  // Helper check if item is expired for Venda Modal styling
  const isProdAtualVencido = prodAtual
    ? new Date(prodAtual.validade + 'T00:00:00').getTime() <= hoje.getTime()
    : false;

  return (
    <>
      {/* HEADER */}
      <header className="cabecalho">
        <div className="container-cabecalho">
          <button className="btn-menu" onClick={abrirMenu} title="Abrir Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="barra-acoes">
            <input
              type="text"
              id="busca"
              className="input-busca"
              placeholder="Buscar no estoque..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button className="btn btn-notif" onClick={abrirNotificacoes} title="Notificações/Alertas">
              🔔
              <span
                className="badge-notif"
                id="badgeNotif"
                style={{ display: proximoVencimento.length > 0 ? 'block' : 'none' }}
              ></span>
            </button>
            <button className="btn btn-cam" onClick={abrirLeitorGeral} title="Escanear Código">
              📷
            </button>
          </div>
        </div>
      </header>

      {/* SELETOR DE PERFIL E SESSÃO */}
      <div className="seletor-perfil-bar">
        <div className="perfil-tag-ativo">
          <span>👤 Perfil:</span>
          <select
            className="select-perfil-header"
            value={perfilAtivo === 'caixa' ? `caixa_${operadorAtivoId || ''}` : perfilAtivo}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'dona_app') {
                trocarPerfilAtivo('dona_app');
              } else if (val === 'admin_loja') {
                trocarPerfilAtivo('admin_loja');
              } else if (val.startsWith('caixa_')) {
                const opId = val.replace('caixa_', '');
                trocarPerfilAtivo('caixa', opId);
              }
            }}
          >
            <optgroup label="👑 Super Administração">
              <option value="dona_app">👑 Dona do Aplicativo (Acesso Total)</option>
            </optgroup>
            <optgroup label="🏢 Administração do Supermercado">
              <option value="admin_loja">🏢 Dono do Supermercado / Gerente ({nomeSupermercadoAtivo})</option>
            </optgroup>
            {listaOperadores.length > 0 && (
              <optgroup label="👤 Operadores de Caixa & Equipe">
                {listaOperadores.map((op) => (
                  <option key={op.id} value={`caixa_${op.id}`}>
                    👤 {op.nome} ({op.cargo}) {!op.ativo ? '[INATIVO]' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {perfilAtivo === 'admin_loja' && (
            <button
              className="btn"
              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', cursor: 'pointer' }}
              onClick={abrirModalOperadores}
            >
              👥 Cadastrar Caixas & Permissões
            </button>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div
        className="sidebar-overlay"
        id="sidebarOverlay"
        style={{
          display: menuAtivo ? 'block' : 'none',
          opacity: menuAtivo ? 1 : 0,
        }}
        onClick={fecharMenu}
      ></div>
      <div className={`sidebar ${menuAtivo ? 'ativo' : ''}`} id="sidebarMenu">
        <div className="sidebar-header">
          <span id="labelSupermercadoAtivo">Loja: {nomeSupermercadoAtivo}</span>
          <button className="sidebar-fechar" onClick={fecharMenu}>
            ✕
          </button>
        </div>
        <div className="sidebar-menu">
          <div className="sidebar-item" onClick={abrirModalSupermercado}>
            🏢 Cadastrar / Gerenciar Lojas (Dona do App)
          </div>
          <div className="sidebar-item" onClick={abrirModalOperadores}>
            👥 Cadastrar Caixas & Funcionários
          </div>
          <div
            className="sidebar-item"
            onClick={() => {
              if (verificarPermissaoOuAvisar('estoque', 'cadastrar_produtos', 'Cadastrar Produtos')) {
                abrirCadastro();
              }
            }}
          >
            ➕ Adicionar Item (Estoque)
          </div>
          <div className="sidebar-item" onClick={abrirRelatorioCatalogo}>
            🗂️ Catálogo Global
          </div>
          <div
            className="sidebar-item"
            onClick={() => {
              if (verificarPermissaoOuAvisar('relatorios', 'ver_relatorios', 'Relatórios Financeiros')) {
                abrirRelatorio();
              }
            }}
          >
            📊 Relatório de Estoque
          </div>
          <div className="sidebar-item" onClick={abrirRelatorioVendas}>
            🧾 Relatório de Vendas (Histórico & Estorno)
          </div>
          <div className="sidebar-item" onClick={abrirGraficosVendas}>
            📈 Gráficos & Inteligência de Estoque (Dono)
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="espaco-topo">
        <div className="painel-alertas" id="painel-alertas">
          {vencidosOuHoje.length > 0 && (
            <div className="alerta alerta-erro" onClick={abrirNotificacoes}>
              ❌ {vencidosOuHoje.length} produto(s) vencido(s) ou a vencer hoje. Toque para ver.
            </div>
          )}
        </div>

        <div className="grid-produtos" id="grid-produtos">
          {listaAgrupada.length === 0 ? (
            <div className="vazio">Nenhum produto cadastrado no estoque desta loja.</div>
          ) : (
            listaAgrupada.map((p) => {
              const primeiraValidade = p.lotes[0].validade;
              const primeiroLote = p.lotes[0].lote || '';

              return (
                <div className="card-produto" key={p.codigo}>
                  <div
                    className="foto-produto"
                    onClick={() => abrirVenda(p.codigo, primeiraValidade, primeiroLote)}
                  >
                    {p.foto ? <img src={p.foto} alt={p.nome} /> : 'Sem imagem'}
                  </div>
                  <div className="info-card">
                    <div>
                      <div
                        className="nome-prod"
                        onClick={() => abrirVenda(p.codigo, primeiraValidade, primeiroLote)}
                      >
                        {p.nome}
                      </div>
                      <div className="detalhe">Cód: {p.codigo}</div>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <div className="detalhe">
                        Estoque Total: <b>{p.qtdTotal} un</b>
                      </div>
                      <div className="detalhe preco-destaque">R$ {p.preco_venda.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* FULL REPORT SCREEN */}
      <div
        className="tela-relatorio-cheia"
        id="telaRelatorioCheia"
        style={{ display: relatorioCheioVisivel ? 'flex' : 'none' }}
      >
        <div className="cabecalho-relatorio">
          <h2 id="tituloRelatorioCheio">
            {modoRelatorioAtual === 'estoque'
              ? `Relatório de Estoque (${nomeSupermercadoAtivo})`
              : 'Catálogo Global (Compartilhado)'}
          </h2>
          <button className="btn-voltar-rel" onClick={fecharRelatorio}>
            Voltar
          </button>
        </div>
        <div className="corpo-relatorio-cheio">
          <div className="linha-input" style={{ marginBottom: '12px' }}>
            <input
              type="text"
              id="buscaRelatorio"
              className="input-modal"
              style={{ marginBottom: 0 }}
              placeholder="Pesquisar ou escanear..."
              value={buscaRelatorio}
              onChange={(e) => setBuscaRelatorio(e.target.value)}
            />
            <button className="btn-cam-pequeno" onClick={abrirLeitorRelatorio} title="Escanear Código no Relatório">
              📷
            </button>
          </div>
          <div className="tabela-relatorio" id="listaRelatorioCheio">
            {modoRelatorioAtual === 'estoque' ? (
              (() => {
                const t = buscaRelatorio.trim().toLowerCase();
                const lista = estoque.filter(
                  (p) => p.codigo.toLowerCase().includes(t) || p.nome.toLowerCase().includes(t)
                );
                if (!lista.length) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '30px' }}>
                      Nenhum produto no estoque.
                    </div>
                  );
                }
                return lista.map((p) => (
                  <div className="relatorio-linha-cheia" key={`${p.codigo}_${p.validade}_${p.lote}`}>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => {
                        fecharRelatorio();
                        abrirVenda(p.codigo, p.validade, p.lote || '');
                      }}
                    >
                      <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {p.nome}
                      </b>
                      <small style={{ color: 'var(--texto-secundario)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        Cód: {p.codigo} | Lote: {p.lote || 'N/D'} | Val: {formatarData(p.validade)}
                      </small>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      <span>
                        Qtd: <b>{p.quantidade} un</b>
                      </span>
                      <br />
                      <span className="preco-destaque">R$ {p.preco_venda.toFixed(2)}</span>
                      <div className="acoes-relatorio">
                        <button
                          className="btn-acao-rel btn-editar-rel"
                          onClick={() => editarProduto(p.codigo, p.validade, p.lote || '')}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-acao-rel btn-excluir-rel"
                          onClick={() => excluirProduto(p.codigo, p.validade, p.lote || '')}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ));
              })()
            ) : (
              (() => {
                const t = buscaRelatorio.trim().toLowerCase();
                const lista = catalogoGlobal.filter(
                  (c) => c.codigo.toLowerCase().includes(t) || c.nome.toLowerCase().includes(t)
                );
                if (!lista.length) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '30px' }}>
                      Nenhum produto cadastrado no catálogo global.
                    </div>
                  );
                }
                return lista.map((c) => (
                  <div className="relatorio-linha-cheia" key={c.codigo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--borda)',
                        }}
                      >
                        {c.imagem ? (
                          <img src={c.imagem} alt={c.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          'Foto'
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {c.nome}
                        </b>
                        <small style={{ color: 'var(--texto-secundario)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          Cód: {c.codigo} | Marca: {c.marca || 'N/D'} | Cat: {c.categoria || 'N/D'}
                        </small>
                      </div>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      </div>

      {/* CAMERA BARCODE SCANNER & AI VISION SCREEN */}
      <div className="leitor-tela" id="tela-leitor" style={{ display: leitorAtivo ? 'flex' : 'none' }}>
        <div id="video-container">
          <video id="video-webcam" ref={videoRef} autoPlay playsInline muted></video>
          <div className="mira-scanner">
            <div className="linha-laser"></div>
          </div>
        </div>

        {destinoLeitor === 'lote' ? (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: '380px', marginTop: '10px' }}>
            <p className="aviso-leitor" style={{ marginBottom: '8px' }}>
              Aponte para a área com Lote e Validade do produto.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
              🔒 <b>Privacidade & Economia:</b> A foto NÃO é salva. Ela é descartada da memória imediatamente após a leitura!
            </p>
            {processandoOCR ? (
              <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.95rem', margin: '14px 0' }}>
                ⏳ Analisando foto e extraindo lote/validade... Aguarde...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn btn-salvar"
                  onClick={() => capturarFotoEProcessarOCR(true)}
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem' }}
                >
                  🤖 Tirar Foto e Ler com IA Gemini (Alta Precisão)
                </button>
                <label
                  className="btn"
                  style={{
                    background: '#38bdf8',
                    color: '#0f172a',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'block',
                    textAlign: 'center',
                  }}
                >
                  📁 Escolher Foto da Galeria (IA)
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => processarArquivoOCR(e, true)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => capturarFotoEProcessarOCR(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #475569',
                    color: '#cbd5e1',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  ⚡ Usar Leitor Local Alternativo
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="aviso-leitor">Aponte a câmera para o código de barras.</p>
        )}

        <button className="btn-fechar" onClick={fecharLeitor} style={{ marginTop: '12px' }}>
          Fechar
        </button>
      </div>

      {/* SUPERMARKET REGISTRATION & MANAGEMENT FULL SCREEN */}
      <div
        className="tela-relatorio-cheia"
        id="modalSupermercado"
        style={{ display: modalSupermercadoVisivel ? 'flex' : 'none' }}
      >
        <div className="cabecalho-relatorio">
          <h2>🏢 Gestão e Cadastro de Supermercados</h2>
          <button className="btn-voltar-rel" onClick={() => setModalSupermercadoVisivel(false)}>
            Voltar
          </button>
        </div>
        <div className="corpo-relatorio-cheio">
          {/* SEÇÃO 1: FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          <div
            style={{
              background: 'var(--branco)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--borda)',
              marginBottom: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primario)', marginBottom: '12px' }}>
              {lojaEditandoId ? '✏️ Editar Supermercado / Redefinir Senha' : '➕ Cadastrar Novo Supermercado'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">Nome do Supermercado</label>
                <input
                  type="text"
                  id="reg-loja-nome"
                  className="input-modal"
                  placeholder="Ex: Supermercado Boa Vista"
                  value={regLojaNome}
                  onChange={(e) => setRegLojaNome(e.target.value)}
                  required
                />
              </div>
              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">CNPJ</label>
                <input
                  type="text"
                  id="reg-loja-cnpj"
                  className="input-modal"
                  placeholder="00.000.000/0001-00"
                  value={regLojaCnpj}
                  onChange={(e) => setRegLojaCnpj(e.target.value)}
                  disabled={!!lojaEditandoId}
                  required
                />
              </div>
              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">Senha de Acesso / Gestão</label>
                <div className="linha-input">
                  <input
                    type={senhaVisivel ? 'text' : 'password'}
                    id="reg-loja-senha"
                    className="input-modal"
                    placeholder="Senha de acesso"
                    value={regLojaSenha}
                    onChange={(e) => setRegLojaSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    id="btnOlhoSenha"
                    className={`btn-olho-transparente ${!senhaVisivel ? 'olho-fechado' : ''}`}
                    onClick={alternarVisibilidadeSenha}
                    title="Ver/Ocultar Senha"
                  >
                    <svg viewBox="0 0 24 24">
                      <g className="eye-open">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </g>
                      <g className="eye-closed">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* QUADRADOS DE PERMISSÃO POR CATEGORIA PARA A DONA DO APLICATIVO */}
            <div style={{ marginTop: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label className="rotulo-campo" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--texto)' }}>
                  👑 Permissões e Módulos Habilitados para este Supermercado (Dona do Aplicativo):
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => marcarTodasPermissoesLoja(true)}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => marcarTodasPermissoesLoja(false)}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid-permissoes">
                {[
                  { key: 'caixa', icon: '🛒', title: 'PDV / Caixa', desc: 'Permite realizar vendas e registrar saídas no caixa' },
                  { key: 'estoque', icon: '📦', title: 'Gestão de Estoque', desc: 'Permite cadastrar produtos, preços, marcas e lotes' },
                  { key: 'usuarios', icon: '👥', title: 'Gestão de Equipe', desc: 'Permite cadastrar e gerenciar operadores de caixa' },
                  { key: 'relatorios', icon: '📊', title: 'Relatórios de Vendas', desc: 'Acesso ao histórico de vendas e faturamento' },
                  { key: 'estorno', icon: '↩️', title: 'Estorno & Cancelamento', desc: 'Permite estornar vendas realizadas e devolver ao estoque' },
                  { key: 'graficos', icon: '📈', title: 'Gráficos & Analytics', desc: 'Acesso aos gráficos e curva de faturamento' },
                  { key: 'inteligencia_estoque', icon: '💡', title: 'Inteligência de Estoque', desc: 'Sugestões de reposição, giro de caixa e perdas' },
                  { key: 'ocr_ia', icon: '🤖', title: 'Consulta OCR / IA', desc: 'Leitura de rótulos com câmera e inteligência artificial' },
                  { key: 'etiquetas', icon: '🏷️', title: 'Impressão de Etiquetas', desc: 'Geração e impressão de etiquetas térmicas com barras' },
                  { key: 'alertas', icon: '🔔', title: 'Alertas de Validade', desc: 'Notificação automática de produtos a vencer' },
                  { key: 'baixa_estoque', icon: '🗑️', title: 'Baixa & Descarte', desc: 'Ajuste manual e descarte por perda ou avaria' },
                  { key: 'exportar_dados', icon: '📥', title: 'Exportação de Dados', desc: 'Download de relatórios em Excel, CSV e PDF' },
                ].map((item) => {
                  const marcado = regLojaPermissoes[item.key as keyof PermissoesLoja];
                  return (
                    <div
                      key={item.key}
                      className={`card-permissao ${marcado ? 'marcado' : ''}`}
                      onClick={() => alternarPermissaoLoja(item.key as keyof PermissoesLoja)}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {}}
                      />
                      <div className="info-permissao">
                        <div className="titulo-permissao">
                          <span>{item.icon}</span>
                          <span>{item.title}</span>
                        </div>
                        <div className="desc-permissao">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grupo-botoes" style={{ marginTop: '14px' }}>
              <button className="btn btn-salvar" onClick={salvarNovoSupermercado}>
                {lojaEditandoId ? 'Atualizar Dados e Senha' : 'Salvar Supermercado'}
              </button>
              {lojaEditandoId && (
                <button
                  className="btn btn-cancelar"
                  onClick={() => {
                    setLojaEditandoId(null);
                    setRegLojaNome('');
                    setRegLojaCnpj('');
                    setRegLojaSenha('');
                    setMsgRegLoja('');
                  }}
                >
                  Cancelar Edição
                </button>
              )}
            </div>
            <div className="msg" id="msg-reg-loja">
              {msgRegLoja}
            </div>
          </div>

          {/* SEÇÃO 2: LISTA DE LOJAS CADASTRADAS */}
          <div
            style={{
              background: 'var(--branco)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--borda)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--texto)' }}>
                🏪 Lojas Cadastradas (Total: {listaSupermercados.length})
              </h3>
              <input
                type="text"
                className="input-modal"
                style={{ maxWidth: '240px', padding: '6px 10px', fontSize: '0.85rem' }}
                placeholder="Pesquisar loja por nome ou CNPJ..."
                value={buscaLoja}
                onChange={(e) => setBuscaLoja(e.target.value)}
              />
            </div>

            <div className="tabela-relatorio">
              {(() => {
                const termo = buscaLoja.trim().toLowerCase();
                const filtradas = listaSupermercados.filter(
                  (l) => l.nome.toLowerCase().includes(termo) || l.cnpj.toLowerCase().includes(termo)
                );

                if (filtradas.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                      Nenhum supermercado encontrado.
                    </div>
                  );
                }

                return filtradas.map((loja) => {
                  const isAtiva = loja.id === supermercadoAtual;
                  const verSenha = senhasVisiveisLista[loja.id] || false;

                  return (
                    <div
                      key={loja.id}
                      className="relatorio-linha-cheia"
                      style={{
                        background: isAtiva ? '#f0f9ff' : 'var(--branco)',
                        borderLeft: isAtiva ? '4px solid var(--primario)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <b style={{ fontSize: '0.95rem', color: 'var(--texto)' }}>{loja.nome}</b>
                          {isAtiva && (
                            <span
                              style={{
                                background: '#16a34a',
                                color: '#fff',
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600,
                              }}
                            >
                              Loja Selecionada
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                          CNPJ: <b>{loja.cnpj}</b> | Cadastrada em: {loja.dataCadastro || 'N/A'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--texto-secundario)',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>Senha:</span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {verSenha ? loja.senha || '(sem senha)' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleVisibilidadeSenhaLoja(loja.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Mostrar / Ocultar Senha"
                          >
                            {verSenha ? '👁️' : '🙈'}
                          </button>
                        </div>
                      </div>

                      <div
                        className="acoes-relatorio"
                        style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}
                      >
                        {!isAtiva && (
                          <button
                            className="btn-acao-rel"
                            style={{ background: '#16a34a', color: '#fff' }}
                            onClick={() => alternarLojaAtiva(loja)}
                          >
                            Acessar Loja
                          </button>
                        )}
                        <button
                          className="btn-acao-rel btn-editar-rel"
                          onClick={() => prepararEdicaoLoja(loja)}
                        >
                          ✏️ Editar / Trocar Senha
                        </button>
                        <button
                          className="btn-acao-rel btn-excluir-rel"
                          onClick={() => excluirSupermercado(loja.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* OPERATORS / CASHIERS & STAFF MANAGEMENT MODAL (FULL SCREEN) */}
      <div
        className="tela-relatorio-cheia"
        id="modalOperadores"
        style={{ display: modalOperadoresVisivel ? 'flex' : 'none' }}
      >
        <div className="cabecalho-relatorio">
          <h2>👥 Gestão de Caixas, Operadores & Funcionários ({nomeSupermercadoAtivo})</h2>
          <button className="btn-voltar-rel" onClick={fecharModalOperadores}>
            Voltar
          </button>
        </div>
        <div className="corpo-relatorio-cheio">
          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE OPERADOR */}
          <div
            style={{
              background: 'var(--branco)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--borda)',
              marginBottom: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primario)', marginBottom: '12px' }}>
              {opEditandoId ? '✏️ Editar Operador / Permissões' : '➕ Cadastrar Novo Operador de Caixa / Funcionário'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">Nome do Funcionário</label>
                <input
                  type="text"
                  className="input-modal"
                  placeholder="Ex: Carlos Oliveira"
                  value={regOpNome}
                  onChange={(e) => setRegOpNome(e.target.value)}
                  required
                />
              </div>

              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">CPF / Login do Operador</label>
                <input
                  type="text"
                  className="input-modal"
                  placeholder="Ex: caixa01 ou 123.456.789-00"
                  value={regOpCpf}
                  onChange={(e) => setRegOpCpf(e.target.value)}
                  required
                />
              </div>

              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">PIN / Senha do Caixa</label>
                <input
                  type="password"
                  className="input-modal"
                  placeholder="Ex: 1234"
                  value={regOpSenha}
                  onChange={(e) => setRegOpSenha(e.target.value)}
                />
              </div>

              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">Cargo / Nível de Acesso</label>
                <select
                  className="input-modal"
                  value={regOpCargo}
                  onChange={(e) => aplicarPermissoesPorCargo(e.target.value as any)}
                >
                  <option value="Operador de Caixa">🛒 Operador de Caixa</option>
                  <option value="Supervisor">👔 Supervisor de Loja</option>
                  <option value="Administrador">👑 Administrador Local</option>
                </select>
              </div>
            </div>

            {/* ATALHOS DE PERMISSÃO */}
            <div style={{ marginTop: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <label className="rotulo-campo" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--texto)', marginBottom: 0 }}>
                🔳 Quadrados de Permissão do Operador (O que ele pode acessar ou mexer):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => aplicarPermissoesPorCargo('Operador de Caixa')}
                >
                  ⚡ Permissões Padrão de Caixa
                </button>
                <button
                  type="button"
                  style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => aplicarPermissoesPorCargo('Administrador')}
                >
                  👑 Permissões Padrão de Administrador
                </button>
              </div>
            </div>

            {/* QUADRADOS DE PERMISSÃO DO OPERADOR */}
            <div className="grid-permissoes">
              {[
                { key: 'vender', icon: '🛒', title: 'Realizar Vendas', desc: 'Registrar saídas no caixa do PDV e finalizar compras' },
                { key: 'dar_desconto', icon: '💲', title: 'Dar Desconto', desc: 'Aplicar desconto no valor total da venda' },
                { key: 'alterar_preco', icon: '✏️', title: 'Alterar Preço', desc: 'Mudar o valor unitário de venda do produto' },
                { key: 'estornar_venda', icon: '↩️', title: 'Estornar / Cancelar Venda', desc: 'Cancelar venda e retornar itens ao estoque' },
                { key: 'cadastrar_produtos', icon: '📦', title: 'Cadastrar Produtos', desc: 'Criar ou editar produtos e lotes no estoque' },
                { key: 'excluir_produtos', icon: '❌', title: 'Excluir Produtos', desc: 'Remover produtos do cadastro e estoque da loja' },
                { key: 'baixa_estoque', icon: '🗑️', title: 'Baixa Manual', desc: 'Dar baixa em estoque por perda, quebra ou vencimento' },
                { key: 'ver_relatorios', icon: '📊', title: 'Ver Faturamento', desc: 'Visualizar relatórios e histórico de vendas' },
                { key: 'ver_graficos', icon: '📈', title: 'Ver Gráficos', desc: 'Acessar gráficos de desempenho de vendas' },
                { key: 'inteligencia_estoque', icon: '💡', title: 'Inteligência de Compras', desc: 'Ver recomendações de reposição e itens parados' },
                { key: 'gerenciar_equipe', icon: '👥', title: 'Gerenciar Caixas', desc: 'Cadastrar e editar outros funcionários' },
                { key: 'imprimir_etiquetas', icon: '🏷️', title: 'Imprimir Etiquetas', desc: 'Gerar e imprimir etiquetas térmicas e códigos' },
                { key: 'usar_ocr_ia', icon: '🤖', title: 'Usar Leitor OCR/IA', desc: 'Scanner com inteligência artificial para ler embalagens' },
                { key: 'exportar_relatorios', icon: '📥', title: 'Exportar Relatórios', desc: 'Baixar arquivos de vendas em CSV/PDF' },
              ].map((item) => {
                const marcado = regOpPermissoes[item.key as keyof PermissoesOperador];
                return (
                  <div
                    key={item.key}
                    className={`card-permissao ${marcado ? 'marcado' : ''}`}
                    onClick={() => alternarPermissaoOperador(item.key as keyof PermissoesOperador)}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => {}}
                    />
                    <div className="info-permissao">
                      <div className="titulo-permissao">
                        <span>{item.icon}</span>
                        <span>{item.title}</span>
                      </div>
                      <div className="desc-permissao">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grupo-botoes" style={{ marginTop: '14px' }}>
              <button className="btn btn-salvar" onClick={salvarOperador}>
                {opEditandoId ? 'Atualizar Operador' : 'Salvar Operador de Caixa'}
              </button>
              {opEditandoId && (
                <button
                  className="btn btn-cancelar"
                  onClick={() => {
                    setOpEditandoId(null);
                    setRegOpNome('');
                    setRegOpCpf('');
                    setRegOpSenha('');
                    setRegOpCargo('Operador de Caixa');
                    setRegOpPermissoes(PERMISSOES_CAIXA_PADRAO);
                    setMsgRegOp('');
                  }}
                >
                  Cancelar Edição
                </button>
              )}
            </div>
            <div className="msg">{msgRegOp}</div>
          </div>

          {/* LISTA DE OPERADORES CADASTRADOS NA LOJA */}
          <div
            style={{
              background: 'var(--branco)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--borda)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--texto)', marginBottom: '12px' }}>
              👥 Operadores & Caixas Cadastrados no {nomeSupermercadoAtivo} (Total: {listaOperadores.length})
            </h3>

            {listaOperadores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--texto-secundario)' }}>
                Nenhum operador de caixa cadastrado nesta loja. Use o formulário acima para adicionar um funcionário.
              </div>
            ) : (
              <div className="tabela-relatorio">
                {listaOperadores.map((op) => (
                  <div
                    key={op.id}
                    className="relatorio-linha-cheia"
                    style={{
                      background: op.ativo ? 'var(--branco)' : '#f8fafc',
                      opacity: op.ativo ? 1 : 0.7,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: '0.95rem', color: 'var(--texto)' }}>{op.nome}</b>
                        <span
                          className={`badge-permissao-status ${op.ativo ? 'badge-ativa' : 'badge-inativa'}`}
                        >
                          {op.ativo ? '🟢 Ativo' : '🔴 Inativo'}
                        </span>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 600,
                          }}
                        >
                          {op.cargo}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                        Login/CPF: <b>{op.cpfOuUsuario}</b> | Cadastrado em: {op.dataCadastro || 'N/A'}
                      </div>

                      {/* BADGES DE PERMISSÕES ATIVAS */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {op.permissoes?.vender && <span style={{ fontSize: '0.68rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>🛒 Vendas</span>}
                        {op.permissoes?.dar_desconto && <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>💲 Desconto</span>}
                        {op.permissoes?.alterar_preco && <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>✏️ Alterar Preço</span>}
                        {op.permissoes?.estornar_venda && <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>↩️ Estorno</span>}
                        {op.permissoes?.cadastrar_produtos && <span style={{ fontSize: '0.68rem', background: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>📦 Cad. Produtos</span>}
                        {op.permissoes?.excluir_produtos && <span style={{ fontSize: '0.68rem', background: '#ffedd5', color: '#9a3412', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>❌ Excluir Produtos</span>}
                        {op.permissoes?.baixa_estoque && <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>🗑️ Baixa Manual</span>}
                        {op.permissoes?.ver_relatorios && <span style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>📊 Relatórios</span>}
                        {op.permissoes?.ver_graficos && <span style={{ fontSize: '0.68rem', background: '#ccfbf1', color: '#0f766e', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>📈 Gráficos</span>}
                        {op.permissoes?.inteligencia_estoque && <span style={{ fontSize: '0.68rem', background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>💡 Inteligência</span>}
                        {op.permissoes?.gerenciar_equipe && <span style={{ fontSize: '0.68rem', background: '#fae8ff', color: '#86198f', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>👥 Gerir Equipe</span>}
                        {op.permissoes?.imprimir_etiquetas && <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>🏷️ Etiquetas</span>}
                        {op.permissoes?.usar_ocr_ia && <span style={{ fontSize: '0.68rem', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>🤖 OCR / IA</span>}
                        {op.permissoes?.exportar_relatorios && <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>📥 Exportar</span>}
                      </div>
                    </div>

                    <div className="acoes-relatorio" style={{ flexDirection: 'column', gap: '4px' }}>
                      <button
                        className="btn-acao-rel btn-editar-rel"
                        onClick={() => prepararEdicaoOperador(op)}
                      >
                        ✏️ Editar Permissões
                      </button>
                      <button
                        className="btn-acao-rel"
                        style={{
                          background: op.ativo ? '#fef3c7' : '#dcfce7',
                          color: op.ativo ? '#b45309' : '#15803d',
                        }}
                        onClick={() => alternarStatusOperador(op.id)}
                      >
                        {op.ativo ? '⏸ Desativar' : '▶ Ativar'}
                      </button>
                      <button
                        className="btn-acao-rel btn-excluir-rel"
                        onClick={() => excluirOperador(op.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCT REGISTRATION MODAL */}
      <div className="modal" id="modalCadastro" style={{ display: modalCadastroVisivel ? 'flex' : 'none' }}>
        <div className="modal-conteudo">
          <div className="cab-modal" id="titulo-modal-cad">
            {codigoEditando ? 'Editar Lote no Estoque' : 'Novo Produto no Estoque'}
          </div>
          <div className="corpo-modal">
            <div className="grupo-input">
              <label className="rotulo-campo">Código de Barras (EAN / GTIN)</label>
              <div className="linha-input">
                <input
                  type="text"
                  id="cad-cod"
                  className="input-modal"
                  placeholder="Ex: 7891000379585"
                  value={cadCod}
                  onChange={(e) => {
                    setCadCod(e.target.value);
                    verificarCatalogoCodigo(e.target.value);
                  }}
                  required
                />
                <button className="btn-cam-pequeno" onClick={abrirLeitorCadastro} title="Escanear Código de Barras com Câmera">
                  📷
                </button>
              </div>
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  style={{
                    background: 'var(--primario)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(2,132,199,0.2)',
                  }}
                  onClick={() => consultarEANGemini()}
                  disabled={consultandoEAN || !cadCod.trim()}
                >
                  {consultandoEAN
                    ? '⏳ Buscando Nome Detalhado & Foto de Estúdio...'
                    : '🤖 Buscar Dados com IA (Nome Detalhado + Foto Fundo Branco)'}
                </button>
              </div>
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Nome Detalhado do Produto</label>
              <input
                type="text"
                id="cad-nome"
                className="input-modal"
                placeholder="Ex: Achocolatado em Pó Nestlé Nescau 2.0 Lata 370g"
                value={cadNome}
                onChange={(e) => setCadNome(e.target.value)}
                required
              />
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Marca</label>
              <input
                type="text"
                id="cad-marca"
                className="input-modal"
                placeholder="Ex: Nestlé, Coca-Cola, Piracanjuba"
                value={cadMarca}
                onChange={(e) => setCadMarca(e.target.value)}
              />
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Categoria</label>
              <select
                id="cad-categoria"
                className="input-modal"
                value={cadCategoria}
                onChange={(e) => setCadCategoria(e.target.value)}
              >
                <option value="">-- Selecione a Categoria --</option>
                {cadCategoria && !LISTA_CATEGORIAS.includes(cadCategoria) && (
                  <option value={cadCategoria}>{cadCategoria}</option>
                )}
                {LISTA_CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Quantidade em Estoque</label>
              <input
                type="number"
                id="cad-qtd"
                className="input-modal"
                placeholder="Qtd de unidades"
                min="1"
                value={cadQtd}
                onChange={(e) => setCadQtd(e.target.value)}
                required
              />
            </div>



            <div className="grupo-input">
              <label className="rotulo-campo">Lote do Produto</label>
              <div className="linha-input">
                <input
                  type="text"
                  id="cad-lote"
                  className="input-modal"
                  placeholder="Ex: LOTE-104526 (ou deixe em branco p/ gerar auto)"
                  value={cadLote}
                  onChange={(e) => setCadLote(e.target.value)}
                />
                <button className="btn-cam-pequeno" onClick={abrirLeitorLote} title="Fotografar Carimbo de Lote e Validade com IA">
                  📷
                </button>
              </div>
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Data de Validade</label>
              <input
                type="date"
                id="cad-val"
                className="input-modal"
                value={cadVal}
                onChange={(e) => setCadVal(e.target.value)}
                required
              />
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Preço de Custo (R$)</label>
              <input
                type="number"
                id="cad-custo"
                className="input-modal"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={cadCusto}
                onChange={(e) => setCadCusto(e.target.value)}
              />
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Preço de Venda (R$)</label>
              <input
                type="number"
                id="cad-preco"
                className="input-modal"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={cadPreco}
                onChange={(e) => setCadPreco(e.target.value)}
                required
              />
            </div>
            <div className="grupo-input">
              <label className="rotulo-campo">Foto do Produto (Packshot Fundo Branco)</label>
              <input
                type="file"
                id="cad-foto"
                accept="image/*"
                style={{ width: '100%', fontSize: '0.85rem' }}
                onChange={carregarFoto}
              />
              <div
                className="preview-foto"
                id="preview-foto"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  marginTop: '6px',
                  height: '140px',
                }}
              >
                {fotoTemp ? (
                  <img
                    src={fotoTemp}
                    alt="Preview Produto Fundo Branco"
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sem foto (busque no Gemini ou envie um arquivo)</span>
                )}
              </div>
            </div>
            <div className="grupo-botoes">
              <button className="btn btn-salvar" onClick={salvarProduto}>
                Salvar
              </button>
              <button className="btn btn-cancelar" onClick={() => setModalCadastroVisivel(false)}>
                Cancelar
              </button>
            </div>
            <div className="msg" id="msg-cad">
              {msgCad}
            </div>
          </div>
        </div>
      </div>

      {/* STOCK REDUCTION MODAL */}
      <div className="modal" id="modalVenda" style={{ display: modalVendaVisivel ? 'flex' : 'none' }}>
        <div className="modal-conteudo">
          <div className="cab-modal" id="titulo-modal-baixa">
            {isProdAtualVencido ? 'Registro de Perda (Vencido)' : 'Baixa de Estoque'}
          </div>
          {prodAtual && (
            <div className="corpo-modal" id="corpo-venda">
              <div style={{ textAlign: 'center' }}>
                <div className="preview-foto" style={{ height: '120px', margin: '0 auto 8px auto', maxWidth: '160px' }}>
                  {prodAtual.foto ? <img src={prodAtual.foto} alt={prodAtual.nome} /> : 'Sem imagem'}
                </div>
                <h3 style={{ marginBottom: '2px', fontSize: '1rem' }}>{prodAtual.nome}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                  Cód: {prodAtual.codigo} | Lote: {prodAtual.lote || 'N/D'} | Val: {formatarData(prodAtual.validade)}
                </p>
                <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>
                  Venda: <b>R$ {prodAtual.preco_venda.toFixed(2)}</b> | Estoque: <b>{prodAtual.quantidade} un</b>
                </p>
              </div>
              <div className="grupo-input" style={{ marginTop: '10px' }}>
                <label className="rotulo-campo">Forma de Pagamento</label>
                <select
                  className="input-modal"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as any)}
                >
                  <option value="pix">📱 PIX</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="dinheiro">💵 Dinheiro (Espécie)</option>
                </select>
              </div>

              <div className="grupo-input" style={{ marginTop: '10px' }}>
                <label className="rotulo-campo">Quantidade para baixa / venda</label>
                <input
                  type="number"
                  id="qtd-baixa"
                  className="input-modal"
                  min="1"
                  max={prodAtual.quantidade}
                  value={qtdBaixa}
                  onChange={(e) => setQtdBaixa(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="total-texto">
                Total: R${' '}
                <span id="total-v">
                  {(prodAtual.preco_venda * (isNaN(qtdBaixa) ? 0 : qtdBaixa)).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="grupo-botoes">
                <button
                  className="btn btn-salvar"
                  style={{ background: isProdAtualVencido ? 'var(--erro)' : 'var(--sucesso)' }}
                  onClick={confirmarBaixa}
                >
                  {isProdAtualVencido ? 'Perda' : 'Baixar'}
                </button>
                <button className="btn btn-cancelar" onClick={() => setModalVendaVisivel(false)}>
                  Cancelar
                </button>
              </div>
              <div className="msg" id="msg-venda">
                {msgVenda}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS MODAL */}
      <div className="modal" id="modalNotificacoes" style={{ display: modalNotificacoesVisivel ? 'flex' : 'none' }}>
        <div className="modal-conteudo">
          <div className="cab-modal">Alertas de Vencimento</div>
          <div className="corpo-modal" id="corpo-notificacoes">
            {proximoVencimento.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '20px' }}>
                Nenhum alerta de validade no momento. 👍
              </div>
            ) : (
              <>
                <h4 style={{ color: '#d97706', fontSize: '0.9rem', marginBottom: '8px' }}>⚠️ Alertas de Validade</h4>
                {proximoVencimento.map((p) => {
                  const dataVal = new Date(p.validade + 'T00:00:00');
                  const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);

                  let textoStatus = '';
                  let corFundo = '#fef3c7';
                  let corTexto = '#92400e';

                  if (dias < 0) {
                    const diasPassados = Math.abs(dias);
                    textoStatus = `Vencido há ${diasPassados} dia${diasPassados > 1 ? 's' : ''}`;
                    corFundo = '#fee2e2';
                    corTexto = '#991b1b';
                  } else if (dias === 0) {
                    textoStatus = 'Vence hoje';
                    corFundo = '#fee2e2';
                    corTexto = '#991b1b';
                  } else {
                    textoStatus = `Vence em ${dias} dia${dias > 1 ? 's' : ''}`;
                  }

                  return (
                    <div
                      key={`notif_${p.codigo}_${p.validade}_${p.lote}`}
                      style={{
                        background: corFundo,
                        padding: '8px',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <b>{p.nome}</b>
                        <br />
                        <small>
                          Qtd: <b>{p.quantidade} un</b> | Lote: {p.lote || 'N/D'} |{' '}
                          <span style={{ color: corTexto, fontWeight: 600 }}>{textoStatus}</span>
                        </small>
                      </div>
                      <button
                        className="btn"
                        style={{ background: 'var(--primario)', color: '#fff', padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => abrirVenda(p.codigo, p.validade, p.lote || '')}
                      >
                        Ver
                      </button>
                    </div>
                  );
                })}
              </>
            )}
            <div style={{ marginTop: '15px', textAlign: 'right' }}>
              <button
                className="btn btn-cancelar"
                onClick={() => setModalNotificacoesVisivel(false)}
                style={{ width: '100%' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP DE ALERTA DE ACESSO RESTRITO / PERMISSÃO NEGADA */}
      <div className="modal" style={{ display: avisoRestrito ? 'flex' : 'none', zIndex: 999 }}>
        <div className="modal-conteudo" style={{ maxWidth: '420px', borderTop: '6px solid #ef4444' }}>
          <div className="cab-modal" style={{ background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fee2e2' }}>
            🔒 Acesso Bloqueado / Restrição de Perfil
          </div>
          <div className="corpo-modal" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛑</div>
            <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5, marginBottom: '20px' }}>
              {avisoRestrito}
            </p>
            <button
              className="btn"
              style={{ background: 'var(--primario)', color: '#fff', width: '100%', padding: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => setAvisoRestrito(null)}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>

      {/* MODAIS DE RELATÓRIO DE VENDAS E GRÁFICOS */}
      <RelatorioVendasModal
        visivel={modalRelatorioVendasVisivel}
        onFechar={() => setModalRelatorioVendasVisivel(false)}
        vendas={vendas}
        onEstornarVenda={handleEstornarVenda}
        operadores={listaOperadores}
        nomeLoja={nomeSupermercadoAtivo}
      />

      <GraficosVendasModal
        visivel={modalGraficosVendasVisivel}
        onFechar={() => setModalGraficosVendasVisivel(false)}
        vendas={vendas}
        estoque={estoque}
        nomeLoja={nomeSupermercadoAtivo}
      />
    </>
  );
}
