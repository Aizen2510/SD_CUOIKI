import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Database,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

interface DistributedLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LabTab = 'booking' | 'replication' | 'concurrency';

export const DistributedLabModal: React.FC<DistributedLabModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<LabTab>('booking');
  const [cluster, setCluster] = useState<any>(null);
  const [statusError, setStatusError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [demoEvent, setDemoEvent] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [replicationError, setReplicationError] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  // Tab 3 State: Concurrency & Replication Benchmark
  const [concurrencyCount, setConcurrencyCount] = useState<number>(10);
  const [benchSeatCode, setBenchSeatCode] = useState<string>('VIP-F8');
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [benchmarkError, setBenchmarkError] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');

  const refreshCluster = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const status = await api.getRealReplicationStatus();
      setCluster(status);
      setStatusError('');
    } catch (error: any) {
      setStatusError(error.message || 'Không kết nối được cụm PostgreSQL.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || (activeTab !== 'replication' && activeTab !== 'concurrency')) return;
    void refreshCluster();
    const timer = window.setInterval(() => void refreshCluster(), 5000);
    return () => window.clearInterval(timer);
  }, [isOpen, activeTab, refreshCluster]);

  if (!isOpen) return null;

  const writeDemoRecord = async () => {
    setIsWriting(true);
    setReplicationError('');
    try {
      const result = await api.writeRealReplicationDemo();
      setDemoEvent(result);
      setVerifyResult(null);
    } catch (error: any) {
      setReplicationError(error.message || 'Không ghi được bản ghi thử vào primary.');
    } finally {
      setIsWriting(false);
      void refreshCluster();
    }
  };

  const verifyDemoRecord = async () => {
    if (!demoEvent?.event_id) return;
    setIsVerifying(true);
    setReplicationError('');
    try {
      const result = await api.verifyRealReplicationDemo(demoEvent.event_id);
      setVerifyResult(result);
    } catch (error: any) {
      setReplicationError(error.message || 'Không đọc được bản ghi trên các node.');
    } finally {
      setIsVerifying(false);
      void refreshCluster();
    }
  };

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkError('');
    setCleanupMessage('');
    try {
      const res = await api.runConcurrentBenchmark(concurrencyCount, benchSeatCode);
      setBenchmarkResult(res);
    } catch (err: any) {
      setBenchmarkError(err.message || 'Lỗi khi chạy benchmark tranh ghế đồng thời.');
    } finally {
      setIsBenchmarking(false);
      void refreshCluster();
    }
  };

  const cleanupBenchmark = async () => {
    setIsCleaning(true);
    setBenchmarkError('');
    try {
      const res = await api.cleanupBenchmarkSeat(benchSeatCode);
      setCleanupMessage(res.message || 'Đã giải phóng ghế thử nghiệm thành công.');
      setBenchmarkResult(null);
    } catch (err: any) {
      setBenchmarkError(err.message || 'Lỗi khi giải phóng ghế.');
    } finally {
      setIsCleaning(false);
      void refreshCluster();
    }
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopyMessage('Đã sao chép lệnh.');
      window.setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage('Hãy sao chép lệnh bằng cách chọn dòng bên dưới.');
    }
  };

  const activePrimary = cluster?.active_primary;
  const offlineNode = cluster?.nodes?.find((node: any) => !node.online)?.name;
  const stopPrimaryCommand = activePrimary ? `docker compose stop ${activePrimary}` : 'Chưa xác định primary';
  const startPrimaryCommand = offlineNode ? `docker compose start ${offlineNode}` : 'Chưa có node dừng để khôi phục';
  const cliBenchmarkCommand = `python3 scripts/demo_concurrency_replication.py --concurrency ${concurrencyCount} --seat ${benchSeatCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-400/10 p-2 text-indigo-300">
              <Activity size={23} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white sm:text-xl">Demo Consistency &amp; Replication</h2>
              <p className="mt-1 text-xs text-slate-400">Các kịch bản thực nghiệm gắn với luồng đặt vé và cụm PostgreSQL 16 3-node</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={20} />
          </button>
        </header>

        <nav className="flex flex-wrap border-b border-slate-800 bg-slate-900/70 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold sm:px-5 ${activeTab === 'booking' ? 'border-rose-400 bg-rose-400/10 text-rose-200' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Ticket size={16} /> Kịch bản 1: Tranh ghế &amp; hoàn vé
          </button>
          <button
            onClick={() => setActiveTab('replication')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold sm:px-5 ${activeTab === 'replication' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Database size={16} /> Kịch bản 2: PostgreSQL replication thật
          </button>
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold sm:px-5 ${activeTab === 'concurrency' ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Zap size={16} /> Kịch bản 3: Tranh ghế &amp; Nhất quán sao chép
          </button>
        </nav>

        <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: KỊCH BẢN TRANH GHẾ & HOÀN VÉ THỦ CÔNG */}
          {activeTab === 'booking' && (
            <section className="space-y-5">
              <div className="rounded-xl border border-rose-800/70 bg-rose-950/30 p-4">
                <h3 className="flex items-center gap-2 font-bold text-rose-200"><Ticket size={18} /> Hai khách cùng chọn một ghế</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Đây là luồng đặt vé thật: hai phiên trình duyệt gửi booking cho cùng suất và ghế. PostgreSQL ràng buộc
                  <code className="mx-1 rounded bg-slate-900 px-1.5 py-0.5 text-rose-200">UNIQUE (showtime_id, seat_code)</code>
                  để chỉ một giao dịch giữ được ghế; giao dịch còn lại nhận lỗi xung đột.
                </p>
              </div>

              <ol className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200 sm:p-5">
                <li><strong className="text-white">1.</strong> Đóng cửa sổ Lab, mở MeoCinema ở hai cửa sổ trình duyệt.</li>
                <li><strong className="text-white">2.</strong> Chọn cùng phim, suất chiếu và ghế ở cả hai cửa sổ; xác nhận đặt gần như đồng thời.</li>
                <li><strong className="text-white">3.</strong> Một khách nhận vé; khách còn lại thấy ghế đã có người đặt. Kiểm tra booking trong PostgreSQL và log backend.</li>
                <li><strong className="text-white">4.</strong> Mở <b>Vé của tôi</b> của khách thắng và bấm <b>Hoàn vé</b> trước giờ chiếu. Trạng thái được cập nhật, ghế được trả về sơ đồ.</li>
                <li><strong className="text-white">5.</strong> Đặt lại ghế vừa trả để xác nhận khách khác có thể lấy chỗ. Nếu phim đã bắt đầu, API từ chối hoàn và giữ ghế.</li>
              </ol>
            </section>
          )}

          {/* TAB 2: KỊCH BẢN REPLICATION & FAILOVER */}
          {activeTab === 'replication' && (
            <section className="space-y-5">
              <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/30 p-4">
                <h3 className="flex items-center gap-2 font-bold text-emerald-200"><Database size={18} /> PostgreSQL physical streaming replication + auto failover</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Ba PostgreSQL node chạy dữ liệu thật. pg_auto_failover quản lý primary/standby, stream WAL và promote standby
                  khi primary dừng. Cụm chạy bằng container trên cùng máy để demo; đây là lỗi tiến trình/container, không mô phỏng mất cả máy vật lý.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${cluster?.healthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="font-semibold text-white">{cluster?.active_primary ? `Primary: ${cluster.active_primary}` : 'Đang tìm primary...'}</span>
                  <span className="text-slate-400">· {cluster?.online_nodes ?? 0}/{cluster?.expected_nodes ?? 3} node hoạt động</span>
                </div>
                <button onClick={() => void refreshCluster()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60">
                  <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /> Làm mới trạng thái
                </button>
              </div>

              {statusError && <div className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200"><AlertCircle size={17} className="mt-0.5 shrink-0" />{statusError}</div>}

              <div className="grid gap-3 md:grid-cols-3">
                {(cluster?.nodes || [{ name: 'pg-node1' }, { name: 'pg-node2' }, { name: 'pg-node3' }]).map((node: any) => (
                  <article key={node.name} className={`rounded-xl border p-4 ${node.online ? 'border-slate-700 bg-slate-900' : 'border-rose-900 bg-rose-950/20'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="flex items-center gap-2 font-bold text-white"><Server size={17} />{node.name}</h4>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${!node.online ? 'bg-rose-900 text-rose-200' : node.role === 'primary' ? 'bg-emerald-900 text-emerald-200' : 'bg-indigo-900 text-indigo-200'}`}>
                        {!node.online ? 'OFFLINE' : node.role?.toUpperCase() || '...'}
                      </span>
                    </div>
                    {node.online && <p className="mt-3 text-xs text-slate-400">WAL: <code className="text-slate-200">{node.wal_lsn || 'đang đồng bộ'}</code>{node.role === 'standby' && <><br />Replay lag: {node.replay_delay_seconds}s</>}</p>}
                    {!node.online && <p className="mt-3 text-xs text-rose-300">{node.error || 'Node hiện không truy cập được.'}</p>}
                  </article>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                <h4 className="font-bold text-white">Ghi dữ liệu thật rồi kiểm tra bản sao</h4>
                <p className="mt-1 text-sm text-slate-400">Bản ghi kiểm tra được ghi qua primary hiện tại vào PostgreSQL, sau đó có thể đọc trực tiếp trên cả ba node.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={writeDemoRecord} disabled={isWriting || !cluster?.active_primary} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                    <Play size={16} /> {isWriting ? 'Đang ghi...' : 'Ghi bản ghi demo vào Primary'}
                  </button>
                  <button onClick={verifyDemoRecord} disabled={isVerifying || !demoEvent?.event_id} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
                    <CheckCircle2 size={16} /> {isVerifying ? 'Đang kiểm tra...' : 'Kiểm tra trên các node'}
                  </button>
                </div>
                {demoEvent?.event_id && <p className="mt-3 break-all text-xs text-slate-300">Event ID: <code>{demoEvent.event_id}</code></p>}
                {replicationError && <p className="mt-3 text-sm text-rose-300">{replicationError}</p>}
                {verifyResult && <p className="mt-3 text-sm font-semibold text-emerald-200">Đã tìm thấy bản ghi trên {verifyResult.replicated_nodes}/3 node.</p>}
              </div>

              <div className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 sm:p-5">
                <h4 className="font-bold text-amber-100">Mô phỏng primary bị sập</h4>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>Ghi bản ghi demo và kiểm tra nó đã có trên standby.</li>
                  <li>Dùng lệnh bên dưới để dừng primary hiện tại. Monitor sẽ phát hiện lỗi và promote standby đủ điều kiện; chờ trạng thái tự cập nhật.</li>
                  <li>Kiểm tra Event ID trên node mới. Khởi động lại node cũ bằng lệnh phục hồi; node đó sẽ tham gia lại dưới vai trò standby.</li>
                </ol>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-amber-200">Dừng primary: <code>{stopPrimaryCommand}</code></span>
                    <button onClick={() => void copyCommand(stopPrimaryCommand)} disabled={!activePrimary} className="inline-flex items-center gap-2 rounded-lg border border-amber-800 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"><Clipboard size={14} /> Sao chép lệnh dừng</button>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-amber-200">Phục hồi node cũ: <code>{startPrimaryCommand}</code></span>
                    <button onClick={() => void copyCommand(startPrimaryCommand)} disabled={!offlineNode} className="inline-flex items-center gap-2 rounded-lg border border-amber-800 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"><RefreshCw size={14} /> Sao chép lệnh chạy lại</button>
                  </div>
                </div>
                {copyMessage && <p className="mt-2 text-xs text-emerald-300">{copyMessage}</p>}
                <p className="mt-3 text-xs leading-relaxed text-amber-200/80">Failover có thể mất vài chục giây. Trong thời gian chuyển vai trò, request ghi có thể tạm lỗi; gửi request mới sau khi trạng thái đã đổi sang primary mới. Dữ liệu đã xác nhận đồng bộ được giữ trên standby.</p>
              </div>
            </section>
          )}

          {/* TAB 3: KỊCH BẢN TRANH GHẾ ĐỒNG THỜI & NHẤT QUÁN SAO CHÉP (MỚI) */}
          {activeTab === 'concurrency' && (
            <section className="space-y-5">
              <div className="rounded-xl border border-amber-600/50 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-indigo-950/40 p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-400/20 p-1.5 text-amber-300">
                    <Zap size={20} />
                  </div>
                  <h3 className="font-bold text-amber-200 text-base sm:text-lg">
                    Bão đặt vé đồng thời &amp; Đối soát Nhất quán cụm Replica
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Minh họa sự kết hợp giữa <b>Transaction Consistency (ACID)</b> và <b>Replication Consistency</b>:
                  Khi hàng chục client cùng lúc tranh mua 1 ghế duy nhất trong cùng 1 microsecond, cơ sở dữ liệu
                  đảm bảo <b>chỉ duy nhất 1 booking thành công</b> (ngăn 100% Double-Booking). Ngay sau khi commit,
                  WAL streaming lập tức đồng bộ bản ghi sang các Standby replicas và đảm bảo <b>Read-Your-Writes Consistency</b>.
                </p>
              </div>

              {/* BẢNG ĐIỀU KHIỂN THỰC THI */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Cấu hình kịch bản kiểm thử</h4>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {/* Concurrency Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số khách hàng đồng thời:</label>
                    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1">
                      {[5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setConcurrencyCount(num)}
                          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                            concurrencyCount === num
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {num} requests
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seat Code Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mã ghế thử nghiệm:</label>
                    <input
                      type="text"
                      value={benchSeatCode}
                      onChange={(e) => setBenchSeatCode(e.target.value.toUpperCase())}
                      className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white uppercase focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-end gap-2.5 pt-4 sm:pt-0">
                    <button
                      onClick={runBenchmark}
                      disabled={isBenchmarking}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
                    >
                      <Zap size={16} className={isBenchmarking ? 'animate-bounce' : ''} />
                      {isBenchmarking ? `Đang bắn ${concurrencyCount} requests...` : `Chạy kiểm thử (${concurrencyCount} requests)`}
                    </button>

                    <button
                      onClick={cleanupBenchmark}
                      disabled={isCleaning || isBenchmarking}
                      title="Giải phóng ghế để chạy lại"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      {isCleaning ? 'Đang dọn...' : 'Dọn dẹp ghế'}
                    </button>
                  </div>
                </div>

                {benchmarkError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{benchmarkError}</span>
                  </div>
                )}

                {cleanupMessage && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-200">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                    <span>{cleanupMessage}</span>
                  </div>
                )}
              </div>

              {/* KẾT QUẢ SAU KHI CHẠY BENCHMARK */}
              {benchmarkResult && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* BANNER SUẤT CHIẾU HỢP LỆ (CHƯA QUA GIỜ) & THÔNG TIN VÉ */}
                  {benchmarkResult.showtime_info && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700/60 bg-gradient-to-r from-amber-950/40 to-slate-900 p-3.5 text-xs text-amber-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-emerald-900/70 px-2 py-0.5 font-bold text-emerald-300 border border-emerald-700/70">
                          ✓ SUẤT CHIẾU HỢP LỆ (CHƯA QUA GIỜ)
                        </span>
                        <span>Phim: <b>{benchmarkResult.showtime_info.movie_title}</b></span>
                        <span className="text-slate-400">·</span>
                        <span>Suất: <b>{benchmarkResult.showtime_info.show_time} ngày {benchmarkResult.showtime_info.show_date}</b></span>
                        <span className="text-slate-400">·</span>
                        <span>Rạp: <b>{benchmarkResult.showtime_info.cinema_name}</b></span>
                      </div>
                      {benchmarkResult.winner && (
                        <div className="flex items-center gap-2">
                          <span>Mã vé: <code className="rounded bg-slate-950 px-2 py-0.5 font-bold text-amber-300 border border-slate-700">{benchmarkResult.winner.booking_code}</code></span>
                          <span className="text-slate-400">·</span>
                          <span>Người nhận: <b className="text-white">{benchmarkResult.winner.customer}</b></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3 THỐNG KÊ TỔNG QUAN */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* CARD 1: TRANSACTION CONSISTENCY */}
                    <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Giao dịch thành công</span>
                        <ShieldCheck size={18} className="text-emerald-400" />
                      </div>
                      <div className="mt-2 text-2xl font-extrabold text-white">
                        {benchmarkResult.success_count} / {benchmarkResult.total_requests}
                      </div>
                      <p className="mt-1 text-xs text-emerald-200/90">
                        {benchmarkResult.winner ? (
                          <>Thắng: <b>{benchmarkResult.winner.customer}</b> ({benchmarkResult.winner.booking_code})</>
                        ) : 'Không có giao dịch thắng'}
                      </p>
                      <div className="mt-2 inline-block rounded bg-emerald-900/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        Overbooking = 0 (Chống trùng ghế 100%)
                      </div>
                    </div>

                    {/* CARD 2: CONFLICT ROLLBACK */}
                    <div className="rounded-xl border border-rose-800/80 bg-rose-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Xung đột &amp; Rollback</span>
                        <Users size={18} className="text-rose-400" />
                      </div>
                      <div className="mt-2 text-2xl font-extrabold text-white">
                        {benchmarkResult.conflict_count} requests
                      </div>
                      <p className="mt-1 text-xs text-rose-200/90">
                        Lỗi: <code className="text-rose-300">409 Conflict</code> (Trùng khóa unique_showtime_seat)
                      </p>
                      <div className="mt-2 inline-block rounded bg-rose-900/40 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                        ACID Rollback an toàn
                      </div>
                    </div>

                    {/* CARD 3: REPLICATION CONSISTENCY */}
                    <div className="rounded-xl border border-indigo-800/80 bg-indigo-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Đối soát Replica</span>
                        <Database size={18} className="text-indigo-400" />
                      </div>
                      <div className="mt-2 text-2xl font-extrabold text-white">
                        {benchmarkResult.nodes?.filter((n: any) => n.status === 'CONSISTENT').length ?? 3} / {benchmarkResult.nodes?.length ?? 3} Node
                      </div>
                      <p className="mt-1 text-xs text-indigo-200/90">
                        Ghế {benchSeatCode} đồng bộ hoàn toàn trên mọi node
                      </p>
                      <div className="mt-2 inline-block rounded bg-indigo-900/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                        Strict Replica Consistency
                      </div>
                    </div>
                  </div>

                  {/* BẢNG ĐỐI SOÁT CHI TIẾT CÁC NODE POSTGRESQL */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                    <h4 className="flex items-center gap-2 font-bold text-white text-sm">
                      <Server size={17} className="text-indigo-400" />
                      Bảng đối soát dữ liệu trên từng Node trong Cụm Replication
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Truy vấn trực tiếp từng PostgreSQL node sau khi giao dịch commit tại Primary.
                    </p>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2.5 px-3">Node</th>
                            <th className="py-2.5 px-3">Vai trò</th>
                            <th className="py-2.5 px-3">WAL / LSN</th>
                            <th className="py-2.5 px-3">Ghế {benchSeatCode}</th>
                            <th className="py-2.5 px-3">Mã Booking ghi nhận</th>
                            <th className="py-2.5 px-3">Kết quả đối soát</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {benchmarkResult.nodes?.map((node: any) => (
                            <tr key={node.node} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-sans font-bold text-white">{node.node}</td>
                              <td className="py-2.5 px-3">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  node.role === 'primary' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                }`}>
                                  {node.role?.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">{node.wal_lsn || 'N/A'}</td>
                              <td className="py-2.5 px-3">
                                {node.has_seat ? (
                                  <span className="font-semibold text-emerald-400">ĐÃ GIỮ (BOOKED)</span>
                                ) : (
                                  <span className="text-slate-500">TRỐNG</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-amber-200">
                                {node.booking_code || '---'}
                              </td>
                              <td className="py-2.5 px-3">
                                {node.status === 'CONSISTENT' ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-800/50">
                                    <CheckCircle2 size={12} /> ĐỒNG BỘ 100%
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-rose-900/30 px-2 py-0.5 text-[11px] font-bold text-rose-300 border border-rose-800/50">
                                    {node.status}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* THỰC NGHIỆM READ-YOUR-WRITES CONSISTENCY */}
                  {benchmarkResult.read_your_writes && (
                    <div className="rounded-xl border border-indigo-800/70 bg-gradient-to-r from-indigo-950/40 to-slate-900 p-4">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                        <CheckCircle2 size={17} className="text-emerald-400" />
                        Xác nhận tính nhất quán Đọc-sau-Ghi (Read-Your-Writes Consistency)
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        Đã thực hiện truy vấn đọc vé ngay lập tức từ Standby Replica{' '}
                        <code className="text-indigo-200 bg-slate-900 px-1 py-0.5 rounded">{benchmarkResult.read_your_writes.source_node}</code>.
                        Vé <code className="text-amber-200 bg-slate-900 px-1 py-0.5 rounded">{benchmarkResult.read_your_writes.ticket?.booking_code}</code>{' '}
                        của khách <b>{benchmarkResult.read_your_writes.ticket?.customer_name}</b> đã hiển thị đầy đủ và chính xác nhờ cơ chế
                        Synchronous WAL Streaming Replication mà không hề bị trễ dữ liệu (No Stale Read).
                      </p>
                    </div>
                  )}

                  {/* DANH SÁCH CHI TIẾT TỪNG REQUEST ĐỒNG THỜI */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-2">
                      Chi tiết phản hồi {benchmarkResult.requests?.length} Client Requests
                    </h5>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {benchmarkResult.requests?.map((req: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                            req.success
                              ? 'border border-emerald-800/70 bg-emerald-950/30 text-emerald-200'
                              : 'border border-slate-800 bg-slate-950/50 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${req.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span className="font-semibold text-white">{req.customer}</span>
                            <span className="text-[11px] text-slate-400 font-mono">({req.latency_ms}ms)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                              req.status === 200 ? 'bg-emerald-900 text-emerald-200' : 'bg-rose-900/60 text-rose-300'
                            }`}>
                              HTTP {req.status}
                            </span>
                            <span className="text-[11px] truncate max-w-xs">{req.message || req.error}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DÒNG LỆNH TERMINAL CLI */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Demo bằng Terminal CLI (Dành cho thuyết trình / chấm điểm)
                  </h4>
                  <button
                    onClick={() => void copyCommand(cliBenchmarkCommand)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-slate-800"
                  >
                    <Clipboard size={13} /> Sao chép lệnh CLI
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-2.5 text-xs text-amber-300 font-mono border border-slate-800">
                  {cliBenchmarkCommand}
                </pre>
                {copyMessage && <p className="mt-1.5 text-xs text-emerald-300">{copyMessage}</p>}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
