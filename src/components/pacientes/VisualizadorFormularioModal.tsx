import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSearch,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';
import { Paciente, FormularioCadastroPaciente } from '../../types/clinic';
import { FormularioStorageService, ArquivoArmazenado } from '../../services/formularioStorageService';
import { converterArquivoParaImagens } from '../../services/pdfConverterService';

interface VisualizadorFormularioModalProps {
  paciente: Paciente;
  formulario: FormularioCadastroPaciente;
  onFechar: () => void;
  onBaixarArquivo: () => void;
  onImprimirArquivo: () => void;
  onArquivoCarregado?: (novoForm: FormularioCadastroPaciente) => void;
}

export const VisualizadorFormularioModal: React.FC<VisualizadorFormularioModalProps> = ({
  paciente,
  formulario,
  onFechar,
  onBaixarArquivo,
  onImprimirArquivo,
  onArquivoCarregado,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotacao, setRotacao] = useState<number>(0);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [modoVisualizacao, setModoVisualizacao] = useState<'todas' | 'pagina'>('todas');
  const [carregando, setCarregando] = useState<boolean>(true);

  // Arquivo original recuperado do IndexedDB
  const [arquivoOriginal, setArquivoOriginal] = useState<ArquivoArmazenado | null>(null);
  const [urlObjeto, setUrlObjeto] = useState<string | null>(null);
  const [paginasImagens, setPaginasImagens] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega o arquivo original salvo para este paciente
  useEffect(() => {
    let ativo = true;

    async function carregarArquivo() {
      setCarregando(true);
      try {
        const arq = await FormularioStorageService.obterArquivoOriginal(paciente.id);
        if (!ativo) return;

        if (arq && arq.blob) {
          setArquivoOriginal(arq);
          const url = URL.createObjectURL(arq.blob);
          setUrlObjeto(url);

          // Se já tem as páginas renderizadas do arquivo original
          if (arq.paginasDataUrl && arq.paginasDataUrl.length > 0) {
            setPaginasImagens(arq.paginasDataUrl);
          } else {
            // Converte páginas se for PDF ou lê como imagem direta
            const fileObj = new File([arq.blob], arq.nomeArquivo, { type: arq.tipoMime });
            const paginas = await converterArquivoParaImagens(fileObj);
            if (ativo && paginas.length > 0) {
              setPaginasImagens(paginas);
              // Salva o cache de páginas junto ao arquivo original
              FormularioStorageService.salvarArquivoOriginal(paciente.id, arq.blob, arq.nomeArquivo, paginas);
            }
          }
        } else {
          setArquivoOriginal(null);
          setUrlObjeto(null);
          setPaginasImagens([]);
        }
      } catch (err) {
        console.error('Erro ao ler arquivo original:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarArquivo();

    return () => {
      ativo = false;
      if (urlObjeto) {
        URL.revokeObjectURL(urlObjeto);
      }
    };
  }, [paciente.id]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 40));
  const handleResetZoom = () => {
    setZoom(100);
    setRotacao(0);
  };
  const handleRotacionar = () => setRotacao((prev) => (prev + 90) % 360);

  // Quando o usuário seleciona o arquivo real do seu computador
  const handleSelecionarArquivoReal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    try {
      // 1. Extrai as páginas reais do arquivo original sem qualquer alteração
      const paginas = await converterArquivoParaImagens(file);

      // 2. Salva o arquivo real original no IndexedDB
      await FormularioStorageService.salvarArquivoOriginal(
        paciente.id,
        file,
        file.name,
        paginas
      );

      // 3. Atualiza estado para exibição
      if (urlObjeto) URL.revokeObjectURL(urlObjeto);
      const novaUrl = URL.createObjectURL(file);
      setUrlObjeto(novaUrl);
      setArquivoOriginal({
        pacienteId: paciente.id,
        blob: file,
        nomeArquivo: file.name,
        tipoMime: file.type,
        tamanhoKb: Math.round(file.size / 1024),
        paginasDataUrl: paginas,
        atualizadoEm: new Date().toISOString(),
      });
      setPaginasImagens(paginas);
      setPaginaAtual(1);

      // 4. Notifica o componente pai
      if (onArquivoCarregado) {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        onArquivoCarregado({
          ...formulario,
          nomeArquivo: file.name,
          tipoArquivo: isPdf ? 'pdf' : 'jpeg',
          tamanhoKb: Math.round(file.size / 1024),
        });
      }
    } catch (err) {
      console.error('Erro ao processar o arquivo selecionado:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleBaixarArquivoOriginal = () => {
    if (arquivoOriginal && arquivoOriginal.blob) {
      const url = URL.createObjectURL(arquivoOriginal.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoOriginal.nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      onBaixarArquivo();
    }
  };

  const handleImprimir = () => {
    if (paginasImagens.length > 0) {
      const imgParaImprimir = paginasImagens[paginaAtual - 1] || paginasImagens[0];
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head><title>${arquivoOriginal?.nomeArquivo || formulario.nomeArquivo}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#fff;">
              <img src="${imgParaImprimir}" style="max-width:100%;height:auto;" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        win.document.close();
        return;
      }
    }
    window.print();
  };

  const isVencido = formulario.statusVencimento === 'VENCIDO';
  const isAlerta = formulario.statusVencimento === 'ALERTA_PROXIMO_VENCIMENTO';
  const totalPaginas = paginasImagens.length;
  const isPdf = (arquivoOriginal?.nomeArquivo || formulario.nomeArquivo).toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#002172] text-[#91CA0C] border border-[#002172]/50 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white font-['Quicksand']">
                  Arquivo Original do Formulário — {paciente.nome}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#002172] text-white text-[10px] font-extrabold uppercase font-mono border border-blue-800">
                  {totalPaginas > 1 ? `${totalPaginas} PÁGINAS` : isPdf ? 'PDF ORIGINAL' : 'IMAGEM ORIGINAL'}
                </span>
                {isVencido ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs">
                    <AlertTriangle className="w-3 h-3" />
                    Vencido ({formulario.diasRestantes}d)
                  </span>
                ) : isAlerta ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence em {formulario.diasRestantes}d
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Válido ({formulario.diasRestantes}d)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {arquivoOriginal?.nomeArquivo || formulario.nomeArquivo} ({arquivoOriginal?.tamanhoKb || formulario.tamanhoKb} KB) • Prontuário #{paciente.codigoProntuario}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
              onChange={handleSelecionarArquivoReal}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#002172] hover:bg-[#001752] rounded-xl transition-all border border-blue-700 cursor-pointer shadow-2xs"
              title="Carregar ou substituir o arquivo original do seu computador"
            >
              <Upload className="w-3.5 h-3.5 text-[#91CA0C]" />
              <span>{arquivoOriginal ? 'Trocar Arquivo' : 'Selecionar Arquivo'}</span>
            </button>
            <button
              onClick={handleBaixarArquivoOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 cursor-pointer"
              title="Baixar arquivo original"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Baixar</span>
            </button>
            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 cursor-pointer"
              title="Imprimir"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onFechar}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar de Controle de Páginas e Zoom */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setModoVisualizacao('todas')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    modoVisualizacao === 'todas'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ver Todas ({totalPaginas})
                </button>
                <button
                  onClick={() => setModoVisualizacao('pagina')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    modoVisualizacao === 'pagina'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Página por Página
                </button>
              </div>
            )}

            {modoVisualizacao === 'pagina' && totalPaginas > 1 && (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-slate-200 font-bold font-mono">
                <button
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                  className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Pág. {paginaAtual} de {totalPaginas}
                </span>
                <button
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                  className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-slate-300">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-2 font-bold min-w-[45px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleRotacionar}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 cursor-pointer"
              title="Girar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-800 cursor-pointer"
            >
              Ajustar
            </button>

            {urlObjeto && (
              <a
                href={urlObjeto}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition-colors"
                title="Abrir arquivo original em uma nova aba do navegador"
              >
                <ExternalLink className="w-3 h-3 text-[#91CA0C]" />
                <span>Abrir Original em Nova Aba</span>
              </a>
            )}
          </div>
        </div>

        {/* Viewport: Exibição Pura do Arquivo Original sem qualquer alteração */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center justify-start gap-8">
          {carregando ? (
            <div className="py-24 text-center space-y-3 m-auto">
              <Loader2 className="w-10 h-10 text-[#91CA0C] animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Carregando arquivo original...</p>
            </div>
          ) : paginasImagens.length > 0 ? (
            /* Exibe as páginas reais extraídas diretamente do arquivo importado */
            modoVisualizacao === 'todas' ? (
              paginasImagens.map((imgUrl, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-2 w-full max-w-[850px]">
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                      <Layers className="w-3.5 h-3.5 text-[#91CA0C]" />
                      <span>
                        PÁGINA {idx + 1} DE {totalPaginas}
                      </span>
                    </div>
                  )}

                  <div
                    className="transition-transform duration-200 origin-top flex justify-center w-full"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotacao}deg)`,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Página ${idx + 1} — ${arquivoOriginal?.nomeArquivo || formulario.nomeArquivo}`}
                      className="max-w-[850px] w-full h-auto object-contain rounded-xl shadow-2xl border border-slate-700 bg-white"
                    />
                  </div>
                </div>
              ))
            ) : (
              paginasImagens[paginaAtual - 1] && (
                <div className="flex flex-col items-center space-y-2 w-full max-w-[850px]">
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                      <Layers className="w-3.5 h-3.5 text-[#91CA0C]" />
                      <span>
                        PÁGINA {paginaAtual} DE {totalPaginas}
                      </span>
                    </div>
                  )}

                  <div
                    className="transition-transform duration-200 origin-top flex justify-center w-full"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotacao}deg)`,
                    }}
                  >
                    <img
                      src={paginasImagens[paginaAtual - 1]}
                      alt={`Página ${paginaAtual} — ${arquivoOriginal?.nomeArquivo || formulario.nomeArquivo}`}
                      className="max-w-[850px] w-full h-auto object-contain rounded-xl shadow-2xl border border-slate-700 bg-white"
                    />
                  </div>
                </div>
              )
            )
          ) : urlObjeto && isPdf ? (
            /* Fallback do PDF nativo caso a renderização de página não ocorra */
            <div className="w-full h-full flex flex-col items-center">
              <iframe
                src={urlObjeto}
                title={arquivoOriginal?.nomeArquivo || formulario.nomeArquivo}
                className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              />
            </div>
          ) : (
            /* Estado quando o arquivo original ainda não foi carregado do computador nesta sessão */
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900 text-center max-w-lg space-y-4 my-auto">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#002172] border border-blue-800 flex items-center justify-center text-[#91CA0C]">
                <FileSearch className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Carregar Arquivo Original</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para visualizar o formulário original do paciente exatamente como ele é (sem qualquer alteração ou recriação), selecione o arquivo do seu computador:
                </p>
                <p className="text-xs font-mono font-bold text-blue-400 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800 inline-block mt-2">
                  {formulario.nomeArquivo}
                </p>
              </div>

              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 border border-blue-700"
                >
                  <Upload className="w-4 h-4 text-[#91CA0C]" />
                  <span>Selecionar Arquivo no Computador (.pdf / imagem)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                O arquivo será salvo com segurança no seu navegador e aberto imediatamente de forma original e intacta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
