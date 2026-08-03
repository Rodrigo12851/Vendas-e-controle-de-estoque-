export interface ProdutoCatalogo {
  codigo: string;
  nome: string;
  marca?: string;
  categoria?: string;
  unidade_medida?: string;
  imagem?: string;
  descricao?: string;
}

export interface ItemEstoque {
  codigo_barras?: string;
  codigo: string;
  nome: string;
  quantidade: number;
  lote: string;
  validade: string;
  preco_custo?: number;
  preco_venda: number;
  foto?: string;
}

export interface PermissoesLoja {
  caixa: boolean;             // 🛒 PDV & Registro de Vendas
  estoque: boolean;           // 📦 Cadastro & Gestão de Estoque
  usuarios: boolean;          // 👥 Gestão de Operadores de Caixa & Equipe
  relatorios: boolean;        // 📊 Relatórios Financeiros & Vendas
  ocr_ia: boolean;            // 🤖 Consulta Inteligente OCR / IA
  etiquetas: boolean;         // 🏷️ Impressão de Etiquetas
  alertas: boolean;           // 🔔 Alertas de Validade
  baixa_estoque: boolean;     // 🗑️ Baixa Manual & Ajuste de Estoque
}

export interface PermissoesOperador {
  vender: boolean;             // 🛒 Realizar Vendas no Caixa
  dar_desconto: boolean;       // 💲 Conceder Desconto
  alterar_preco: boolean;      // ✏️ Alterar Preço Unitário de Venda
  cadastrar_produtos: boolean; // 📦 Cadastrar/Editar Produtos
  baixa_estoque: boolean;      // 🗑️ Dar Baixa Manual em Estoque
  ver_relatorios: boolean;     // 📊 Ver Faturamento & Relatórios
  gerenciar_equipe: boolean;   // 👥 Gerenciar Outros Funcionários
  imprimir_etiquetas: boolean; // 🏷️ Imprimir Etiquetas
}

export interface OperadorCaixa {
  id: string;
  lojaId: string;
  nome: string;
  cargo: 'Operador de Caixa' | 'Supervisor' | 'Administrador';
  cpfOuUsuario: string;
  pinSenha: string;
  permissoes: PermissoesOperador;
  ativo: boolean;
  dataCadastro?: string;
}

export interface Supermercado {
  id: string;
  nome: string;
  cnpj: string;
  senha: string;
  dataCadastro?: string;
  permissoesLoja?: PermissoesLoja;
}

export interface VendaItem {
  codigo: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo?: number;
  subtotal: number;
  lote?: string;
  validade?: string;
  foto?: string;
}

export interface Venda {
  id: string;
  lojaId: string;
  data: string; // ISO YYYY-MM-DD
  hora: string; // HH:mm
  timestamp: number;
  operadorId: string;
  operadorNome: string;
  itens: VendaItem[];
  valorTotal: number;
  formaPagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';
  status: 'concluida' | 'estornada';
  dataEstorno?: string;
  operadorEstornoNome?: string;
  motivoEstorno?: string;
}

export const PERMISSOES_LOJA_PADRAO: PermissoesLoja = {
  caixa: true,
  estoque: true,
  usuarios: true,
  relatorios: true,
  ocr_ia: true,
  etiquetas: true,
  alertas: true,
  baixa_estoque: true,
};

export const PERMISSOES_CAIXA_PADRAO: PermissoesOperador = {
  vender: true,
  dar_desconto: false,
  alterar_preco: false,
  cadastrar_produtos: false,
  baixa_estoque: false,
  ver_relatorios: false,
  gerenciar_equipe: false,
  imprimir_etiquetas: true,
};

export const PERMISSOES_ADMIN_PADRAO: PermissoesOperador = {
  vender: true,
  dar_desconto: true,
  alterar_preco: true,
  cadastrar_produtos: true,
  baixa_estoque: true,
  ver_relatorios: true,
  gerenciar_equipe: true,
  imprimir_etiquetas: true,
};
