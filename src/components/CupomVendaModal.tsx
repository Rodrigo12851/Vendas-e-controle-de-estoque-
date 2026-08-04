import React from 'react';
import { Venda, Supermercado } from '../types';

interface CupomVendaModalProps {
  visivel: boolean;
  onFechar: () => void;
  venda: Venda | null;
  loja: Supermercado | null;
}

export const CupomVendaModal: React.FC<CupomVendaModalProps> = ({
  visivel,
  onFechar,
  venda,
  loja,
}) => {
  if (!visivel || !venda) return null;

  const handleImprimir = () => {
    window.print();
  };

  const getFormaPagamentoTexto = (forma: string) => {
    switch (forma) {
      case 'pix': return 'PIX ONLINE';
      case 'cartao_credito': return 'CARTÃO DE CRÉDITO';
      case 'cartao_debito': return 'CARTÃO DE DÉBITO';
      case 'dinheiro': return 'DINHEIRO';
      default: return forma.toUpperCase();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '420px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧾 Cupom de Venda
          </h3>
          <button className="btn-fechar-modal" onClick={onFechar}>&times;</button>
        </div>

        {/* CUPOM TÉRMICO FORMATADO PARA IMPRESSÃO */}
        <div className="cupom-termico-box">
          <div className="cupom-header">
            <h4>{loja?.nome || 'SUPERMERCADO'}</h4>
            <p>CNPJ: {loja?.cnpj || '00.000.000/0001-00'}</p>
            <p>CUPOM NÃO FISCAL DE VENDA</p>
            <div className="cupom-divisor">-----------------------------------------</div>
            <p><strong>Nº VENDA:</strong> #{venda.id.slice(-8).toUpperCase()}</p>
            <p><strong>DATA/HORA:</strong> {venda.data} {venda.hora}</p>
            <p><strong>OPERADOR:</strong> {venda.operadorNome}</p>
            <div className="cupom-divisor">-----------------------------------------</div>
          </div>

          <table className="cupom-tabela">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>ITEM</th>
                <th style={{ textAlign: 'center' }}>QTD</th>
                <th style={{ textAlign: 'right' }}>UN(R$)</th>
                <th style={{ textAlign: 'right' }}>TOTAL(R$)</th>
              </tr>
            </thead>
            <tbody>
              {venda.itens.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'left', wordBreak: 'break-word' }}>{item.nome}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantidade}</td>
                  <td style={{ textAlign: 'right' }}>{item.preco_unitario.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cupom-divisor">-----------------------------------------</div>

          <div className="cupom-totais">
            <div className="cupom-linha-total">
              <span>FORMA PGTO:</span>
              <span><strong>{getFormaPagamentoTexto(venda.formaPagamento)}</strong></span>
            </div>
            <div className="cupom-linha-total highlight-total">
              <span>VALOR TOTAL:</span>
              <span><strong>R$ {venda.valorTotal.toFixed(2)}</strong></span>
            </div>
            {venda.status === 'estornada' && (
              <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '8px', textAlign: 'center' }}>
                ⚠️ VENDA CANCELADA / ESTORNADA
              </div>
            )}
          </div>

          <div className="cupom-divisor">-----------------------------------------</div>

          <div className="cupom-footer">
            <p style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Obrigado pela preferência!</p>
            <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Sistema Integrado de Gestão de Supermercados</p>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            className="btn btn-salvar"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleImprimir}
          >
            🖨️ Imprimir Cupom / PDF
          </button>
          <button className="btn btn-cancelar" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
