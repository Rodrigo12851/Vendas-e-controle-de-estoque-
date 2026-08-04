import React, { useState } from 'react';
import { SessaoCaixaTurno, MovimentacaoCaixa, Venda, Supermercado, OperadorCaixa } from '../types';

interface GestaoCaixaModalProps {
  visivel: boolean;
  onFechar: () => void;
  sessaoAtiva: SessaoCaixaTurno | null;
  vendasSessao: Venda[];
  movimentacoes: MovimentacaoCaixa[];
  onAbrirCaixa: (valorInicial: number) => void;
  onRegistrarMovimentacao: (tipo: 'sangria' | 'suprimento', valor: number, descricao: string) => void;
  onFecharCaixa: (dinheiroInformado: number, cartaoInformado: number, pixInformado: number, obs: string) => void;
  operadorAtivo: OperadorCaixa | null;
  loja: Supermercado | null;
}

export const GestaoCaixaModal: React.FC<GestaoCaixaModalProps> = ({
  visivel,
  onFechar,
  sessaoAtiva,
  vendasSessao,
  movimentacoes,
  onAbrirCaixa,
  onRegistrarMovimentacao,
  onFecharCaixa,
  operadorAtivo,
  loja,
}) => {
  const [aba, setAba] = useState<'status' | 'sangria_suprimento' | 'fechamento'>('status');

  // Form Abertura
  const [valorInicialStr, setValorInicialStr] = useState('100.00');

  // Form Movimentação (Sangria/Suprimento)
  const [tipoMov, setTipoMov] = useState<'sangria' | 'suprimento'>('sangria');
  const [valorMovStr, setValorMovStr] = useState('');
  const [descMov, setDescMov] = useState('');

  // Form Fechamento (Conferência Cega)
  const [dinheiroInfStr, setDinheiroInfStr] = useState('');
  const [cartaoInfStr, setCartaoInfStr] = useState('');
  const [pixInfStr, setPixInfStr] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');

  if (!visivel) return null;

  // Totais Esperados do Caixa Ativo
  const totalSuprimentos = movimentacoes
    .filter((m) => m.tipo === 'suprimento')
    .reduce((acc, m) => acc + m.valor, 0);

  const totalSangrias = movimentacoes
    .filter((m) => m.tipo === 'sangria')
    .reduce((acc, m) => acc + m.valor, 0);

  const vendasConcluidas = vendasSessao.filter((v) => v.status === 'concluida');

  const totalVendasDinheiro = vendasConcluidas
    .filter((v) => v.formaPagamento === 'dinheiro')
    .reduce((acc, v) => acc + v.valorTotal, 0);

  const totalVendasCartao = vendasConcluidas
    .filter((v) => v.formaPagamento === 'cartao_credito' || v.formaPagamento === 'cartao_debito')
    .reduce((acc, v) => acc + v.valorTotal, 0);

  const totalVendasPix = vendasConcluidas
    .filter((v) => v.formaPagamento === 'pix')
    .reduce((acc, v) => acc + v.valorTotal, 0);

  const saldoDinheiroEmEspecieEsperado =
    (sessaoAtiva?.valorInicialSuprimento || 0) + totalSuprimentos + totalVendasDinheiro - totalSangrias;

  const handleSubmeterAbertura = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorInicialStr.replace(',', '.')) || 0;
    onAbrirCaixa(val);
  };

  const handleSubmeterMovimentacao = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorMovStr.replace(',', '.')) || 0;
    if (val <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }
    if (!descMov.trim()) {
      alert('Informe o motivo ou descrição da movimentação.');
      return;
    }
    onRegistrarMovimentacao(tipoMov, val, descMov);
    setValorMovStr('');
    setDescMov('');
    setAba('status');
  };

  const handleSubmeterFechamento = (e: React.FormEvent) => {
    e.preventDefault();
    const din = parseFloat(dinheiroInfStr.replace(',', '.')) || 0;
    const car = parseFloat(cartaoInfStr.replace(',', '.')) || 0;
    const pix = parseFloat(pixInfStr.replace(',', '.')) || 0;

    onFecharCaixa(din, car, pix, obsFechamento);
    setAba('status');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '650px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💵 Gestão do Turno de Caixa & Sangria
          </h3>
          <button className="btn-fechar-modal" onClick={onFechar}>&times;</button>
        </div>

        {/* MENSAGEM SE NÃO HOUVER CAIXA ABERTO */}
        {!sessaoAtiva || sessaoAtiva.status === 'fechado' ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h4 style={{ color: '#991b1b', margin: '0 0 8px 0' }}>🔴 Caixa Fechado para este Operador</h4>
            <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '16px' }}>
              Operador: <strong>{operadorAtivo?.nome || 'Operador Padrão'}</strong> ({loja?.nome})
            </p>

            <form onSubmit={handleSubmeterAbertura} style={{ maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Fundo de Troco Inicial (Suprimento de Abertura R$):
              </label>
              <input
                type="number"
                step="0.01"
                className="input-padrao"
                value={valorInicialStr}
                onChange={(e) => setValorInicialStr(e.target.value)}
                required
                style={{ width: '100%', marginBottom: '16px' }}
              />
              <button
                type="submit"
                className="btn btn-salvar"
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600 }}
              >
                🔓 Abrir Caixa Agora
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* TABS DE NAVEGAÇÃO INTERNA DO CAIXA */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                className={`btn ${aba === 'status' ? 'btn-salvar' : ''}`}
                style={{ flex: '1 1 120px', padding: '8px 10px', fontSize: '0.82rem', background: aba === 'status' ? undefined : '#f1f5f9', color: aba === 'status' ? undefined : '#334155' }}
                onClick={() => setAba('status')}
              >
                📊 Resumo do Turno
              </button>
              <button
                className={`btn ${aba === 'sangria_suprimento' ? 'btn-salvar' : ''}`}
                style={{ flex: '1 1 130px', padding: '8px 10px', fontSize: '0.82rem', background: aba === 'sangria_suprimento' ? undefined : '#f1f5f9', color: aba === 'sangria_suprimento' ? undefined : '#334155' }}
                onClick={() => setAba('sangria_suprimento')}
              >
                💸 Sangria / Suprimento
              </button>
              <button
                className={`btn ${aba === 'fechamento' ? 'btn-salvar' : ''}`}
                style={{ flex: '1 1 120px', padding: '8px 10px', fontSize: '0.82rem', background: aba === 'fechamento' ? undefined : '#f1f5f9', color: aba === 'fechamento' ? undefined : '#334155' }}
                onClick={() => setAba('fechamento')}
              >
                🔒 Fechar Caixa
              </button>
            </div>

            {/* ABA 1: RESUMO DO TURNO */}
            {aba === 'status' && (
              <div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, display: 'block' }}>CAIXA ATIVO E ABERTO</span>
                    <strong style={{ fontSize: '1rem', color: '#14532d' }}>{sessaoAtiva.operadorNome}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#15803d', display: 'block' }}>Aberto às {sessaoAtiva.horaAbertura} em {sessaoAtiva.dataAbertura}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Fundo Inicial:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#14532d' }}>R$ {sessaoAtiva.valorInicialSuprimento.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fit, minmax(160px, 1fr) )', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💵 Dinheiro em Vendas</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#16a34a' }}>R$ {totalVendasDinheiro.toFixed(2)}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💳 Cartão Crédito/Débito</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2563eb' }}>R$ {totalVendasCartao.toFixed(2)}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>⚡ Vendas PIX</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0d9488' }}>R$ {totalVendasPix.toFixed(2)}</div>
                  </div>

                  <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9f1239' }}>🔻 Sangrias Realizadas</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e11d48' }}>- R$ {totalSangrias.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>💰 Saldo em Dinheiro Esperado na Gaveta:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7' }}>R$ {saldoDinheiroEmEspecieEsperado.toFixed(2)}</span>
                </div>

                {/* HISTÓRICO DE SANGRIAS E SUPRIMENTOS DO TURNO */}
                <h4 style={{ fontSize: '0.88rem', margin: '0 0 8px 0', color: '#334155' }}>Histórico de Lançamentos do Turno:</h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                  {movimentacoes.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Nenhuma sangria ou suprimento registrado até o momento.
                    </div>
                  ) : (
                    movimentacoes.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                        <div>
                          <strong style={{ color: m.tipo === 'sangria' ? '#dc2626' : '#16a34a' }}>
                            {m.tipo === 'sangria' ? '🔻 SANGRIA' : '🟢 SUPRIMENTO'}
                          </strong>
                          <span style={{ color: '#64748b', marginLeft: '6px' }}>({m.descricao})</span>
                        </div>
                        <div>
                          <strong>R$ {m.valor.toFixed(2)}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '6px' }}>{m.dataHora.split(' ')[1]}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: REGISTRO DE SANGRIA / SUPRIMENTO */}
            {aba === 'sangria_suprimento' && (
              <form onSubmit={handleSubmeterMovimentacao} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Lançamento de Sangria ou Suprimento de Troco</h4>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tipo de Movimentação:</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tipoMov"
                        value="sangria"
                        checked={tipoMov === 'sangria'}
                        onChange={() => setTipoMov('sangria')}
                      />
                      🔻 Sangria (Retirada de Dinheiro para Cofre/Depósito)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tipoMov"
                        value="suprimento"
                        checked={tipoMov === 'suprimento'}
                        onChange={() => setTipoMov('suprimento')}
                      />
                      🟢 Suprimento (Entrada Adicional de Troco na Gaveta)
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Valor (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-padrao"
                    placeholder="0.00"
                    value={valorMovStr}
                    onChange={(e) => setValorMovStr(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Motivo / Descrição:</label>
                  <input
                    type="text"
                    className="input-padrao"
                    placeholder="Ex: Recolhimento de nota alta para o cofre / Troco extra em moedas"
                    value={descMov}
                    onChange={(e) => setDescMov(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <button type="submit" className="btn btn-salvar" style={{ width: '100%', padding: '10px', fontWeight: 600 }}>
                  Confirmar Lançamento de {tipoMov === 'sangria' ? 'Sangria' : 'Suprimento'}
                </button>
              </form>
            )}

            {/* ABA 3: FECHAMENTO DE CAIXA COM CONFERÊNCIA CEGA */}
            {aba === 'fechamento' && (
              <form onSubmit={handleSubmeterFechamento} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>🔒 Fechamento de Turno (Conferência Cega)</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                  Digite os valores contados fisicamente na gaveta para o sistema verificar sobras ou faltas.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      💵 Dinheiro na Gaveta (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-padrao"
                      placeholder="0.00"
                      value={dinheiroInfStr}
                      onChange={(e) => setDinheiroInfStr(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      💳 Comprovantes Cartão (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-padrao"
                      placeholder="0.00"
                      value={cartaoInfStr}
                      onChange={(e) => setCartaoInfStr(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      ⚡ Total PIX do Turno (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-padrao"
                      placeholder="0.00"
                      value={pixInfStr}
                      onChange={(e) => setPixInfStr(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Observações do Fechamento:
                  </label>
                  <textarea
                    className="input-padrao"
                    rows={2}
                    placeholder="Alguma observação importante sobre o turno..."
                    value={obsFechamento}
                    onChange={(e) => setObsFechamento(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{ width: '100%', padding: '12px', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}
                >
                  🔒 Encerrar Turno e Finalizar Caixa
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
