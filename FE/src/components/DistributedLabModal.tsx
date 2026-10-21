import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Activity,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Info,
  Layers,
  X,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

interface DistributedLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DistributedLabModal: React.FC<DistributedLabModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'scenario1' | 'scenario2' | 'scenario3'>('scenario1');

  // Scenario 1 State (Primary-Replica & Read-Your-Writes)
  const [lagSeconds, setLagSeconds] = useState<number>(3.0);
  const [enableRYW, setEnableRYW] = useState<boolean>(true);
  const [clusterStatus, setClusterStatus] = useState<any>(null);
  const [lastBookedTicket, setLastBookedTicket] = useState<any>(null);
  const [readResult, setReadResult] = useState<any>(null);
  const [isLoadingS1, setIsLoadingS1] = useState<boolean>(false);

  // Scenario 2 State (Quorum Consensus)
  const [quorumStatus, setQuorumStatus] = useState<any>(null);
  const [quorumWriteVal, setQuorumWriteVal] = useState<number>(115);
  const [quorumResult, setQuorumResult] = useState<any>(null);
  const [isLoadingS2, setIsLoadingS2] = useState<boolean>(false);

  // Scenario 3 State (Concurrency & Linearizability)
  const [raceResult, setRaceResult] = useState<any>(null);
  const [isLoadingS3, setIsLoadingS3] = useState<boolean>(false);

  // Fetch initial statuses
  const refreshS1Status = async () => {
    const status = await api.getDistributedPrimaryStatus();
    if (status) setClusterStatus(status);
  };

  const refreshS2Status = async () => {
    const status = await api.getQuorumStatus();
    if (status) setQuorumStatus(status);
  };

  useEffect(() => {
    if (isOpen) {
      refreshS1Status();
      refreshS2Status();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Scenario 1 Actions
  const handleUpdateLag = async (val: number) => {
    setLagSeconds(val);
    await api.setDistributedLag(val);
    refreshS1Status();
  };

  const handleBookTicketS1 = async () => {
    setIsLoadingS1(true);
    setReadResult(null);
    const clientId = 'client_alice_' + Math.floor(Math.random() * 900 + 100);
    const bookingId = 'MEO-' + Math.floor(Math.random() * 900000 + 100000);
    const res = await api.bookDistributedTicket(clientId, {
      booking_id: bookingId,
      customer_name: 'Nguyễn Văn A',
      movie_title: 'Dune: Phần Hai',
      seats: ['VIP-F8'],
      total_price: 110000
    });
    if (res && res.success) {
      setLastBookedTicket({ clientId, bookingId, ticket: res.ticket, lsn: res.lsn });
    }
    await refreshS1Status();
    setIsLoadingS1(false);
  };

  const handleReadTicketS1 = async () => {
    if (!lastBookedTicket) {
      alert('Vui lòng bấm "1. Đặt vé (Ghi vào Primary)" trước!');
      return;
    }
    setIsLoadingS1(true);
    const res = await api.readDistributedTicket(
      lastBookedTicket.clientId,
      lastBookedTicket.bookingId,
      enableRYW
    );
    setReadResult(res);
    await refreshS1Status();
    setIsLoadingS1(false);
  };

  const handleResetS1 = async () => {
    await api.resetDistributedPrimary();
    setLastBookedTicket(null);
    setReadResult(null);
    refreshS1Status();
  };

  // Handle Scenario 2 Actions (Quorum)
  const handleToggleNode = async (nodeId: string) => {
    setIsLoadingS2(true);
    await api.toggleQuorumNode(nodeId);
    await refreshS2Status();
    setIsLoadingS2(false);
  };

  const handleQuorumWrite = async () => {
    setIsLoadingS2(true);
    const res = await api.quorumWrite('showtime_101_available_seats', quorumWriteVal);
    setQuorumResult({ type: 'write', ...res });
    setQuorumWriteVal((prev) => Math.max(0, prev - 2));
    await refreshS2Status();
    setIsLoadingS2(false);
  };

  const handleQuorumRead = async () => {
    setIsLoadingS2(true);
    const res = await api.quorumRead('showtime_101_available_seats');
    setQuorumResult({ type: 'read', ...res });
    await refreshS2Status();
    setIsLoadingS2(false);
  };

  const handleResetQuorum = async () => {
    await api.resetQuorum();
    setQuorumResult(null);
    setQuorumWriteVal(115);
    refreshS2Status();
  };

  // Handle Scenario 3 Actions (Race Condition)
  const handleRunRaceCondition = async () => {
    setIsLoadingS3(true);
    const res = await api.testRaceCondition('VIP-F8', 50);
    setRaceResult(res);
    setIsLoadingS3(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f172a] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Lab Nghiên Cứu Hệ Phân Tán (Chương 7)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Tanenbaum &amp; Van Steen
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thực nghiệm chuyên sâu: Consistency &amp; Replication trên nền tảng MeoCinema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('scenario1')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scenario1'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database size={16} />
            <span>Kịch bản 1: Primary - Replica &amp; Read-Your-Writes (Mục 7.5.1 &amp; 7.3.3)</span>
          </button>
          <button
            onClick={() => setActiveTab('scenario2')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scenario2'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={16} />
            <span>Kịch bản 2: Quorum Consensus Protocol (Mục 7.5.2)</span>
          </button>
          <button
            onClick={() => setActiveTab('scenario3')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scenario3'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={16} />
            <span>Kịch bản 3: Linearizability / Tranh Chấp Ghế (Mục 7.2.1)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: PRIMARY - REPLICA & READ-YOUR-WRITES                  */}
          {/* ============================================================ */}
          {activeTab === 'scenario1' && (
            <div className="space-y-6">
              {/* Theory Citation Box */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-sm space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <Info size={16} />
                  <span>Đối chiếu giáo trình Distributed Systems (Chương 7):</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <strong>Mục 7.5.1 (Primary-based protocols):</strong> Toàn bộ thao tác ghi (Write) được gửi tới Primary node duy nhất (Master). Primary ghi dữ liệu và gửi cập nhật bất đồng bộ (WAL replication) sang các Standby Replicas.
                  <br />
                  <strong>Mục 7.2.2 &amp; 7.3.3 (Read-your-writes):</strong> Do tồn tại độ trễ nhân bản (Replication Lag), nếu Client vừa đặt vé xong mà đọc ngay từ Replica sẽ bị hiện tượng <em>Stale Read (không thấy vé)</em>. Cơ chế <strong>Client-Centric Read-Your-Writes</strong> giúp nhận biết lần ghi gần nhất và định tuyến đọc về Primary để đảm bảo trải nghiệm người dùng nhất quán.
                </p>
              </div>

              {/* Node Architecture Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary Card */}
                <div className="p-4 rounded-xl bg-slate-800/70 border-2 border-indigo-500/60 shadow-lg relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded">
                    MASTER / WRITE ONLY
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Database className="text-indigo-400" size={20} />
                    <h3 className="font-bold text-white text-sm">PostgreSQL Primary</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Port: 5432 | Vai trò: Tiếp nhận mọi đơn đặt vé (Write)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>WAL LSN:</span>
                      <span className="font-mono text-indigo-400 font-semibold">{clusterStatus?.current_primary_lsn || 1000}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Số vé đã lưu:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{clusterStatus?.total_records_primary || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Replica 1 Card */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 shadow relative">
                  <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded">
                    STANDBY 1 / READ
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Server className="text-emerald-400" size={20} />
                    <h3 className="font-bold text-white text-sm">PostgreSQL Replica 1</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Port: 5433 | Vai trò: Phục vụ tra cứu danh mục, vé (Read)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>WAL LSN:</span>
                      <span className="font-mono text-slate-300">{clusterStatus?.nodes?.find((n: any) => n.id === 'replica_1')?.current_lsn || 1000}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Độ trễ đồng bộ:</span>
                      <span className="font-mono text-amber-400">~{lagSeconds}s</span>
                    </div>
                  </div>
                </div>

                {/* Replica 2 Card */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 shadow relative">
                  <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded">
                    STANDBY 2 / READ
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Server className="text-emerald-400" size={20} />
                    <h3 className="font-bold text-white text-sm">PostgreSQL Replica 2</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Port: 5434 | Vai trò: Phục vụ tra cứu danh mục, vé (Read)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>WAL LSN:</span>
                      <span className="font-mono text-slate-300">{clusterStatus?.nodes?.find((n: any) => n.id === 'replica_2')?.current_lsn || 1000}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Độ trễ đồng bộ:</span>
                      <span className="font-mono text-amber-400">~{lagSeconds}s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls & Simulator */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Slider Lag */}
                  <div className="flex items-center gap-3">
                    <Sliders className="text-slate-400" size={18} />
                    <span className="text-xs font-semibold text-slate-300">Replication Lag giả lập:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="6.0"
                      step="0.5"
                      value={lagSeconds}
                      onChange={(e) => handleUpdateLag(parseFloat(e.target.value))}
                      className="accent-indigo-500 w-32 cursor-pointer"
                    />
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-xs font-mono text-indigo-400 rounded">
                      {lagSeconds} giây
                    </span>
                  </div>

                  {/* Switch Read-Your-Writes */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-300">Read-Your-Writes Consistency (Mục 7.3.3):</span>
                    <button
                      onClick={() => setEnableRYW(!enableRYW)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                        enableRYW ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enableRYW ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-bold ${enableRYW ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {enableRYW ? 'ĐANG BẬT (Bảo vệ)' : 'ĐANG TẮT (Gặp lỗi trễ)'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleBookTicketS1}
                    disabled={isLoadingS1}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <Play size={16} />
                    <span>Bước 1: Đặt vé mới (Ghi vào Primary)</span>
                  </button>

                  <button
                    onClick={handleReadTicketS1}
                    disabled={isLoadingS1 || !lastBookedTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <RotateCcw size={16} />
                    <span>Bước 2: Tra cứu vé NGAY LẬP TỨC</span>
                  </button>

                  <button
                    onClick={handleResetS1}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition ml-auto"
                  >
                    <RefreshCw size={15} />
                    <span>Đặt lại kịch bản</span>
                  </button>
                </div>

                {/* Last Booked Ticket Badge */}
                {lastBookedTicket && (
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Vé vừa đặt: <strong>{lastBookedTicket.bookingId}</strong> ({lastBookedTicket.ticket.movie_title} - Ghế VIP-F8)</span>
                    </div>
                    <span className="font-mono text-indigo-400">Primary LSN: {lastBookedTicket.lsn}</span>
                  </div>
                )}
              </div>

              {/* Comparison Result Box */}
              {readResult && (
                <div
                  className={`p-5 rounded-xl border-2 transition-all ${
                    readResult.found
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {readResult.found ? (
                      <CheckCircle2 className="text-emerald-400" size={24} />
                    ) : (
                      <XCircle className="text-rose-400" size={24} />
                    )}
                    <h4 className="text-base font-bold">
                      {readResult.found
                        ? ' THÀNH CÔNG: ĐÃ TÌM THẤY VÉ VỪA ĐẶT'
                        : '❌ THẤT BẠI: KHÔNG TÌM THẤY VÉ (STALE READ VI PHẠM NHẤT QUÁN)'}
                    </h4>
                  </div>

                  <div className="text-xs space-y-1.5 pl-9">
                    <p>
                      <strong>Node phục vụ truy vấn đọc:</strong>{' '}
                      <span className="font-semibold underline">{readResult.served_by}</span> (Node LSN: {readResult.node_lsn} vs Primary LSN: {readResult.primary_lsn})
                    </p>
                    <p>
                      <strong>Cơ chế định tuyến:</strong> {readResult.routing_reason}
                    </p>
                    <p>
                      <strong>Đánh giá thực nghiệm:</strong> {readResult.status_summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: QUORUM CONSENSUS PROTOCOL (W + R > N)                 */}
          {/* ============================================================ */}
          {activeTab === 'scenario2' && (
            <div className="space-y-6">
              {/* Theory Box */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-sm space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <Info size={16} />
                  <span>Mục 7.5.2 (Replicated-write protocols - Quorum-based protocols / Gifford):</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Để đảm bảo tính nhất quán tuần tự (Sequential Consistency), hệ thống sử dụng quy tắc Quorum:
                  <br />
                  <span className="font-mono text-emerald-400 font-bold">W + R &gt; N</span> (2 + 2 = 4 &gt; 3) và{' '}
                  <span className="font-mono text-emerald-400 font-bold">W &gt; N / 2</span> (2 &gt; 1.5).
                  <br />
                  Mỗi bản ghi mang một <strong>Số phiên bản (Version Number)</strong> tăng dần. Khi đọc, client thu thập từ <span className="font-mono">R=2</span> node và chọn bản ghi có version cao nhất, loại trừ triệt để đọc phải dữ liệu cũ (Stale Read) mà không cần khóa tập trung.
                </p>
              </div>

              {/* 3 Quorum Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['node_a', 'node_b', 'node_c'].map((nodeId, idx) => {
                  const node = quorumStatus?.nodes?.find((n: any) => n.id === nodeId);
                  const isOnline = node?.status === 'online';
                  const item = node?.data?.['showtime_101_available_seats'];
                  const regionName = idx === 0 ? 'Miền Bắc' : idx === 1 ? 'Miền Trung' : 'Miền Nam';

                  return (
                    <div
                      key={nodeId}
                      className={`p-5 rounded-xl border-2 transition-all relative ${
                        isOnline
                          ? 'bg-slate-800/80 border-slate-700'
                          : 'bg-rose-950/20 border-rose-600/50 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Server className={isOnline ? 'text-emerald-400' : 'text-rose-400'} size={20} />
                          <h4 className="font-bold text-white text-sm">{node?.name || nodeId}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {isOnline ? 'ONLINE' : 'CRASHED'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-900/60 p-3 rounded-lg font-mono">
                        <div className="flex justify-between">
                          <span>Khu vực:</span>
                          <span className="text-white font-sans">{regionName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ghế còn trống:</span>
                          <span className="text-indigo-400 font-bold">{item?.value ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span className="text-emerald-400 font-bold">v{item?.version ?? 0}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleNode(nodeId)}
                        disabled={isLoadingS2}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isOnline
                            ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white'
                            : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {isOnline ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                        <span>{isOnline ? 'Giả lập Sập Node (Crash)' : 'Khôi phục Node (Recover)'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Quorum Trigger Actions */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-300">Cập nhật số ghế suất chiếu:</span>
                    <input
                      type="number"
                      value={quorumWriteVal}
                      onChange={(e) => setQuorumWriteVal(parseInt(e.target.value) || 0)}
                      className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm font-mono text-indigo-400 w-24 text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Node Online:</span>
                    <span className="font-bold text-white px-2 py-0.5 bg-slate-800 rounded">
                      {quorumStatus?.online_nodes_count || 0} / {quorumStatus?.N || 3}
                    </span>
                    <span className="text-slate-400 ml-2">Yêu cầu Quorum:</span>
                    <span className="font-mono text-emerald-400 font-bold">W=2, R=2</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleQuorumWrite}
                    disabled={isLoadingS2}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <Play size={16} />
                    <span>Thực hiện Ghi Quorum (Cần W &gt;= 2)</span>
                  </button>

                  <button
                    onClick={handleQuorumRead}
                    disabled={isLoadingS2}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <RotateCcw size={16} />
                    <span>Thực hiện Đọc Quorum (Cần R &gt;= 2)</span>
                  </button>

                  <button
                    onClick={handleResetQuorum}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition ml-auto"
                  >
                    <RefreshCw size={15} />
                    <span>Khôi phục 3 Node</span>
                  </button>
                </div>
              </div>

              {/* Quorum Execution Output */}
              {quorumResult && (
                <div
                  className={`p-5 rounded-xl border-2 transition-all ${
                    quorumResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {quorumResult.success ? (
                      <CheckCircle2 className="text-emerald-400" size={24} />
                    ) : (
                      <XCircle className="text-rose-400" size={24} />
                    )}
                    <h4 className="text-base font-bold">
                      {quorumResult.success ? 'GIAO DỊCH QUORUM THÀNH CÔNG' : 'GIAO DỊCH QUORUM BỊ TỪ CHỐI'}
                    </h4>
                  </div>
                  <p className="text-xs pl-9 leading-relaxed">
                    {quorumResult.message || quorumResult.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: LINEARIZABILITY / RACE CONDITION                      */}
          {/* ============================================================ */}
          {activeTab === 'scenario3' && (
            <div className="space-y-6">
              {/* Theory Box */}
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 text-sm space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Info size={16} />
                  <span>Mục 7.2.1 (Consistent Ordering of Operations &amp; Linearizability):</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Trong hệ phân tán, khi nhiều tiến trình hoặc máy chủ đồng thời tranh chấp một tài nguyên giới hạn (ở đây là chiếc ghế VIP duy nhất <strong>VIP-F8</strong>), hệ thống phải thực thi cơ chế <strong>Linearizability / Atomic Check-and-Set</strong> (thông qua PostgreSQL Row Lock hoặc Redis Distributed Lock).
                  <br />
                  Chính xác 1 request ghi nhận đầu tiên sẽ thành công (200 OK), tất cả các request đến sau bị từ chối với mã lỗi <strong>409 Conflict</strong>.
                </p>
              </div>

              {/* Action Box */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Kiểm thử tải đồng thời (Concurrent Stress Test)</h4>
                  <p className="text-xs text-slate-400">
                    Bắn đồng thời 50 threads từ các node phân tán cùng lúc đặt ghế "VIP-F8" trong cùng 1 mili-giây.
                  </p>
                </div>
                <button
                  onClick={handleRunRaceCondition}
                  disabled={isLoadingS3}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg transition"
                >
                  <Zap size={18} />
                  <span>{isLoadingS3 ? 'Đang gửi 50 requests...' : 'Bắn 50 requests đồng thời'}</span>
                </button>
              </div>

              {/* Race Condition Results */}
              {raceResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                      <div className="text-xs text-slate-400">Tổng request:</div>
                      <div className="text-2xl font-bold font-mono text-white mt-1">{raceResult.total_requests}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/40">
                      <div className="text-xs text-emerald-400 font-semibold">Thành công (200 OK):</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{raceResult.success_count}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40">
                      <div className="text-xs text-rose-400 font-semibold">Xung đột bị chặn (409):</div>
                      <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{raceResult.conflict_count}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-600/40">
                      <div className="text-xs text-indigo-400 font-semibold">Thời gian xử lý:</div>
                      <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{raceResult.duration_ms} ms</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>{raceResult.summary}</span>
                    </div>
                    <p className="text-slate-400">
                      Khách hàng may mắn nhận được ghế:{' '}
                      <span className="font-bold text-indigo-400 font-mono">{raceResult.winner}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Hệ Phân Tán (Distributed Systems) - MeoCinema Demo</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
