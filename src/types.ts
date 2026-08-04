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
  gestao_caixa: boolean;      // 💵 Turno de Caixa (Abertura, Sangria e Fechamento)
  estoque: boolean;           // 📦 Cadastro & Gestão de Estoque
  usuarios: boolean;          // 👥 Gestão de Operadores de Caixa & Equipe
  relatorios: boolean;        // 📊 Relatórios Financeiros & Vendas
  estorno: boolean;           // ↩️ Estorno & Cancelamento de Vendas
  graficos: boolean;          // 📈 Gráficos & Analytics de Desempenho
  inteligencia_estoque: boolean; // 💡 Inteligência de Compras & Giro
  ocr_ia: boolean;            // 🤖 Consulta Inteligente OCR / IA
  etiquetas: boolean;         // 🏷️ Impressão de Etiquetas & Balança
  alertas: boolean;           // 🔔 Alertas de Validade
  alertas_whatsapp: boolean;  // 📱 Disparo de Alertas no WhatsApp / E-mail
  baixa_estoque: boolean;     // 🗑️ Baixa Manual & Ajuste de Estoque
  exportar_dados: boolean;    // 📥 Exportação de Relatórios
}

export interface PermissoesOperador {
  vender: boolean;             // 🛒 Realizar Vendas no Caixa
  gestao_caixa: boolean;       // 💵 Abrir/Fechar Turno de Caixa e Sangria
  dar_desconto: boolean;       // 💲 Conceder Desconto
  alterar_preco: boolean;      // ✏️ Alterar Preço Unitário de Venda
  estornar_venda: boolean;     // ↩️ Estornar / Cancelar Venda
  cadastrar_produtos: boolean; // 📦 Cadastrar/Editar Produtos
  excluir_produtos: boolean;   // ❌ Excluir Produtos/Lotes
  baixa_estoque: boolean;      // 🗑️ Dar Baixa Manual em Estoque
  ver_relatorios: boolean;     // 📊 Ver Faturamento & Relatórios
  ver_graficos: boolean;       // 📈 Ver Gráficos & Desempenho
  inteligencia_estoque: boolean; // 💡 Ver Inteligência de Compras & Giro
  gerenciar_equipe: boolean;   // 👥 Gerenciar Outros Funcionários
  imprimir_etiquetas: boolean; // 🏷️ Imprimir Etiquetas
  alertas_whatsapp: boolean;   // 📱 Disparar Alertas de Validade no WhatsApp
  usar_ocr_ia: boolean;        // 🤖 Usar Consulta Inteligente OCR / IA
  exportar_relatorios: boolean;// 📥 Exportar / Baixar Relatórios
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

export interface MovimentacaoCaixa {
  id: string;
  lojaId: string;
  sessaoId: string;
  tipo: 'suprimento' | 'sangria' | 'venda' | 'estorno';
  valor: number;
  descricao: string;
  operadorId: string;
  operadorNome: string;
  dataHora: string;
}

export interface SessaoCaixaTurno {
  id: string;
  lojaId: string;
  operadorId: string;
  operadorNome: string;
  dataAbertura: string;
  horaAbertura: string;
  status: 'aberto' | 'fechado';
  valorInicialSuprimento: number;
  dataFechamento?: string;
  horaFechamento?: string;
  valorDinheiroInformado?: number;
  valorCartaoInformado?: number;
  valorPixInformado?: number;
  valorDinheiroEsperado?: number;
  diferencaDinheiro?: number; // positivo = sobra, negativo = falta
  observacoesFechamento?: string;
}

export interface LogAuditoria {
  id: string;
  lojaId: string;
  operadorId: string;
  operadorNome: string;
  acao: string;
  detalhes: string;
  dataHora: string;
}

export const PERMISSOES_LOJA_PADRAO: PermissoesLoja = {
  caixa: true,
  gestao_caixa: true,
  estoque: true,
  usuarios: true,
  relatorios: true,
  estorno: true,
  graficos: true,
  inteligencia_estoque: true,
  ocr_ia: true,
  etiquetas: true,
  alertas: true,
  alertas_whatsapp: true,
  baixa_estoque: true,
  exportar_dados: true,
};

export const PERMISSOES_CAIXA_PADRAO: PermissoesOperador = {
  vender: true,
  gestao_caixa: true,
  dar_desconto: false,
  alterar_preco: false,
  estornar_venda: false,
  cadastrar_produtos: false,
  excluir_produtos: false,
  baixa_estoque: false,
  ver_relatorios: false,
  ver_graficos: false,
  inteligencia_estoque: false,
  gerenciar_equipe: false,
  imprimir_etiquetas: true,
  alertas_whatsapp: false,
  usar_ocr_ia: true,
  exportar_relatorios: false,
};

export const PERMISSOES_ADMIN_PADRAO: PermissoesOperador = {
  vender: true,
  gestao_caixa: true,
  dar_desconto: true,
  alterar_preco: true,
  estornar_venda: true,
  cadastrar_produtos: true,
  excluir_produtos: true,
  baixa_estoque: true,
  ver_relatorios: true,
  ver_graficos: true,
  inteligencia_estoque: true,
  gerenciar_equipe: true,
  imprimir_etiquetas: true,
  alertas_whatsapp: true,
  usar_ocr_ia: true,
  exportar_relatorios: true,
};
