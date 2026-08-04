import { ItemEstoque } from '../types';

export interface ResultadoBalanca {
  isBalanca: boolean;
  codigoProduto?: string;
  precoTotal?: number;
  pesoKg?: number;
  itemEncontrado?: ItemEstoque;
  quantidadeCalculada?: number;
}

/**
 * Utilitário para decodificar códigos EAN-13 gerados por balanças (Hortifrúti e Açougue).
 * Padrão Brasileiro EAN-13 para etiquetas de balança:
 * Começa com '2'
 * Estrutura comum: 2 + CCCCC + T + VVVVV + D
 * - 2: Prefixo de balança (dígito 2)
 * - CCCCC: Código do produto (5 dígitos)
 * - T: Dígito verificador do produto ou tipo
 * - VVVVV: Valor Total da etiqueta em centavos (5 dígitos, ex: 00150 = R$ 1,50 | 01500 = R$ 15,00)
 * - D: Dígito verificador geral EAN-13
 */
export function processarCodigoBarraBalanca(codigoBarra: string, estoque: ItemEstoque[]): ResultadoBalanca {
  const limpo = codigoBarra.trim().replace(/\D/g, '');

  if (limpo.length !== 13 || !limpo.startsWith('2')) {
    return { isBalanca: false };
  }

  // Extrai trecho do código do produto (posições 1 a 6 = 5 dígitos)
  const codProdutoRaw = limpo.slice(1, 6); // ex: '00123'
  const codProdutoSemZeros = codProdutoRaw.replace(/^0+/, '') || codProdutoRaw; // ex: '123'

  // Extrai valor em centavos (posições 7 a 12 = 5 dígitos)
  const valorCentavos = parseInt(limpo.slice(7, 12), 10);
  const precoTotal = isNaN(valorCentavos) ? 0 : valorCentavos / 100;

  // Procura o produto no estoque cadastrado
  const itemEncontrado = estoque.find((p) => {
    const codProd = p.codigo.trim();
    const codBarraProd = (p.codigo_barras || '').trim();
    return (
      codProd === codProdutoRaw ||
      codProd === codProdutoSemZeros ||
      codBarraProd === codProdutoRaw ||
      codBarraProd === codProdutoSemZeros
    );
  });

  if (!itemEncontrado) {
    return {
      isBalanca: true,
      codigoProduto: codProdutoSemZeros,
      precoTotal,
    };
  }

  // Calcula a quantidade (peso em KG ou unidades) baseada no valor total lido da balança
  const precoUnitario = itemEncontrado.preco_venda || 1;
  const quantidadeCalculada = precoTotal > 0 ? parseFloat((precoTotal / precoUnitario).toFixed(3)) : 1;

  return {
    isBalanca: true,
    codigoProduto: codProdutoSemZeros,
    precoTotal,
    itemEncontrado,
    quantidadeCalculada,
  };
}
