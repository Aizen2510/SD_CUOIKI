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
  X
} from 'lucide-react';
import { api } from '../services/api';

interface DistributedLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LabTab = 'booking' | 'replication';

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
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [consistencyError, setConsistencyError] = useState('');
  const [isRunningConsistency, setIsRunningConsistency] = useState(false);

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
    if (!isOpen || activeTab !== 'replication') return;
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

  const runConsistencyDemo = async () => {
    setIsRunningConsistency(true);
    setConsistencyError('');
    try {
      setConsistencyResult(await api.runReadAfterWriteConsistencyDemo());
    } catch (error: any) {
      setConsistencyError(error.message || 'Không chạy được demo consistency.');
    } finally {
      setIsRunningConsistency(false);
    }
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopyMessage('Đã sao chép lệnh.');
      window.setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage('Không truy cập được clipboard. Hãy chọn lệnh đang hiển thị để sao chép.');
    }
  };

  const activePrimary = cluster?.active_primary;
  const offlineNode = cluster?.nodes?.find((node: any) => !node.online)?.name;
  const stopPrimaryCommand = activePrimary ? `docker compose stop ${activePrimary}` : 'Chưa xác định primary';
  const startPrimaryCommand = offlineNode ? `docker compose start ${offlineNode}` : 'Chưa có node dừng để khôi phục';
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
              <p className="mt-1 text-xs text-slate-400">Hai demo Chương 7 trên cụm PostgreSQL 16 ba node</p>
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
            <Activity size={16} /> Kịch bản 1: Consistency đọc-sau-ghi
          </button>
          <button
            onClick={() => setActiveTab('replication')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold sm:px-5 ${activeTab === 'replication' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Database size={16} /> Kịch bản 2: PostgreSQL replication thật
          </button>
        </nav>

        <main className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* SCENARIO 1: CLIENT-CENTRIC READ-YOUR-WRITES CONSISTENCY */}
          {activeTab === 'booking' && (
            <section className="space-y-5">
              <div className="rounded-xl border border-indigo-800/70 bg-indigo-950/30 p-4">
                <h3 className="flex items-center gap-2 font-bold text-indigo-200"><Activity size={18} /> Ghi ở Primary, đọc từ Standby</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Mô phỏng một client ghi event lên Primary rồi tiếp tục đọc từ Standby. Nếu một tài khoản khác đọc
                  cùng Primary sau commit, nó thấy dữ liệu trên chính bản sao đó; điều này không kiểm tra độ trễ replica.
                  Demo đọc trực tiếp Standby, ghi nhận trạng thái sau commit, rồi đợi replay LSN vượt qua write LSN trước lần đọc được xác nhận.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                <p className="text-sm text-slate-300">Consistency rule: không coi lần đọc Standby là đọc-sau-ghi cho đến khi replica đã replay WAL tới write LSN của event.</p>
                <button onClick={runConsistencyDemo} disabled={isRunningConsistency} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
                  <Play size={16} /> {isRunningConsistency ? 'Đang ghi và chờ replica...' : 'Chạy consistency read-after-write'}
                </button>
                {consistencyError && <p className="mt-3 text-sm text-rose-300">{consistencyError}</p>}
              </div>

              {consistencyResult && (
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                  <p className="break-all text-xs text-slate-300">Event <code>{consistencyResult.event_id}</code> · write LSN <code>{consistencyResult.write_lsn}</code></p>
                  <h4 className="font-bold text-white">Đọc tức thời sau commit (quan sát, không có wait)</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(consistencyResult.immediate_observations || []).map((node: any) => (
                      <div key={node.node} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
                        <b>{node.node}</b> · {node.role}<br />
                        <span className={node.found ? 'text-emerald-300' : 'text-amber-300'}>{node.found ? 'Đã thấy event' : node.error ? 'Không truy cập được' : 'Chưa thấy event'}</span>
                        {node.replay_lsn && <div className="mt-1 break-all text-xs text-slate-400">Replay LSN: {node.replay_lsn}</div>}
                      </div>
                    ))}
                  </div>
                  <h4 className="font-bold text-white">Đọc Standby sau khi replay tới write LSN</h4>
                  {(consistencyResult.standby_results || []).map((node: any) => (
                    <p key={node.node} className="text-sm text-slate-300">{node.node}: {node.caught_up && node.read_after_wait_found ? 'đọc thấy event sau khi chờ replay' : 'chưa đạt điều kiện trong thời gian chờ'}</p>
                  ))}
                  <p className={`rounded-lg p-3 text-sm font-semibold ${consistencyResult.read_your_writes_satisfied ? 'bg-emerald-950/50 text-emerald-200' : 'bg-amber-950/50 text-amber-200'}`}>
                    {consistencyResult.read_your_writes_satisfied ? 'Read-your-writes đạt trên các Standby đang hoạt động trong lần chạy này.' : 'Chưa xác nhận được read-your-writes trên mọi Standby trong thời gian chờ.'}
                  </p>
                </div>
              )}
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

        </main>
      </div>
    </div>
  );
};
