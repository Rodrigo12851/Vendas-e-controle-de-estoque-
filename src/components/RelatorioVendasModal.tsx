import React, { useState } from 'react';
import { Venda, ItemEstoque, OperadorCaixa } from '../types';

interface RelatorioVendasModalProps {
  visivel: boolean;
  onFechar: () => void;
  vendas: Venda[];
  onEstornarVenda: (vendaId: string, motivo: string) => void;
  operadores: OperadorCaixa[];
  nomeLoja: string;
}

export const RelatorioVendasModal: React.FC<RelatorioVendasModalProps> = ({
  visivel,
  onFechar,
  vendas,
  onEstornarVenda,
  operadores,
  nomeLoja,
}) => {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'concluida' | 'estornada'>('todas');
  const [operadorFiltro, setOperadorFiltro] = useState<string>('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<'todos' | 'hoje' | '7dias' | 'mes'>('todos');

  // Modal de confirmação de estorno
  const [vendaEstornar, setVendaEstornar] = useState<Venda | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [erroEstorno, setErroEstorno] = useState('');

  // Venda expandida para ver itens detalhados
  const [vendaExpandidaId, setVendaExpandidaId] = useState<string | null>(null);

  if (!visivel) return null;

  // Datas para filtro de período
  const hojeDate = new Date();
  const inicioHoje = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), hojeDate.getDate()).getTime();

  const ha7Dias = inicioHoje - 7 * 24 * 60 * 60 * 1000;
  const inicioMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1).getTime();

  // Filtragem
  const vendasFiltradas = vendas.filter((v) => {
    // Status
    if (statusFiltro !== 'todas' && v.status !== statusFiltro) return false;

    // Operador
    if (operadorFiltro !== 'todos' && v.operadorId !== operadorFiltro && v.operadorNome !== operadorFiltro) {
      return false;
    }

    // Período
    if (periodoFiltro === 'hoje' && v.timestamp < inicioHoje) return false;
    if (periodoFiltro === '7dias' && v.timestamp < ha7Dias) return false;
    if (periodoFiltro === 'mes' && v.timestamp < inicioMes) return false;

    // Busca textual
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      const emId = v.id.toLowerCase().includes(termo);
      const emOperador = v.operadorNome.toLowerCase().includes(termo);
      const emItens = v.itens.some(
        (i) => i.nome.toLowerCase().includes(termo) || i.codigo.toLowerCase().includes(termo)
      );
      if (!emId && !emOperador && !emItens) return false;
    }

    return true;
  });

  // KPIs
  const vendasConcluidas = vendasFiltradas.filter((v) => v.status === 'concluida');
  const vendasEstornadas = vendasFiltradas.filter((v) => v.status === 'estornada');

  const faturamentoBruto = vendasConcluidas.reduce((acc, v) => acc + v.valorTotal, 0);
  const valorTotalEstornos = vendasEstornadas.reduce((acc, v) => acc + v.valorTotal, 0);

  const handleConfirmarEstorno = () => {
    if (!vendaEstornar) return;
    onEstornarVenda(vendaEstornar.id, motivoEstorno || 'Solicitado pelo supervisor');
    setVendaEstornar(null);
    setMotivoEstorno('');
    setErroEstorno('');
  };

  const getBadgePagamento = (forma: string) => {
    switch (forma) {
      case 'pix':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>📱 PIX</span>;
      case 'cartao_credito':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>💳 Cartão Crédito</span>;
      case 'cartao_debito':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>💳 Cartão Débito</span>;
      case 'dinheiro':
        return <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>💵 Dinheiro</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Outros</span>;
    }
  };

  return (
    <div className="tela-relatorio-cheia" style={{ display: 'flex', zIndex: 400 }}>
      {/* CABEÇALHO */}
      <div className="cabecalho-relatorio">
        <h2>🧾 Relatório Geral de Vendas ({nomeLoja})</h2>
        <button className="btn-voltar-rel" onClick={onFechar}>
          ✕ Fechar
        </button>
      </div>

      {/* CORPO */}
      <div className="corpo-relatorio-cheio" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
        {/* CARDS KPIS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total de Vendas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {vendasConcluidas.length} <span style={{ fontSize: '0.85rem', color: '#16a34a' }}>vendas</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Faturamento Real (Líquido)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
              R$ {faturamentoBruto.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Vendas Estornadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
              {vendasEstornadas.length} <span style={{ fontSize: '0.85rem', color: '#991b1b' }}>(R$ {valorTotalEstornos.toFixed(2).replace('.', ',')})</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-modal"
              placeholder="🔍 Buscar por operador, ID da venda ou nome/código do produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />

            <select
              className="input-modal"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="todas">Status: Todas</option>
              <option value="concluida">🟢 Apenas Concluídas</option>
              <option value="estornada">🔴 Apenas Estornadas</option>
            </select>

            <select
              className="input-modal"
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value as any)}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="todos">Período: Todo o Histórico</option>
              <option value="hoje">📅 Apenas Hoje</option>
              <option value="7dias">📅 Últimos 7 Dias</option>
              <option value="mes">📅 Este Mês</option>
            </select>

            <select
              className="input-modal"
              value={operadorFiltro}
              onChange={(e) => setOperadorFiltro(e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="todos">Operador: Todos</option>
              {operadores.map((op) => (
                <option key={op.id} value={op.id}>
                  👤 {op.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABELA / LISTA DE VENDAS */}
        <div className="tabela-relatorio">
          {vendasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '36px' }}>
              Nenhuma venda encontrada para os filtros selecionados.
            </div>
          ) : (
            vendasFiltradas.map((venda) => {
              const isEstornada = venda.status === 'estornada';
              const isExpandida = vendaExpandidaId === venda.id;

              return (
                <div
                  key={venda.id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: isEstornada ? '#fef2f2' : '#ffffff',
                    opacity: isEstornada ? 0.85 : 1,
                  }}
                >
                  {/* CABEÇALHO DA LINHA DE VENDA */}
                  <div
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: '0.92rem', color: '#0f172a' }}>Venda #{venda.id.slice(-6)}</b>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          📅 {venda.data} às {venda.hora}
                        </span>
                        {getBadgePagamento(venda.formaPagamento)}
                        {isEstornada ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            🔴 Estornada
                          </span>
                        ) : (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            🟢 Concluída
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '4px' }}>
                        👤 <b>Vendedor/Caixa:</b> {venda.operadorNome}
                      </div>

                      {isEstornada && venda.motivoEstorno && (
                        <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '4px', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px' }}>
                          ⚠️ Motivo do Estorno: {venda.motivoEstorno} (Por: {venda.operadorEstornoNome || 'Supervisor'}) em {venda.dataEstorno}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isEstornada ? '#991b1b' : '#16a34a' }}>
                        R$ {venda.valorTotal.toFixed(2).replace('.', ',')}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-acao-rel btn-editar-rel"
                          onClick={() => setVendaExpandidaId(isExpandida ? null : venda.id)}
                        >
                          {isExpandida ? '▲ Ocultar Itens' : '▼ Ver Itens (' + venda.itens.reduce((acc, i) => acc + i.quantidade, 0) + ' un)'}
                        </button>

                        {!isEstornada && (
                          <button
                            className="btn-acao-rel btn-excluir-rel"
                            style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}
                            onClick={() => setVendaEstornar(venda)}
                          >
                            🔄 Estornar Venda
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ITENS DETALHADOS DA VENDA */}
                  {isExpandida && (
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        📋 Itens desta Venda:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {venda.itens.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.82rem',
                              background: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.foto && (
                                <img src={item.foto} alt={item.nome} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                              )}
                              <div>
                                <b>{item.nome}</b>
                                <span style={{ color: '#64748b', marginLeft: '6px' }}>
                                  (Cód: {item.codigo} {item.lote ? `| Lote: ${item.lote}` : ''})
                                </span>
                              </div>
                            </div>

                            <div>
                              <span>{item.quantidade} un × R$ {item.preco_unitario.toFixed(2)} = </span>
                              <b style={{ color: '#0284c7' }}>R$ {item.subtotal.toFixed(2)}</b>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE ESTORNO */}
      {vendaEstornar && (
        <div className="modal" style={{ display: 'flex', zIndex: 600 }}>
          <div className="modal-conteudo" style={{ maxWidth: '420px', borderTop: '6px solid #dc2626' }}>
            <div className="cab-modal" style={{ background: '#fee2e2', color: '#991b1b' }}>
              🔄 Confirmar Estorno de Venda
            </div>
            <div className="corpo-modal" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.88rem', color: '#334155' }}>
                Tem certeza que deseja estornar a <b>Venda #{vendaEstornar.id.slice(-6)}</b> no valor de{' '}
                <b style={{ color: '#dc2626' }}>R$ {vendaEstornar.valorTotal.toFixed(2)}</b>?
              </p>

              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem', color: '#475569' }}>
                📦 <b>Resultado do Estorno:</b> Os <b>{vendaEstornar.itens.reduce((a, b) => a + b.quantidade, 0)} itens</b> vendidos serão devolvidos automaticamente ao estoque do supermercado!
              </div>

              <div className="grupo-input" style={{ marginBottom: 0 }}>
                <label className="rotulo-campo">Motivo do Estorno / Observação</label>
                <input
                  type="text"
                  className="input-modal"
                  placeholder="Ex: Desistência do cliente / Erro no caixa"
                  value={motivoEstorno}
                  onChange={(e) => setMotivoEstorno(e.target.value)}
                />
              </div>

              <div className="grupo-botoes">
                <button
                  className="btn btn-salvar"
                  style={{ background: '#dc2626' }}
                  onClick={handleConfirmarEstorno}
                >
                  Confirmar Estorno & Devolver ao Estoque
                </button>
                <button
                  className="btn btn-cancelar"
                  onClick={() => setVendaEstornar(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
