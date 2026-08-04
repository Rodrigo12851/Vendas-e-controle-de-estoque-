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

  const handleAlterarCopias = (index: number, delta: number) => {
    const novaLista = [...itensSelecionados];
    novaLista[index].copias += delta;
    if (novaLista[index].copias <= 0) {
      novaLista.splice(index, 1);
    }
    setItensSelecionados(novaLista);
  };

  const handleImprimirEtiquetas = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '850px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏷️ Gerador e Impressor de Etiquetas de Prateleira
          </h3>
          <button className="btn-fechar-modal" onClick={onFechar}>&times;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
          {/* PAINEL ESQUERDO: SELEÇÃO DE PRODUTOS */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#1e293b' }}>
              1. Escolha os Produtos para Imprimir
            </h4>
            <input
              type="text"
              className="input-padrao"
              placeholder="🔎 Buscar produto no estoque..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ marginBottom: '12px', width: '100%' }}
            />

            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>
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
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', display: 'block', color: '#0f172a' }}>{prod.nome}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Cód: {prod.codigo} | R$ {prod.preco_venda.toFixed(2)}
                      </span>
                    </div>
                    <button
                      className="btn btn-salvar"
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => handleAdicionarEtiqueta(prod)}
                    >
                      + Incluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: FILA DE IMPRESSÃO */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#1e293b' }}>
              2. Fila de Etiquetas a Imprimir ({itensSelecionados.reduce((acc, i) => acc + i.copias, 0)} un)
            </h4>

            {itensSelecionados.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Nenhuma etiqueta selecionada. Clique em "+ Incluir" ao lado.
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px' }}>
                  {itensSelecionados.map((itemObj, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{itemObj.item.nome}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                          R$ {itemObj.item.preco_venda.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          onClick={() => handleAlterarCopias(idx, -1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '0.88rem' }}>{itemObj.copias}</span>
                        <button
                          style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
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
                  style={{ width: '100%', padding: '10px', fontSize: '0.95rem', fontWeight: 600 }}
                  onClick={handleImprimirEtiquetas}
                >
                  🖨️ Imprimir Etiquetas Agora
                </button>
              </>
            )}
          </div>
        </div>

        {/* PRÉ-VISUALIZAÇÃO DE ETIQUETAS IMPRIMÍVEIS NA PÁGINA */}
        {itensSelecionados.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#475569' }}>Pré-visualização das Etiquetas de Prateleira:</h5>
            <div className="grid-etiquetas-impressao">
              {itensSelecionados.flatMap((itemObj) =>
                Array.from({ length: itemObj.copias }).map((_, cIdx) => (
                  <div key={`${itemObj.item.codigo}-${cIdx}`} className="etiqueta-prateleira-card">
                    <div className="etiqueta-loja-nome">{loja?.nome || 'SUPERMERCADO'}</div>
                    <div className="etiqueta-prod-nome">{itemObj.item.nome}</div>
                    <div className="etiqueta-preco-box">
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
