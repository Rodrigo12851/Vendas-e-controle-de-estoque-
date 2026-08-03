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
  const [abaAtiva, setAbaAtiva] = useState<'grafico' | 'ranking' | 'inteligencia'>('grafico');

  if (!visivel) return null;

  // 1. Considerar apenas vendas concluídas para faturamento
  const vendasValidas = vendas.filter((v) => v.status === 'concluida');

  // 2. Agrupar Faturamento por Período (Dia, Semana, Mês, Ano)
  const dadosGrafico = useMemo(() => {
    const hoje = new Date();

    if (periodoGrafico === 'dia') {
      // Agrupar por data nos últimos 7 a 14 dias
      const porDia: Record<string, { label: string; faturamento: number; qtdVendas: number }> = {};
      
      // Inicializar últimos 7 dias
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(hoje.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const parts = iso.split('-');
        const label = `${parts[2]}/${parts[1]}`;
        porDia[iso] = { label, faturamento: 0, qtdVendas: 0 };
      }

      vendasValidas.forEach((v) => {
        if (porDia[v.data]) {
          porDia[v.data].faturamento += v.valorTotal;
          porDia[v.data].qtdVendas += 1;
        } else {
          // caso seja data válida no mesmo mês
          const parts = v.data.split('-');
          if (parts.length === 3) {
            const label = `${parts[2]}/${parts[1]}`;
            porDia[v.data] = { label, faturamento: v.valorTotal, qtdVendas: 1 };
          }
        }
      });

      return Object.values(porDia).sort((a, b) => a.label.localeCompare(b.label));
    }

    if (periodoGrafico === 'semana') {
      // Agrupar por semana do ano ou últimas 4 semanas
      const porSemana: Record<string, { label: string; faturamento: number; qtdVendas: number }> = {
        Semana1: { label: 'Semana 1', faturamento: 0, qtdVendas: 0 },
        Semana2: { label: 'Semana 2', faturamento: 0, qtdVendas: 0 },
        Semana3: { label: 'Semana 3', faturamento: 0, qtdVendas: 0 },
        Semana4: { label: 'Semana 4 (Atual)', faturamento: 0, qtdVendas: 0 },
      };

      const agora = hoje.getTime();
      const umDiaMs = 24 * 60 * 60 * 1000;

      vendasValidas.forEach((v) => {
        const diffDias = Math.floor((agora - v.timestamp) / umDiaMs);
        if (diffDias <= 7) {
          porSemana['Semana4'].faturamento += v.valorTotal;
          porSemana['Semana4'].qtdVendas += 1;
        } else if (diffDias <= 14) {
          porSemana['Semana3'].faturamento += v.valorTotal;
          porSemana['Semana3'].qtdVendas += 1;
        } else if (diffDias <= 21) {
          porSemana['Semana2'].faturamento += v.valorTotal;
          porSemana['Semana2'].qtdVendas += 1;
        } else if (diffDias <= 28) {
          porSemana['Semana1'].faturamento += v.valorTotal;
          porSemana['Semana1'].qtdVendas += 1;
        }
      });

      return Object.values(porSemana);
    }

    if (periodoGrafico === 'mes') {
      // Agrupar por meses do ano
      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const porMes: Record<number, { label: string; faturamento: number; qtdVendas: number }> = {};

      for (let i = 0; i < 12; i++) {
        porMes[i] = { label: nomesMeses[i], faturamento: 0, qtdVendas: 0 };
      }

      vendasValidas.forEach((v) => {
        const dateObj = new Date(v.timestamp || v.data);
        const mesIndex = dateObj.getMonth();
        if (porMes[mesIndex]) {
          porMes[mesIndex].faturamento += v.valorTotal;
          porMes[mesIndex].qtdVendas += 1;
        }
      });

      return Object.values(porMes);
    }

    // periodoGrafico === 'ano'
    const porAno: Record<string, { label: string; faturamento: number; qtdVendas: number }> = {};
    const anoAtual = hoje.getFullYear();

    for (let a = anoAtual - 2; a <= anoAtual; a++) {
      porAno[String(a)] = { label: String(a), faturamento: 0, qtdVendas: 0 };
    }

    vendasValidas.forEach((v) => {
      const parts = v.data.split('-');
      const ano = parts[0];
      if (porAno[ano]) {
        porAno[ano].faturamento += v.valorTotal;
        porAno[ano].qtdVendas += 1;
      } else if (ano) {
        porAno[ano] = { label: ano, faturamento: v.valorTotal, qtdVendas: 1 };
      }
    });

    return Object.values(porAno);
  }, [vendasValidas, periodoGrafico]);

  // 3. Totalizadores de Itens Saídos
  const { maisVendidos, menosVendidos, resumoItens } = useMemo(() => {
    const mapaItens: Record<
      string,
      { codigo: string; nome: string; qtdVendida: number; totalFaturado: number; foto?: string }
    > = {};

    vendasValidas.forEach((v) => {
      v.itens.forEach((item) => {
        if (!mapaItens[item.codigo]) {
          mapaItens[item.codigo] = {
            codigo: item.codigo,
            nome: item.nome,
            qtdVendida: 0,
            totalFaturado: 0,
            foto: item.foto,
          };
        }
        mapaItens[item.codigo].qtdVendida += item.quantidade;
        mapaItens[item.codigo].totalFaturado += item.subtotal;
      });
    });

    const lista = Object.values(mapaItens);
    const ordenadosMais = [...lista].sort((a, b) => b.qtdVendida - a.qtdVendida);
    const ordenadosMenos = [...lista].sort((a, b) => a.qtdVendida - b.qtdVendida);

    return {
      maisVendidos: ordenadosMais.slice(0, 8),
      menosVendidos: ordenadosMenos.slice(0, 8),
      resumoItens: mapaItens,
    };
  }, [vendasValidas]);

  // 4. Inteligência de Estoque para o Dono do Supermercado
  const insightsEstoque = useMemo(() => {
    // Cruzar estoque atual com vendas do mês
    const recomendacaoNaoInvestir: {
      codigo: string;
      nome: string;
      qtdEstoque: number;
      qtdVendida: number;
      foto?: string;
      motivo: string;
    }[] = [];

    const recomendacaoInvestirMais: {
      codigo: string;
      nome: string;
      qtdEstoque: number;
      qtdVendida: number;
      foto?: string;
      motivo: string;
    }[] = [];

    // Agrupar estoque por código
    const estoqueAgrupado: Record<string, { codigo: string; nome: string; qtdTotal: number; foto?: string }> = {};
    estoque.forEach((e) => {
      if (!estoqueAgrupado[e.codigo]) {
        estoqueAgrupado[e.codigo] = { codigo: e.codigo, nome: e.nome, qtdTotal: 0, foto: e.foto };
      }
      estoqueAgrupado[e.codigo].qtdTotal += e.quantidade;
    });

    Object.values(estoqueAgrupado).forEach((itemEst) => {
      const vendaInfo = resumoItens[itemEst.codigo];
      const qtdVendida = vendaInfo ? vendaInfo.qtdVendida : 0;

      // Se tem muito estoque (>= 15 un) mas pouca ou nenhuma venda (<= 2 un)
      if (itemEst.qtdTotal >= 10 && qtdVendida <= 2) {
        recomendacaoNaoInvestir.push({
          codigo: itemEst.codigo,
          nome: itemEst.nome,
          qtdEstoque: itemEst.qtdTotal,
          qtdVendida,
          foto: itemEst.foto,
          motivo: `Possui ${itemEst.qtdTotal} unidades paradas no estoque, mas vendeu apenas ${qtdVendida} un no período. Evite comprar mais ou crie promoções!`,
        });
      }

      // Se tem alta venda (>= 5 un) mas pouco estoque (<= 5 un)
      if (qtdVendida >= 3 && itemEst.qtdTotal <= 8) {
        recomendacaoInvestirMais.push({
          codigo: itemEst.codigo,
          nome: itemEst.nome,
          qtdEstoque: itemEst.qtdTotal,
          qtdVendida,
          foto: itemEst.foto,
          motivo: `Alta rotatividade! Vendeu ${qtdVendida} un e restam apenas ${itemEst.qtdTotal} un em estoque. Reponha estoque para não perder vendas!`,
        });
      }
    });

    return {
      naoInvestir: recomendacaoNaoInvestir.slice(0, 6),
      investirMais: recomendacaoInvestirMais.slice(0, 6),
    };
  }, [estoque, resumoItens]);

  // Faturamento Total Acumulado
  const faturamentoTotalGeral = vendasValidas.reduce((acc, v) => acc + v.valorTotal, 0);

  return (
    <div className="tela-relatorio-cheia" style={{ display: 'flex', zIndex: 450 }}>
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
            📊 Faturamento por Período
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
            💡 Inteligência de Estoque (Dono do Supermercado)
          </button>
        </div>

        {/* ABA 1: GRÁFICOS DE FATURAMENTO */}
        {abaAtiva === 'grafico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* SELETOR DE TEMPO */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Visualizar Faturamento por:</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
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

            {/* CONTAINER GRÁFICO RECHARTS */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Faturamento Acumulado ({periodoGrafico.toUpperCase()})
                </h3>
                <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: 700 }}>
                  Total: R$ {faturamentoTotalGeral.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
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
                    <Area type="monotone" dataKey="faturamento" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
                  </AreaChart>
                </ResponsiveContainer>
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
                🔥 Produtos Mais Vendidos (Top Saídas)
              </h3>
              {maisVendidos.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum dado de vendas ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {maisVendidos.map((prod, index) => (
                    <div
                      key={prod.codigo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#16a34a', width: '20px' }}>#{index + 1}</span>
                        <div>
                          <b style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{prod.nome}</b>
                          <small style={{ color: '#475569' }}>Cód: {prod.codigo}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>{prod.qtdVendida} un</div>
                        <small style={{ color: '#64748b' }}>R$ {prod.totalFaturado.toFixed(2)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MENOS VENDIDOS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🧊 Produtos Menos Vendidos (Pouca Saída)
              </h3>
              {menosVendidos.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum dado de vendas ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menosVendidos.map((prod, index) => (
                    <div
                      key={prod.codigo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#dc2626', width: '20px' }}>#{index + 1}</span>
                        <div>
                          <b style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{prod.nome}</b>
                          <small style={{ color: '#475569' }}>Cód: {prod.codigo}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>{prod.qtdVendida} un</div>
                        <small style={{ color: '#64748b' }}>R$ {prod.totalFaturado.toFixed(2)}</small>
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
            <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
                🧠 Assistente Executivo de Estoque & Investimento
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#0c4a6e', lineHeight: 1.4 }}>
                Este painel analisa automaticamente a velocidade de saída das suas vendas cruzando com a quantidade atual no estoque. Ele ajuda o dono do supermercado a decidir onde colocar dinheiro e onde evitar desperdício de capital!
              </p>
            </div>

            {/* RECOMENDAÇÃO 1: ONDE INVESTIR MAIS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚀 Produtos para Investir Mais (Alta Giro / Reposição Urgente)
              </h3>
              {insightsEstoque.investirMais.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Nenhum alerta de ruptura ou alta demanda no momento.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {insightsEstoque.investirMais.map((item) => (
                    <div
                      key={item.codigo}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '0.9rem', color: '#14532d', display: 'block', marginBottom: '4px' }}>
                          {item.nome}
                        </b>
                        <p style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.3 }}>{item.motivo}</p>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#15803d', borderTop: '1px dashed #bbf7d0', paddingTop: '6px' }}>
                        <span>Estoque Atual: {item.qtdEstoque} un</span>
                        <span>Vendas: {item.qtdVendida} un</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECOMENDAÇÃO 2: EVITAR COMPRAR / ESTOQUE PARADO */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Estoque Parado / Evitar Comprar Mais
              </h3>
              {insightsEstoque.naoInvestir.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Nenhum acúmulo excessivo de estoque sem venda detectado.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {insightsEstoque.naoInvestir.map((item) => (
                    <div
                      key={item.codigo}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '0.9rem', color: '#78350f', display: 'block', marginBottom: '4px' }}>
                          {item.nome}
                        </b>
                        <p style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.3 }}>{item.motivo}</p>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#b45309', borderTop: '1px dashed #fcd34d', paddingTop: '6px' }}>
                        <span>Estoque Parado: {item.qtdEstoque} un</span>
                        <span>Venda no Período: {item.qtdVendida} un</span>
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
