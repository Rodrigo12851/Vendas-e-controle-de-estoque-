import React, { useState } from 'react';
import { ItemEstoque, Supermercado } from '../types';

interface EtiquetasModalProps {
  visivel: boolean;
  onFechar: () => void;
  estoque: ItemEstoque[];
  loja: Supermercado | null;
}

export const EtiquetasModal: React.FC<EtiquetasModalProps> = ({
  visivel,
  onFechar,
  estoque,
  loja,
}) => {
  const [itensSelecionados, setItensSelecionados] = useState<{ item: ItemEstoque; copias: number }[]>([]);
  const [busca, setBusca] = useState('');
  const [modeloEtiqueta, setModeloEtiqueta] = useState<'padrao' | 'oferta'>('padrao');

  if (!visivel) return null;

  const estoqueFiltrado = estoque.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAdicionarEtiqueta = (item: ItemEstoque) => {
    const existeIndex = itensSelecionados.findIndex((i) => i.item.codigo === item.codigo);
    if (existeIndex !== -1) {
      const novaLista = [...itensSelecionados];
      novaLista[existeIndex].copias += 1;
      setItensSelecionados(novaLista);
    } else {
      setItensSelecionados([...itensSelecionados, { item, copias: 1 }]);
    }
  };

  const handleIncluirTodos = () => {
    if (estoqueFiltrado.length === 0) return;
    const novaLista = [...itensSelecionados];
    estoqueFiltrado.forEach((item) => {
      const idx = novaLista.findIndex((i) => i.item.codigo === item.codigo);
      if (idx !== -1) {
        novaLista[idx].copias += 1;
      } else {
        novaLista.push({ item, copias: 1 });
      }
    });
    setItensSelecionados(novaLista);
  };

  const handleLimparLista = () => {
    setItensSelecionados([]);
  };

  const handleAlterarCopias = (index: number, delta: number) => {
    const novaLista = [...itensSelecionados];
    novaLista[index].copias += delta;
    if (novaLista[index].copias <= 0) {
      novaLista.splice(index, 1);
    }
    setItensSelecionados(novaLista);
  };

  const handleImprimirEtiquetas = () => {
    if (itensSelecionados.length === 0) {
      alert('Selecione pelo menos um produto para imprimir etiquetas.');
      return;
    }
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '850px', width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            🏷️ Gerador e Impressor de Etiquetas de Prateleira
          </h3>
          <button className="btn-fechar-modal" onClick={onFechar}>&times;</button>
        </div>

        {/* BARRA DE OPÇÕES DE IMPRESSÃO */}
        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Modelo de Etiqueta:</span>
            <button
              type="button"
              className={`btn ${modeloEtiqueta === 'padrao' ? 'btn-salvar' : ''}`}
              style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem', background: modeloEtiqueta === 'padrao' ? undefined : '#e2e8f0', color: modeloEtiqueta === 'padrao' ? undefined : '#334155' }}
              onClick={() => setModeloEtiqueta('padrao')}
            >
              🏷️ Padrão Gôndola
            </button>
            <button
              type="button"
              className={`btn ${modeloEtiqueta === 'oferta' ? 'btn-salvar' : ''}`}
              style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem', background: modeloEtiqueta === 'oferta' ? '#dc2626' : '#e2e8f0', color: modeloEtiqueta === 'oferta' ? '#ffffff' : '#334155' }}
              onClick={() => setModeloEtiqueta('oferta')}
            >
              🔥 Oferta / Promoção
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn"
              style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem', background: '#0284c7', color: '#fff' }}
              onClick={handleIncluirTodos}
            >
              ➕ Incluir Filtrados
            </button>
            {itensSelecionados.length > 0 && (
              <button
                type="button"
                className="btn"
                style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem', background: '#fee2e2', color: '#dc2626' }}
                onClick={handleLimparLista}
              >
                🗑️ Limpar
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '16px' }}>
          {/* PAINEL ESQUERDO: SELEÇÃO DE PRODUTOS */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b' }}>
              1. Selecionar Produtos ({estoqueFiltrado.length})
            </h4>
            <input
              type="text"
              className="input-padrao"
              placeholder="🔎 Buscar produto por nome ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ marginBottom: '10px', width: '100%' }}
            />

            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>
              {estoqueFiltrado.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Nenhum produto encontrado.
                </div>
              ) : (
                estoqueFiltrado.map((prod) => (
                  <div
                    key={prod.codigo}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', display: 'block', color: '#0f172a' }}>{prod.nome}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Cód: {prod.codigo} | <strong style={{ color: '#16a34a' }}>R$ {prod.preco_venda.toFixed(2)}</strong>
                      </span>
                    </div>
                    <button
                      className="btn btn-salvar"
                      style={{ padding: '3px 8px', fontSize: '0.75rem', minHeight: '32px' }}
                      onClick={() => handleAdicionarEtiqueta(prod)}
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: FILA DE IMPRESSÃO */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b' }}>
              2. Fila de Impressão ({itensSelecionados.reduce((acc, i) => acc + i.copias, 0)} etiquetas)
            </h4>

            {itensSelecionados.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', flex: 1 }}>
                Nenhuma etiqueta na fila. Clique em "+ Add" ao lado para montar sua folha de etiquetas.
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '12px', flex: 1 }}>
                  {itensSelecionados.map((itemObj, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: '#fff',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                        <strong style={{ fontSize: '0.82rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {itemObj.item.nome}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                          R$ {itemObj.item.preco_venda.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', background: '#f1f5f9' }}
                          onClick={() => handleAlterarCopias(idx, -1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', minWidth: '18px', textAlign: 'center' }}>{itemObj.copias}</span>
                        <button
                          style={{ padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', background: '#f1f5f9' }}
                          onClick={() => handleAlterarCopias(idx, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-salvar"
                  style={{ width: '100%', padding: '10px', fontSize: '0.95rem', fontWeight: 700, background: '#16a34a' }}
                  onClick={handleImprimirEtiquetas}
                >
                  🖨️ Imprimir Etiquetas Agora
                </button>
              </>
            )}
          </div>
        </div>

        {/* PRÉ-VISUALIZAÇÃO DE ETIQUETAS IMPRIMÍVEIS */}
        {itensSelecionados.length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '0.85rem' }}>
              Pré-visualização da Folha de Etiquetas ({modeloEtiqueta === 'oferta' ? 'Modelo Oferta Especial' : 'Modelo Padrão Gôndola'}):
            </h5>
            <div id="area-impressao-etiquetas" className="grid-etiquetas-impressao">
              {itensSelecionados.flatMap((itemObj) =>
                Array.from({ length: itemObj.copias }).map((_, cIdx) => (
                  <div
                    key={`${itemObj.item.codigo}-${cIdx}`}
                    className="etiqueta-prateleira-card"
                    style={modeloEtiqueta === 'oferta' ? { border: '2px solid #dc2626', background: '#fff' } : {}}
                  >
                    <div
                      className="etiqueta-loja-nome"
                      style={modeloEtiqueta === 'oferta' ? { background: '#dc2626', color: '#fff', padding: '2px', borderRadius: '2px' } : {}}
                    >
                      {modeloEtiqueta === 'oferta' ? '🔥 OFERTA IMPERDÍVEL' : loja?.nome || 'SUPERMERCADO'}
                    </div>
                    <div className="etiqueta-prod-nome">{itemObj.item.nome}</div>
                    <div className="etiqueta-preco-box" style={modeloEtiqueta === 'oferta' ? { color: '#dc2626' } : {}}>
                      <span className="etiqueta-rs">R$</span>
                      <span className="etiqueta-valor">{itemObj.item.preco_venda.toFixed(2)}</span>
                    </div>
                    <div className="etiqueta-barcode">
                      <div className="barcode-bars">||||| | |||| || ||| |||||| |</div>
                      <span className="etiqueta-cod">{itemObj.item.codigo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
