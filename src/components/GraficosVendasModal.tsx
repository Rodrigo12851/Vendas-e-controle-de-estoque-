import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { Venda, ItemEstoque } from '../types';

interface GraficosVendasModalProps {
  visivel: boolean;
  onFechar: () => void;
  vendas: Venda[];
  estoque: ItemEstoque[];
  nomeLoja: string;
}

export const GraficosVendasModal: React.FC<GraficosVendasModalProps> = ({
  visivel,
  onFechar,
  vendas,
  estoque,
  nomeLoja,
}) => {
  const [periodoGrafico, setPeriodoGrafico] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  const [tipoGrafico, setTipoGrafico] = useState<'area' | 'barras'>('area');
  const [abaAtiva, setAbaAtiva] = useState<'grafico' | 'ranking' | 'inteligencia'>('grafico');

  if (!visivel) return null;

  // 1. Safe array of completed sales
  const vendasValidas = Array.isArray(vendas) ? vendas.filter((v) => v && v.status === 'concluida') : [];

  // Helper for safe Date parsing
  const parseDataVenda = (v: Venda): Date => {
    try {
      if (v && v.timestamp && typeof v.timestamp === 'number') {
        const d = new Date(v.timestamp);
        if (!isNaN(d.getTime())) return d;
      }
      if (v && v.data && typeof v.data === 'string') {
        const dataStr = v.data.includes('T') ? v.data : `${v.data}T12:00:00`;
        const d = new Date(dataStr);
        if (!isNaN(d.getTime())) return d;
      }
    } catch (err) {
      console.error('Erro ao converter data da venda:', err);
    }
    return new Date();
  };

  // 2. Group revenue by period (Day, Week, Month, Year)
  const dadosGrafico = useMemo(() => {
    try {
      const hoje = new Date();

      if (periodoGrafico === 'dia') {
        const porDia: Record<string, { isoKey: string; label: string; faturamento: number; qtdVendas: number }> = {};

        for (let i = 9; i >= 0; i--) {
          const d = new Date();
          d.setDate(hoje.getDate() - i);
          const isoKey = d.toISOString().slice(0, 10);
          const parts = isoKey.split('-');
          const label = `${parts[2]}/${parts[1]}`;
          porDia[isoKey] = { isoKey, label, faturamento: 0, qtdVendas: 0 };
        }

        vendasValidas.forEach((v) => {
          const dt = parseDataVenda(v);
          const isoKey = dt.toISOString().slice(0, 10);
          const valor = Number(v.valorTotal) || 0;

          if (porDia[isoKey]) {
            porDia[isoKey].faturamento += valor;
            porDia[isoKey].qtdVendas += 1;
          } else {
            const parts = isoKey.split('-');
            const label = `${parts[2]}/${parts[1]}`;
            porDia[isoKey] = { isoKey, label, faturamento: valor, qtdVendas: 1 };
          }
        });

        return Object.values(porDia).sort((a, b) => a.isoKey.localeCompare(b.isoKey));
      }

      if (periodoGrafico === 'semana') {
        const porSemana: Record<string, { label: string; faturamento: number; qtdVendas: number }> = {
          Semana1: { label: 'Há 3 Semanas', faturamento: 0, qtdVendas: 0 },
          Semana2: { label: 'Há 2 Semanas', faturamento: 0, qtdVendas: 0 },
          Semana3: { label: 'Semana Passada', faturamento: 0, qtdVendas: 0 },
          Semana4: { label: 'Semana Atual', faturamento: 0, qtdVendas: 0 },
        };

        const agora = hoje.getTime();
        const umDiaMs = 24 * 60 * 60 * 1000;

        vendasValidas.forEach((v) => {
          const dt = parseDataVenda(v);
          const diffDias = Math.floor((agora - dt.getTime()) / umDiaMs);
          const valor = Number(v.valorTotal) || 0;

          if (diffDias >= 0 && diffDias <= 7) {
            porSemana['Semana4'].faturamento += valor;
            porSemana['Semana4'].qtdVendas += 1;
          } else if (diffDias > 7 && diffDias <= 14) {
            porSemana['Semana3'].faturamento += valor;
            porSemana['Semana3'].qtdVendas += 1;
          } else if (diffDias > 14 && diffDias <= 21) {
            porSemana['Semana2'].faturamento += valor;
            porSemana['Semana2'].qtdVendas += 1;
          } else if (diffDias > 21 && diffDias <= 30) {
            porSemana['Semana1'].faturamento += valor;
            porSemana['Semana1'].qtdVendas += 1;
          }
        });

        return Object.values(porSemana);
      }

      if (periodoGrafico === 'mes') {
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const porMes: Record<number, { index: number; label: string; faturamento: number; qtdVendas: number }> = {};

        for (let i = 0; i < 12; i++) {
          porMes[i] = { index: i, label: nomesMeses[i], faturamento: 0, qtdVendas: 0 };
        }

        vendasValidas.forEach((v) => {
          const dt = parseDataVenda(v);
          const mesIndex = dt.getMonth();
          const valor = Number(v.valorTotal) || 0;
          if (porMes[mesIndex]) {
            porMes[mesIndex].faturamento += valor;
            porMes[mesIndex].qtdVendas += 1;
          }
        });

        return Object.values(porMes).sort((a, b) => a.index - b.index);
      }

      // periodoGrafico === 'ano'
      const porAno: Record<string, { label: string; faturamento: number; qtdVendas: number }> = {};
      const anoAtual = hoje.getFullYear();

      for (let a = anoAtual - 2; a <= anoAtual; a++) {
        porAno[String(a)] = { label: String(a), faturamento: 0, qtdVendas: 0 };
      }

      vendasValidas.forEach((v) => {
        const dt = parseDataVenda(v);
        const ano = String(dt.getFullYear());
        const valor = Number(v.valorTotal) || 0;
        if (porAno[ano]) {
          porAno[ano].faturamento += valor;
          porAno[ano].qtdVendas += 1;
        } else {
          porAno[ano] = { label: ano, faturamento: valor, qtdVendas: 1 };
        }
      });

      return Object.values(porAno).sort((a, b) => a.label.localeCompare(b.label));
    } catch (err) {
      console.error('Erro ao processar dadosGrafico:', err);
      return [];
    }
  }, [vendasValidas, periodoGrafico]);

  // 3. Sales ranking
  const { maisVendidos, menosVendidos, resumoItens } = useMemo(() => {
    try {
      const mapaItens: Record<
        string,
        { codigo: string; nome: string; qtdVendida: number; totalFaturado: number; foto?: string }
      > = {};

      vendasValidas.forEach((v) => {
        const itens = Array.isArray(v?.itens) ? v.itens : [];
        itens.forEach((item) => {
          if (!item) return;
          const cod = item.codigo || item.nome || 'SEM_CODIGO';
          if (!mapaItens[cod]) {
            mapaItens[cod] = {
              codigo: item.codigo || cod,
              nome: item.nome || 'Produto sem nome',
              qtdVendida: 0,
              totalFaturado: 0,
              foto: item.foto,
            };
          }
          const qtd = Number(item.quantidade) || 0;
          const subtotal = Number(item.subtotal) || (qtd * (Number(item.preco_unitario) || 0)) || 0;
          mapaItens[cod].qtdVendida += qtd;
          mapaItens[cod].totalFaturado += subtotal;
        });
      });

      const lista = Object.values(mapaItens);
      const ordenadosMais = [...lista].sort((a, b) => b.qtdVendida - a.qtdVendida);
      const ordenadosMenos = [...lista].sort((a, b) => a.qtdVendida - b.qtdVendida);

      return {
        maisVendidos: ordenadosMais.slice(0, 10),
        menosVendidos: ordenadosMenos.slice(0, 10),
        resumoItens: mapaItens,
      };
    } catch (err) {
      console.error('Erro ao calcular ranking de vendas:', err);
      return { maisVendidos: [], menosVendidos: [], resumoItens: {} };
    }
  }, [vendasValidas]);

  // 4. Inventory Intelligence
  const insightsEstoque = useMemo(() => {
    try {
      const recomendacaoNaoInvestir: {
        codigo: string;
        nome: string;
        qtdEstoque: number;
        qtdVendida: number;
        precoVenda: number;
        foto?: string;
        valorParado: number;
        motivo: string;
      }[] = [];

      const recomendacaoInvestirMais: {
        codigo: string;
        nome: string;
        qtdEstoque: number;
        qtdVendida: number;
        precoVenda: number;
        foto?: string;
        motivo: string;
      }[] = [];

      const estoqueAgrupado: Record<string, { codigo: string; nome: string; qtdTotal: number; precoVenda: number; foto?: string }> = {};

      if (Array.isArray(estoque)) {
        estoque.forEach((e) => {
          if (!e) return;
          const cod = e.codigo || e.nome || 'SEM_CODIGO';
          if (!estoqueAgrupado[cod]) {
            estoqueAgrupado[cod] = {
              codigo: cod,
              nome: e.nome || 'Produto',
              qtdTotal: 0,
              precoVenda: Number(e.preco_venda) || 0,
              foto: e.foto,
            };
          }
          estoqueAgrupado[cod].qtdTotal += Number(e.quantidade) || 0;
        });
      }

      let totalCapitalParado = 0;

      Object.values(estoqueAgrupado).forEach((itemEst) => {
        const vendaInfo = resumoItens[itemEst.codigo];
        const qtdVendida = vendaInfo ? vendaInfo.qtdVendida : 0;
        const valorEstoqueParado = itemEst.qtdTotal * itemEst.precoVenda;

        if (itemEst.qtdTotal >= 3 && qtdVendida <= 2) {
          totalCapitalParado += valorEstoqueParado;
          recomendacaoNaoInvestir.push({
            codigo: itemEst.codigo,
            nome: itemEst.nome,
            qtdEstoque: itemEst.qtdTotal,
            qtdVendida,
            precoVenda: itemEst.precoVenda,
            foto: itemEst.foto,
            valorParado: valorEstoqueParado,
            motivo: `Possui ${itemEst.qtdTotal} un paradas no estoque (R$ ${valorEstoqueParado.toFixed(2)} em mercadoria), mas teve apenas ${qtdVendida} venda(s). Evite novas compras deste item ou realize uma promoção!`,
          });
        }

        if (itemEst.qtdTotal <= 5 || (qtdVendida >= 2 && itemEst.qtdTotal <= 10)) {
          recomendacaoInvestirMais.push({
            codigo: itemEst.codigo,
            nome: itemEst.nome,
            qtdEstoque: itemEst.qtdTotal,
            qtdVendida,
            precoVenda: itemEst.precoVenda,
            foto: itemEst.foto,
            motivo: `Produto com boa procura (${qtdVendida} un vendidas) e estoque reduzido (${itemEst.qtdTotal} un em loja). Vale a pena reabastecer para não perder vendas!`,
          });
        }
      });

      recomendacaoNaoInvestir.sort((a, b) => b.valorParado - a.valorParado);
      recomendacaoInvestirMais.sort((a, b) => a.qtdEstoque - b.qtdEstoque);

      return {
        naoInvestir: recomendacaoNaoInvestir,
        investirMais: recomendacaoInvestirMais,
        totalCapitalParado,
      };
    } catch (err) {
      console.error('Erro ao processar inteligência de estoque:', err);
      return { naoInvestir: [], investirMais: [], totalCapitalParado: 0 };
    }
  }, [estoque, resumoItens]);

  const faturamentoTotalGeral = vendasValidas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f1f5f9',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* CABEÇALHO */}
      <div className="cabecalho-relatorio">
        <h2>📈 Gráficos de Vendas & Inteligência de Estoque ({nomeLoja})</h2>
        <button className="btn-voltar-rel" onClick={onFechar}>
          ✕ Fechar
        </button>
      </div>

      {/* CORPO */}
      <div className="corpo-relatorio-cheio" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
        {/* NAVEGAÇÃO DE ABAS */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: abaAtiva === 'grafico' ? '#0284c7' : '#f1f5f9',
              color: abaAtiva === 'grafico' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('grafico')}
          >
            📊 Faturamento & Desempenho
          </button>

          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: abaAtiva === 'ranking' ? '#0284c7' : '#f1f5f9',
              color: abaAtiva === 'ranking' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('ranking')}
          >
            🏆 Produtos Mais & Menos Vendidos
          </button>

          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: abaAtiva === 'inteligencia' ? '#16a34a' : '#f1f5f9',
              color: abaAtiva === 'inteligencia' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('inteligencia')}
          >
            💡 Inteligência de Estoque (Painel do Dono)
          </button>
        </div>

        {/* ABA 1: GRÁFICOS DE FATURAMENTO */}
        {abaAtiva === 'grafico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* CONTROLES E SELETORES */}
            <div
              style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Período:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['dia', 'semana', 'mes', 'ano'] as const).map((p) => (
                    <button
                      key={p}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: periodoGrafico === p ? '#0284c7' : '#ffffff',
                        color: periodoGrafico === p ? '#ffffff' : '#334155',
                      }}
                      onClick={() => setPeriodoGrafico(p)}
                    >
                      {p === 'dia' && '📅 Por Dia'}
                      {p === 'semana' && '📅 Por Semana'}
                      {p === 'mes' && '📅 Por Mês'}
                      {p === 'ano' && '📅 Por Ano'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Visualização:</span>
                <button
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tipoGrafico === 'area' ? '#e0f2fe' : '#ffffff',
                    color: tipoGrafico === 'area' ? '#0369a1' : '#475569',
                  }}
                  onClick={() => setTipoGrafico('area')}
                >
                  📈 Linha / Área
                </button>
                <button
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tipoGrafico === 'barras' ? '#e0f2fe' : '#ffffff',
                    color: tipoGrafico === 'barras' ? '#0369a1' : '#475569',
                  }}
                  onClick={() => setTipoGrafico('barras')}
                >
                  📊 Colunas / Barras
                </button>
              </div>
            </div>

            {/* CONTAINER DO GRÁFICO PRINCIPAL */}
            <div
              style={{
                background: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                minHeight: '360px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Faturamento de Vendas — Vista por {periodoGrafico.toUpperCase()}
                </h3>
                <div style={{ fontSize: '0.95rem', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  Faturamento Total: R$ {faturamentoTotalGeral.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                {dadosGrafico.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                    Nenhum dado registrado para o período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    {tipoGrafico === 'area' ? (
                      <AreaChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip
                          formatter={(val: any) => [`R$ ${Number(val).toFixed(2).replace('.', ',')}`, 'Faturamento']}
                          labelFormatter={(lbl) => `Período: ${lbl}`}
                          contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <Area type="monotone" dataKey="faturamento" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" name="Faturamento (R$)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip
                          formatter={(val: any) => [`R$ ${Number(val).toFixed(2).replace('.', ',')}`, 'Faturamento']}
                          labelFormatter={(lbl) => `Período: ${lbl}`}
                          contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <Bar dataKey="faturamento" fill="#0284c7" radius={[6, 6, 0, 0]} name="Faturamento (R$)" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: MAIS E MENOS VENDIDOS */}
        {abaAtiva === 'ranking' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* MAIS VENDIDOS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔥 Produtos Mais Vendidos (Maior Saída)
              </h3>
              {maisVendidos.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>
                  Nenhum registro de vendas no período.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {maisVendidos.map((prod, index) => (
                    <div
                      key={prod.codigo || index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem', width: '24px' }}>#{index + 1}</span>
                        <div>
                          <b style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{prod.nome}</b>
                          <small style={{ color: '#475569' }}>Cód: {prod.codigo}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>{prod.qtdVendida} un vendidas</div>
                        <small style={{ color: '#64748b' }}>Faturado: R$ {prod.totalFaturado.toFixed(2)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MENOS VENDIDOS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🧊 Produtos Menos Vendidos (Baixa Saída)
              </h3>
              {menosVendidos.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>
                  Nenhum registro de vendas no período.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menosVendidos.map((prod, index) => (
                    <div
                      key={prod.codigo || index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem', width: '24px' }}>#{index + 1}</span>
                        <div>
                          <b style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{prod.nome}</b>
                          <small style={{ color: '#475569' }}>Cód: {prod.codigo}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>{prod.qtdVendida} un vendidas</div>
                        <small style={{ color: '#64748b' }}>Faturado: R$ {prod.totalFaturado.toFixed(2)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: INTELIGÊNCIA DE ESTOQUE E CONSELHOS AO DONO */}
        {abaAtiva === 'inteligencia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* PAINEL INFORMATIVO */}
            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
                  🧠 Painel de Inteligência de Estoque (Para o Dono do Supermercado)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#0c4a6e', margin: 0 }}>
                  Cruza a quantidade vendida com o estoque atual para mostrar onde investir dinheiro e onde parar compras.
                </p>
              </div>

              {insightsEstoque.totalCapitalParado > 0 && (
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #7dd3fc', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>Capital Preso em Estoque Parado</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>
                    R$ {insightsEstoque.totalCapitalParado.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 1: EVITAR COMPRAR MAIS (ESTOQUE PARADO) */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛑 Estoque Parado / Evitar Investir Mais (Pouca Saída)
              </h3>
              {insightsEstoque.naoInvestir.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                  🎉 Excelente! Nenhum produto detectado com excesso de estoque parado sem vendas.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {insightsEstoque.naoInvestir.map((item) => (
                    <div
                      key={item.codigo}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <b style={{ fontSize: '0.92rem', color: '#78350f' }}>{item.nome}</b>
                          <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Cód: {item.codigo}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.4, margin: '6px 0' }}>
                          {item.motivo}
                        </p>
                      </div>

                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          justify: 'space-between',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#b45309',
                          borderTop: '1px dashed #fcd34d',
                          paddingTop: '6px',
                        }}
                      >
                        <span>📦 Em Estoque: {item.qtdEstoque} un</span>
                        <span>🛒 Vendas: {item.qtdVendida} un</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: PRODUTOS PARA INVESTIR MAIS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚀 Produtos para Investir Mais (Alta Giro / Reposição Recomendada)
              </h3>
              {insightsEstoque.investirMais.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                  Nenhum alerta de reposição urgente no momento.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {insightsEstoque.investirMais.map((item) => (
                    <div
                      key={item.codigo}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <b style={{ fontSize: '0.92rem', color: '#14532d' }}>{item.nome}</b>
                          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Cód: {item.codigo}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.4, margin: '6px 0' }}>
                          {item.motivo}
                        </p>
                      </div>

                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          justify: 'space-between',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#15803d',
                          borderTop: '1px dashed #bbf7d0',
                          paddingTop: '6px',
                        }}
                      >
                        <span>📦 Em Estoque: {item.qtdEstoque} un</span>
                        <span>🛒 Vendas: {item.qtdVendida} un</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
