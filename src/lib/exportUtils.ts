import { Venda, ItemEstoque } from '../types';

// Helper to trigger file download
function baixarArquivo(conteudo: string, nomeArquivo: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export Vendas to CSV
export function exportarVendasCSV(vendas: Venda[], nomeLoja: string) {
  const cabecalho = [
    'ID Venda',
    'Data',
    'Hora',
    'Operador',
    'Forma Pagamento',
    'Status',
    'Valor Total (R$)',
    'Itens (Qtd - Nome - Unit - Subtotal)',
    'Motivo Estorno',
  ].join(';');

  const linhas = vendas.map((v) => {
    const descItens = v.itens
      .map((i) => `${i.quantidade}x ${i.nome} (R$ ${i.preco_unitario.toFixed(2)})`)
      .join(' | ')
      .replace(/;/g, ' ');

    return [
      `"${v.id}"`,
      `"${v.data}"`,
      `"${v.hora}"`,
      `"${v.operadorNome}"`,
      `"${v.formaPagamento.toUpperCase()}"`,
      `"${v.status.toUpperCase()}"`,
      v.valorTotal.toFixed(2).replace('.', ','),
      `"${descItens}"`,
      `"${v.motivoEstorno || ''}"`,
    ].join(';');
  });

  const conteudo = [cabecalho, ...linhas].join('\n');
  const dataHoje = new Date().toISOString().split('T')[0];
  baixarArquivo(conteudo, `Vendas_${nomeLoja.replace(/\s+/g, '_')}_${dataHoje}.csv`, 'text/csv;charset=utf-8;');
}

// Export Estoque to CSV
export function exportarEstoqueCSV(estoque: ItemEstoque[], nomeLoja: string) {
  const cabecalho = [
    'Código/EAN',
    'Nome do Produto',
    'Quantidade Em Estoque',
    'Preço Custo (R$)',
    'Preço Venda (R$)',
    'Valor Total Estoque Venda (R$)',
    'Lote',
    'Validade',
    'Status Validade',
  ].join(';');

  const hoje = new Date().toISOString().split('T')[0];

  const linhas = estoque.map((item) => {
    let statusValidade = 'OK';
    if (item.validade) {
      if (item.validade < hoje) {
        statusValidade = 'VENCIDO';
      } else {
        const diffDays = Math.ceil(
          (new Date(item.validade).getTime() - new Date(hoje).getTime()) / (1000 * 3600 * 24)
        );
        if (diffDays <= 30) {
          statusValidade = `VENCE EM ${diffDays} DIAS`;
        }
      }
    }

    const valorTotalEstoque = item.quantidade * item.preco_venda;

    return [
      `"${item.codigo}"`,
      `"${item.nome}"`,
      item.quantidade,
      (item.preco_custo || 0).toFixed(2).replace('.', ','),
      item.preco_venda.toFixed(2).replace('.', ','),
      valorTotalEstoque.toFixed(2).replace('.', ','),
      `"${item.lote || ''}"`,
      `"${item.validade || ''}"`,
      `"${statusValidade}"`,
    ].join(';');
  });

  const conteudo = [cabecalho, ...linhas].join('\n');
  const dataHoje = new Date().toISOString().split('T')[0];
  baixarArquivo(conteudo, `Estoque_${nomeLoja.replace(/\s+/g, '_')}_${dataHoje}.csv`, 'text/csv;charset=utf-8;');
}
