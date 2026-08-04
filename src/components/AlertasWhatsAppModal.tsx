import React, { useState } from 'react';
import { ItemEstoque, Supermercado } from '../types';

interface AlertasWhatsAppModalProps {
  visivel: boolean;
  onFechar: () => void;
  estoque: ItemEstoque[];
  loja: Supermercado | null;
}

export const AlertasWhatsAppModal: React.FC<AlertasWhatsAppModalProps> = ({
  visivel,
  onFechar,
  estoque,
  loja,
}) => {
  const [diasFiltro, setDiasFiltro] = useState<number>(30);
  const [copiado, setCopiado] = useState(false);

  if (!visivel) return null;

  const hoje = new Date();
  const hojeIso = hoje.toISOString().split('T')[0];

  // Filtra produtos vencendo nos próximos X dias ou já vencidos
  const produtosAvisar = estoque.filter((item) => {
    if (!item.validade) return false;
    const diffTime = new Date(item.validade).getTime() - new Date(hojeIso).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    return diffDays <= diasFiltro;
  });

  // Ordena por validade mais próxima
  produtosAvisar.sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));

  // Formata mensagem para WhatsApp
  const nomeLoja = loja?.nome || 'SUPERMERCADO';
  const dataFormatada = hoje.toLocaleDateString('pt-BR');

  let mensagemWhatsApp = `🚨 *RELATÓRIO DE ALERTA DE VALIDADE* 🚨\n`;
  mensagemWhatsApp += `🏪 *Loja:* ${nomeLoja}\n`;
  mensagemWhatsApp += `📅 *Data do Relatório:* ${dataFormatada}\n`;
  mensagemWhatsApp += `⚠️ *Filtro:* Produtos vencendo em até ${diasFiltro} dias\n`;
  mensagemWhatsApp += `-----------------------------------\n\n`;

  if (produtosAvisar.length === 0) {
    mensagemWhatsApp += `✅ *Excelente!* Nenhum produto encontrado próximo do vencimento nos próximos ${diasFiltro} dias.\n`;
  } else {
    produtosAvisar.forEach((p, idx) => {
      const diffTime = new Date(p.validade).getTime() - new Date(hojeIso).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      const statusVal = diffDays < 0 ? '❌ JÁ VENCIDO' : `⚠️ Vence em ${diffDays} dias`;

      mensagemWhatsApp += `${idx + 1}. *${p.nome}*\n`;
      mensagemWhatsApp += `   • Cód: ${p.codigo} | Qtd: ${p.quantidade} un\n`;
      mensagemWhatsApp += `   • Validade: ${p.validade} (${statusVal})\n`;
      mensagemWhatsApp += `   • Preço Venda: R$ ${p.preco_venda.toFixed(2)}\n\n`;
    });

    mensagemWhatsApp += `-----------------------------------\n`;
    mensagemWhatsApp += `💡 *Recomendação:* Aplicar desconto promocional imediato nos itens apontados para liquidação de estoque!`;
  }

  const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}`;

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(mensagemWhatsApp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '680px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📱 Alertas de Validade no WhatsApp / E-mail
          </h3>
          <button className="btn-fechar-modal" onClick={onFechar}>&times;</button>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginRight: '8px' }}>
              Período de Alerta:
            </label>
            <select
              className="input-padrao"
              value={diasFiltro}
              onChange={(e) => setDiasFiltro(Number(e.target.value))}
              style={{ width: 'auto', display: 'inline-block' }}
            >
              <option value={7}>🚨 Próximos 7 dias (Urgente)</option>
              <option value={15}>⚠️ Próximos 15 dias</option>
              <option value={30}>📅 Próximos 30 dias</option>
              <option value={60}>📆 Próximos 60 dias</option>
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>
            {produtosAvisar.length} produto(s) requerem atenção
          </div>
        </div>

        {/* PRÉ-VISUALIZAÇÃO DA MENSAGEM */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
            Pré-visualização da Mensagem Pronta para Envio:
          </label>
          <textarea
            readOnly
            className="input-padrao"
            rows={10}
            value={mensagemWhatsApp}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', background: '#f1f5f9', color: '#0f172a' }}
          />
        </div>

        {/* BOTOES DE DISPARO */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              flex: 1,
              minWidth: '220px',
              background: '#25D366',
              color: '#fff',
              textAlign: 'center',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            📲 Enviar Direto no WhatsApp
          </a>

          <button
            className="btn btn-salvar"
            style={{ flex: 1, minWidth: '180px', padding: '12px', fontSize: '0.95rem' }}
            onClick={handleCopiarTexto}
          >
            {copiado ? '✅ Mensagem Copiada!' : '📋 Copiar para E-mail / Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
