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
  Legend,
  Cell,
  PieChart,
  Pie,
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
  const [abaAtiva, setAbaAtiva] = useState<
    'grafico' | 'devolucoes' | 'perdas' | 'estoque_chart' | 'ranking' | 'inteligencia'
  >('grafico');

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

  // 1. Safe arrays of sales
  const vendasValidas = useMemo(() => {
    return Array.isArray(vendas) ? vendas.filter((v) => v && v.status === 'concluida') : [];
  }, [vendas]);

  const vendasEstornadas = useMemo(() => {
    return Array.isArray(vendas) ? vendas.filter((v) => v && v.status === 'estornada') : [];
  }, [vendas]);

  // 2. Faturamento Grouping by Period
  const dadosGraficoFaturamento = useMemo(() => {
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
      console.error('Erro ao processar faturamento:', err);
      return [];
    }
  }, [vendasValidas, periodoGrafico]);

  // 3. Devoluções & Estornos Grouping
  const dadosGraficoDevolucoes = useMemo(() => {
    try {
      const hoje = new Date();

      if (periodoGrafico === 'dia') {
        const porDia: Record<string, { isoKey: string; label: string; estornado: number; qtdEstornos: number }> = {};

        for (let i = 9; i >= 0; i--) {
          const d = new Date();
          d.setDate(hoje.getDate() - i);
          const isoKey = d.toISOString().slice(0, 10);
          const parts = isoKey.split('-');
          const label = `${parts[2]}/${parts[1]}`;
          porDia[isoKey] = { isoKey, label, estornado: 0, qtdEstornos: 0 };
        }

        vendasEstornadas.forEach((v) => {
          const dt = parseDataVenda(v);
          const isoKey = dt.toISOString().slice(0, 10);
          const valor = Number(v.valorTotal) || 0;

          if (porDia[isoKey]) {
            porDia[isoKey].estornado += valor;
            porDia[isoKey].qtdEstornos += 1;
          } else {
            const parts = isoKey.split('-');
            const label = `${parts[2]}/${parts[1]}`;
            porDia[isoKey] = { isoKey, label, estornado: valor, qtdEstornos: 1 };
          }
        });

        return Object.values(porDia).sort((a, b) => a.isoKey.localeCompare(b.isoKey));
      }

      if (periodoGrafico === 'semana') {
        const porSemana: Record<string, { label: string; estornado: number; qtdEstornos: number }> = {
          Semana1: { label: 'Há 3 Semanas', estornado: 0, qtdEstornos: 0 },
          Semana2: { label: 'Há 2 Semanas', estornado: 0, qtdEstornos: 0 },
          Semana3: { label: 'Semana Passada', estornado: 0, qtdEstornos: 0 },
          Semana4: { label: 'Semana Atual', estornado: 0, qtdEstornos: 0 },
        };

        const agora = hoje.getTime();
        const umDiaMs = 24 * 60 * 60 * 1000;

        vendasEstornadas.forEach((v) => {
          const dt = parseDataVenda(v);
          const diffDias = Math.floor((agora - dt.getTime()) / umDiaMs);
          const valor = Number(v.valorTotal) || 0;

          if (diffDias >= 0 && diffDias <= 7) {
            porSemana['Semana4'].estornado += valor;
            porSemana['Semana4'].qtdEstornos += 1;
          } else if (diffDias > 7 && diffDias <= 14) {
            porSemana['Semana3'].estornado += valor;
            porSemana['Semana3'].qtdEstornos += 1;
          } else if (diffDias > 14 && diffDias <= 21) {
            porSemana['Semana2'].estornado += valor;
            porSemana['Semana2'].qtdEstornos += 1;
          } else if (diffDias > 21 && diffDias <= 30) {
            porSemana['Semana1'].estornado += valor;
            porSemana['Semana1'].qtdEstornos += 1;
          }
        });

        return Object.values(porSemana);
      }

      if (periodoGrafico === 'mes') {
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const porMes: Record<number, { index: number; label: string; estornado: number; qtdEstornos: number }> = {};

        for (let i = 0; i < 12; i++) {
          porMes[i] = { index: i, label: nomesMeses[i], estornado: 0, qtdEstornos: 0 };
        }

        vendasEstornadas.forEach((v) => {
          const dt = parseDataVenda(v);
          const mesIndex = dt.getMonth();
          const valor = Number(v.valorTotal) || 0;
          if (porMes[mesIndex]) {
            porMes[mesIndex].estornado += valor;
            porMes[mesIndex].qtdEstornos += 1;
          }
        });

        return Object.values(porMes).sort((a, b) => a.index - b.index);
      }

      // periodoGrafico === 'ano'
      const porAno: Record<string, { label: string; estornado: number; qtdEstornos: number }> = {};
      const anoAtual = hoje.getFullYear();

      for (let a = anoAtual - 2; a <= anoAtual; a++) {
        porAno[String(a)] = { label: String(a), estornado: 0, qtdEstornos: 0 };
      }

      vendasEstornadas.forEach((v) => {
        const dt = parseDataVenda(v);
        const ano = String(dt.getFullYear());
        const valor = Number(v.valorTotal) || 0;
        if (porAno[ano]) {
          porAno[ano].estornado += valor;
          porAno[ano].qtdEstornos += 1;
        } else {
          porAno[ano] = { label: ano, estornado: valor, qtdEstornos: 1 };
        }
      });

      return Object.values(porAno).sort((a, b) => a.label.localeCompare(b.label));
    } catch (err) {
      console.error('Erro ao processar devoluções:', err);
      return [];
    }
  }, [vendasEstornadas, periodoGrafico]);

  // 4. Perdas & Vencidos Analysis
  const dadosPerdas = useMemo(() => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hojeIso = hoje.toISOString().slice(0, 10);

      let totalVencidosQtd = 0;
      let totalVencidosValor = 0;
      let totalAVencer7DiasQtd = 0;
      let totalAVencer7DiasValor = 0;
      let totalAVencer30DiasQtd = 0;
      let totalAVencer30DiasValor = 0;

      const listaVencidos: {
        codigo: string;
        nome: string;
        lote: string;
        validade: string;
        qtd: number;
        precoCusto: number;
        precoVenda: number;
        perdaTotalR$: number;
        diasParaVencer: number;
        status: 'Vencido' | 'Vence em até 7 dias' | 'Vence em até 30 dias';
      }[] = [];

      if (Array.isArray(estoque)) {
        estoque.forEach((item) => {
          if (!item) return;
          const valStr = item.validade;
          if (!valStr) return;

          const dtVal = new Date(valStr + 'T23:59:59');
          if (isNaN(dtVal.getTime())) return;

          const diffMs = dtVal.getTime() - hoje.getTime();
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          const qtd = Number(item.quantidade) || 0;
          const pVenda = Number(item.preco_venda) || 0;
          const pCusto = Number(item.preco_custo) || pVenda * 0.7;
          const valorPerda = qtd * pVenda;

          if (diffDias < 0) {
            // Vencido
            totalVencidosQtd += qtd;
            totalVencidosValor += valorPerda;
            listaVencidos.push({
              codigo: item.codigo,
              nome: item.nome,
              lote: item.lote,
              validade: item.validade,
              qtd,
              precoCusto: pCusto,
              precoVenda: pVenda,
              perdaTotalR$: valorPerda,
              diasParaVencer: diffDias,
              status: 'Vencido',
            });
          } else if (diffDias <= 7) {
            // Vence em até 7 dias
            totalAVencer7DiasQtd += qtd;
            totalAVencer7DiasValor += valorPerda;
            listaVencidos.push({
              codigo: item.codigo,
              nome: item.nome,
              lote: item.lote,
              validade: item.validade,
              qtd,
              precoCusto: pCusto,
              precoVenda: pVenda,
              perdaTotalR$: valorPerda,
              diasParaVencer: diffDias,
              status: 'Vence em até 7 dias',
            });
          } else if (diffDias <= 30) {
            // Vence em até 30 dias
            totalAVencer30DiasQtd += qtd;
            totalAVencer30DiasValor += valorPerda;
            listaVencidos.push({
              codigo: item.codigo,
              nome: item.nome,
              lote: item.lote,
              validade: item.validade,
              qtd,
              precoCusto: pCusto,
              precoVenda: pVenda,
              perdaTotalR$: valorPerda,
              diasParaVencer: diffDias,
              status: 'Vence em até 30 dias',
            });
          }
        });
      }

      // Chart data summary of Perdas por Categoria de Risco
      const graficoRisco = [
        { label: 'Já Vencidos (Perda)', valorR$: totalVencidosValor, qtd: totalVencidosQtd, fill: '#ef4444' },
        { label: 'Vence em 7 dias', valorR$: totalAVencer7DiasValor, qtd: totalAVencer7DiasQtd, fill: '#f59e0b' },
        { label: 'Vence em 30 dias', valorR$: totalAVencer30DiasValor, qtd: totalAVencer30DiasQtd, fill: '#3b82f6' },
      ];

      return {
        totalVencidosQtd,
        totalVencidosValor,
        totalAVencer7DiasQtd,
        totalAVencer7DiasValor,
        totalAVencer30DiasQtd,
        totalAVencer30DiasValor,
        listaVencidos: listaVencidos.sort((a, b) => a.diasParaVencer - b.diasParaVencer),
        graficoRisco,
      };
    } catch (err) {
      console.error('Erro ao calcular perdas:', err);
      return {
        totalVencidosQtd: 0,
        totalVencidosValor: 0,
        totalAVencer7DiasQtd: 0,
        totalAVencer7DiasValor: 0,
        totalAVencer30DiasQtd: 0,
        totalAVencer30DiasValor: 0,
        listaVencidos: [],
        graficoRisco: [],
      };
    }
  }, [estoque]);

  // 5. Visão Geral do Estoque Chart Data
  const dadosEstoqueGrafico = useMemo(() => {
    try {
      const mapaProdutos: Record<
        string,
        { codigo: string; nome: string; quantidade: number; valorCustoTotal: number; valorVendaTotal: number }
      > = {};

      let totalPecasEstoque = 0;
      let totalValorVendaEstoque = 0;
      let totalValorCustoEstoque = 0;

      if (Array.isArray(estoque)) {
        estoque.forEach((item) => {
          if (!item) return;
          const cod = item.codigo || item.nome || 'SEM_CODIGO';
          const qtd = Number(item.quantidade) || 0;
          const pVenda = Number(item.preco_venda) || 0;
          const pCusto = Number(item.preco_custo) || pVenda * 0.7;

          const vVenda = qtd * pVenda;
          const vCusto = qtd * pCusto;

          totalPecasEstoque += qtd;
          totalValorVendaEstoque += vVenda;
          totalValorCustoEstoque += vCusto;

          if (!mapaProdutos[cod]) {
            mapaProdutos[cod] = {
              codigo: item.codigo,
              nome: item.nome || 'Produto',
              quantidade: 0,
              valorCustoTotal: 0,
              valorVendaTotal: 0,
            };
          }

          mapaProdutos[cod].quantidade += qtd;
          mapaProdutos[cod].valorCustoTotal += vCusto;
          mapaProdutos[cod].valorVendaTotal += vVenda;
        });
      }

      const lista = Object.values(mapaProdutos);
      const topMaiorQtd = [...lista].sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
      const topMaiorValor = [...lista].sort((a, b) => b.valorVendaTotal - a.valorVendaTotal).slice(0, 10);

      return {
        totalPecasEstoque,
        totalValorVendaEstoque,
        totalValorCustoEstoque,
        lucroBrutoProjetado: totalValorVendaEstoque - totalValorCustoEstoque,
        topMaiorQtd,
        topMaiorValor,
      };
    } catch (err) {
      console.error('Erro ao calcular gráfico de estoque:', err);
      return {
        totalPecasEstoque: 0,
        totalValorVendaEstoque: 0,
        totalValorCustoEstoque: 0,
        lucroBrutoProjetado: 0,
        topMaiorQtd: [],
        topMaiorValor: [],
      };
    }
  }, [estoque]);

  // 6. Ranking of Sales
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
          const subtotal = Number(item.subtotal) || qtd * (Number(item.preco_unitario) || 0) || 0;
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

  // 7. Inventory Intelligence
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

      const estoqueAgrupado: Record<
        string,
        { codigo: string; nome: string; qtdTotal: number; precoVenda: number; foto?: string }
      > = {};

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
            motivo: `Possui ${itemEst.qtdTotal} un paradas no estoque (R$ ${valorEstoqueParado.toFixed(
              2
            )} em mercadoria), mas teve apenas ${qtdVendida} venda(s). Evite novas compras deste item ou realize uma promoção!`,
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

  // Overall totals
  const faturamentoTotalGeral = vendasValidas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  const totalEstornosGeral = vendasEstornadas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);

  // Return null if not visible AFTER all hooks
  if (!visivel) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f8fafc',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* CABEÇALHO */}
      <div className="cabecalho-relatorio">
        <h2>📈 Gráficos & Inteligência de Estoque ({nomeLoja})</h2>
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
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'grafico' ? '#0284c7' : '#f1f5f9',
              color: abaAtiva === 'grafico' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('grafico')}
          >
            📊 Faturamento
          </button>

          <button
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'devolucoes' ? '#dc2626' : '#f1f5f9',
              color: abaAtiva === 'devolucoes' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('devolucoes')}
          >
            🔄 Devoluções & Estornos ({vendasEstornadas.length})
          </button>

          <button
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'perdas' ? '#d97706' : '#f1f5f9',
              color: abaAtiva === 'perdas' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('perdas')}
          >
            🛑 Gráfico de Perdas & Vencidos
          </button>

          <button
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'estoque_chart' ? '#4f46e5' : '#f1f5f9',
              color: abaAtiva === 'estoque_chart' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('estoque_chart')}
          >
            📦 Visão Geral do Estoque
          </button>

          <button
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'ranking' ? '#0284c7' : '#f1f5f9',
              color: abaAtiva === 'ranking' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('ranking')}
          >
            🏆 Ranking de Vendas
          </button>

          <button
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: abaAtiva === 'inteligencia' ? '#16a34a' : '#f1f5f9',
              color: abaAtiva === 'inteligencia' ? '#ffffff' : '#475569',
            }}
            onClick={() => setAbaAtiva('inteligencia')}
          >
            💡 Inteligência de Estoque (Dono)
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
                {dadosGraficoFaturamento.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                    Nenhum dado registrado para o período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    {tipoGrafico === 'area' ? (
                      <AreaChart data={dadosGraficoFaturamento} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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
                      <BarChart data={dadosGraficoFaturamento} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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

        {/* ABA 2: GRÁFICO DE DEVOLUÇÕES & ESTORNOS */}
        {abaAtiva === 'devolucoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '10px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                  🔄 Gráfico de Devoluções & Vendas Estornadas
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: 0 }}>
                  Acompanhe os valores devolvidos aos clientes e transações estornadas ao longo do tempo.
                </p>
              </div>
              <div style={{ background: '#ffffff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Total Devolvido/Estornado</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                  R$ {totalEstornosGeral.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {/* SELEÇÃO DE PERÍODO PARA DEVOLUÇÕES */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Agrupar por:</span>
              {(['dia', 'semana', 'mes', 'ano'] as const).map((p) => (
                <button
                  key={p}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: periodoGrafico === p ? '#dc2626' : '#ffffff',
                    color: periodoGrafico === p ? '#ffffff' : '#334155',
                  }}
                  onClick={() => setPeriodoGrafico(p)}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            {/* GRÁFICO RECHARTS DE DEVOLUÇÕES */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '320px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', marginBottom: '14px' }}>
                Evolução do Valor Estornado (R$) — Por {periodoGrafico.toUpperCase()}
              </h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dadosGraficoDevolucoes} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2).replace('.', ',')}`, 'Valor Estornado']}
                      labelFormatter={(lbl) => `Período: ${lbl}`}
                      contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #fca5a5' }}
                    />
                    <Bar dataKey="estornado" fill="#ef4444" radius={[6, 6, 0, 0]} name="Valor Estornado (R$)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LISTA DE DEVOLUÇÕES RECENTES */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
                📋 Histórico de Transações Estornadas / Canceladas
              </h4>
              {vendasEstornadas.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '16px', textAlign: 'center' }}>
                  Nenhum estorno ou devolução registrado até o momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vendasEstornadas.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '10px 12px',
                        background: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>
                          Venda #{v.id} — {v.data} {v.hora}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                          Operador: <b>{v.operadorNome}</b> | Motivo Estorno: <i>{v.motivoEstorno || 'Não especificado'}</i>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                          R$ {(v.valorTotal || 0).toFixed(2)}
                        </div>
                        <small style={{ color: '#991b1b', fontWeight: 600 }}>STATUS: ESTORNADA</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: GRÁFICO DE PERDAS & VENCIDOS */}
        {abaAtiva === 'perdas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                  🛑 Gráfico de Perdas & Riscos por Validade do Estoque
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0 }}>
                  Mapeia produtos com validade vencida ou prestes a vencer para evitar prejuízo financeiro.
                </p>
              </div>
              <div style={{ background: '#ffffff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fcd34d', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>Total de Perda em Vencidos</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>
                  R$ {dadosPerdas.totalVencidosValor.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {/* RESUMO CARD DE PERDAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700 }}>❌ Já Vencidos (Perda Real)</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  R$ {dadosPerdas.totalVencidosValor.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7f1d1d' }}>{dadosPerdas.totalVencidosQtd} unidade(s)</div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>⚠️ Vence em até 7 dias (Urgente)</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                  R$ {dadosPerdas.totalAVencer7DiasValor.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350f' }}>{dadosPerdas.totalAVencer7DiasQtd} unidade(s)</div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700 }}>📅 Vence em até 30 dias (Atenção)</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                  R$ {dadosPerdas.totalAVencer30DiasValor.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1e3a8a' }}>{dadosPerdas.totalAVencer30DiasQtd} unidade(s)</div>
              </div>
            </div>

            {/* GRÁFICO RECHARTS DE RISCO DE PERDA */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '300px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '14px' }}>
                Distribuição Financeira de Perdas e Vencimentos (R$)
              </h4>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dadosPerdas.graficoRisco} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2).replace('.', ',')}`, 'Valor em Risco']}
                      contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                    <Bar dataKey="valorR$" radius={[6, 6, 0, 0]} name="Valor em R$ (Perda / Risco)">
                      {dadosPerdas.graficoRisco.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABELA DE PRODUTOS CRÍTICOS / PERDAS */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
                🚨 Produtos Críticos Vencidos ou a Vencer
              </h4>
              {dadosPerdas.listaVencidos.length === 0 ? (
                <div style={{ color: '#16a34a', fontSize: '0.85rem', padding: '16px', textAlign: 'center', background: '#f0fdf4', borderRadius: '8px' }}>
                  🎉 Excelente! Nenhum produto vencido ou com validade próxima no estoque.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px' }}>Produto</th>
                        <th style={{ padding: '8px' }}>Lote</th>
                        <th style={{ padding: '8px' }}>Validade</th>
                        <th style={{ padding: '8px' }}>Qtd</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Perda Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosPerdas.listaVencidos.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                background:
                                  item.status === 'Vencido'
                                    ? '#fef2f2'
                                    : item.status === 'Vence em até 7 dias'
                                    ? '#fffbeb'
                                    : '#eff6ff',
                                color:
                                  item.status === 'Vencido'
                                    ? '#dc2626'
                                    : item.status === 'Vence em até 7 dias'
                                    ? '#b45309'
                                    : '#2563eb',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{item.nome}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{item.lote || '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{item.validade}</td>
                          <td style={{ padding: '8px' }}>{item.qtd} un</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: item.status === 'Vencido' ? '#dc2626' : '#d97706' }}>
                            R$ {item.perdaTotalR$.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 4: VISÃO GERAL DO ESTOQUE */}
        {abaAtiva === 'estoque_chart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* CARDS RESUMO DO ESTOQUE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>📦 Total de Peças em Loja</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                  {dadosEstoqueGrafico.totalPecasEstoque} un
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>💵 Valor Total em Venda (R$)</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                  R$ {dadosEstoqueGrafico.totalValorVendaEstoque.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>🏷️ Custo Total do Estoque (R$)</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
                  R$ {dadosEstoqueGrafico.totalValorCustoEstoque.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>✨ Margem Bruta Projetada</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>
                  R$ {dadosEstoqueGrafico.lucroBrutoProjetado.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {/* GRÁFICOS DE ESTOQUE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* TOP 10 MAIOR VALOR FINANCEIRO EM ESTOQUE */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                  💰 Top 10 Produtos por Maior Valor em Dinheiro (R$)
                </h4>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart layout="vertical" data={dadosEstoqueGrafico.topMaiorValor} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                      <YAxis dataKey="nome" type="category" width={110} stroke="#64748b" fontSize={11} />
                      <Tooltip formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Valor Total em Loja']} />
                      <Bar dataKey="valorVendaTotal" fill="#10b981" radius={[0, 6, 6, 0]} name="Valor Venda (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TOP 10 MAIOR QUANTIDADE DE UNIDADES */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                  📦 Top 10 Produtos por Maior Quantidade (Unidades)
                </h4>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart layout="vertical" data={dadosEstoqueGrafico.topMaiorQtd} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="nome" type="category" width={110} stroke="#64748b" fontSize={11} />
                      <Tooltip formatter={(val: any) => [`${val} un`, 'Quantidade']} />
                      <Bar dataKey="quantidade" fill="#6366f1" radius={[0, 6, 6, 0]} name="Unidades" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: MAIS E MENOS VENDIDOS */}
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

        {/* ABA 6: INTELIGÊNCIA DE ESTOQUE E CONSELHOS AO DONO */}
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
