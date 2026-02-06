import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Circle,
  Trash2,
  Search,
  Calendar,
  CheckCircle,
  ClipboardList,
  Target,
  Archive,
  BookOpen,
  Mail,
  Download,
} from 'lucide-react';

// 【カスタマイズ用】送信先のアドレス
const TARGET_EMAIL = "tkdittoku@icloud.com";

const CATEGORIES = [
  { id: 'work', label: '仕事', color: 'bg-blue-100 text-blue-700 border-blue-200', active: 'bg-blue-600 text-white' },
  { id: 'private', label: 'プライベート', color: 'bg-pink-100 text-pink-700 border-pink-200', active: 'bg-pink-600 text-white' },
  { id: 'idea', label: 'アイデア', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', active: 'bg-yellow-600 text-white' },
  { id: 'other', label: 'その他', color: 'bg-slate-100 text-slate-700 border-slate-200', active: 'bg-slate-600 text-white' },
];

// crypto.randomUUID が無い環境向けフォールバック
const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

// エクスポート用にファイル名を安全化 (YYYY-MM-DD)
const formatDateForFilename = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function App() {
  const [ideas, setIdeas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [inputText, setInputText] = useState('');
  const [logA, setLogA] = useState('');
  const [logB, setLogB] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 起動時にLocalStorageから読み込む (例外安全)
  useEffect(() => {
    try {
      const savedIdeas = localStorage.getItem('idea_diary_ideas');
      const savedLogs = localStorage.getItem('idea_diary_logs');
      if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
      if (savedLogs) setLogs(JSON.parse(savedLogs));
    } catch (e) {
      // 破損データ等で落ちないように初期化
      console.warn('LocalStorage parse failed. Resetting data.', e);
      setIdeas([]);
      setLogs([]);
      localStorage.removeItem('idea_diary_ideas');
      localStorage.removeItem('idea_diary_logs');
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. 変更があるたびにLocalStorageに保存する
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('idea_diary_ideas', JSON.stringify(ideas));
      localStorage.setItem('idea_diary_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('LocalStorage save failed.', e);
    }
  }, [ideas, logs, isLoaded]);

  const handleEmailSend = (subject, content) => {
    const body = encodeURIComponent(content ?? '');
    const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject ?? '')}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const addIdea = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const newIdea = {
      id: makeId(),
      text: inputText,
      category: selectedCategory,
      createdAt: new Date().toISOString(),
      executed: false,
      executedAt: null,
      method: '',
      outcome: ''
    };
    setIdeas([newIdea, ...ideas]);
    setInputText('');
  };

  const addFreeLog = (e) => {
    e.preventDefault();
    if (!logA.trim() && !logB.trim()) return;
    const newLog = {
      id: makeId(),
      method: logA,
      outcome: logB,
      createdAt: new Date().toISOString()
    };
    setLogs([newLog, ...logs]);
    setLogA('');
    setLogB('');
  };

  const updateField = (id, field, value) => {
    setIdeas(ideas.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const toggleExecuted = (idea) => {
    setIdeas(ideas.map(i => i.id === idea.id ? {
      ...i,
      executed: !i.executed,
      executedAt: !i.executed ? new Date().toISOString() : null
    } : i));
  };

  const deleteItem = (type, id) => {
    if (!window.confirm('削除しますか？')) return;
    if (type === 'idea') setIdeas(ideas.filter(i => i.id !== id));
    else setLogs(logs.filter(l => l.id !== id));
  };

  // バックアップ機能 (APIを使わない場合のデータ移行用)
  const exportData = () => {
    const data = JSON.stringify({ ideas, logs }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `idea_diary_backup_${formatDateForFilename()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const filteredIdeas = useMemo(() => {
    const term = (searchTerm ?? '').toLowerCase();

    const searched = ideas.filter(idea => {
      const textMatch = (idea.text ?? '').toLowerCase().includes(term);
      const label = CATEGORIES.find(c => c.id === idea.category)?.label ?? '';
      const labelMatch = label.toLowerCase().includes(term);
      return textMatch || labelMatch;
    });

    if (activeTab === 'list' || activeTab === 'action') return searched.filter(i => !i.executed);
    if (activeTab === 'done') return searched.filter(i => i.executed);
    return searched;
  }, [ideas, searchTerm, activeTab]);

  const filteredLogs = useMemo(() => {
    const term = (searchTerm ?? '').toLowerCase();
    return logs.filter(log =>
      (log.method ?? '').toLowerCase().includes(term) ||
      (log.outcome ?? '').toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [compact, setCompact] = useState(false); // ← state追加（他のuseStateの近く）

return (
    <div
      className={[
        "fixed top-0 right-0 h-screen bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col",
        compact ? "w-[240px]" : "w-[340px]",
      ].join(" ")}
    >

        {/* Header */}
        <div className="bg-indigo-600 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
  <button
    onClick={() => setCompact(v => !v)}
    title="幅切替"
    className="px-2 py-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 rounded"
  >
    {compact ? "広" : "狭"}
  </button>

  <button onClick={exportData} title="データを保存" className="p-1 hover:bg-indigo-500 rounded transition-colors">
    <Download className="w-4 h-4" />
  </button>
</div>

        {/* Navigation */}
        <div className="flex border-b border-slate-200 bg-white">
          <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-[10px] font-bold flex flex-col items-center gap-1 ${activeTab === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>
            <ClipboardList className="w-4 h-4" />アイデア
          </button>
          <button onClick={() => setActiveTab('action')} className={`flex-1 py-3 text-[10px] font-bold flex flex-col items-center gap-1 ${activeTab === 'action' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Target className="w-4 h-4" />アクション
          </button>
          <button onClick={() => setActiveTab('done')} className={`flex-1 py-3 text-[10px] font-bold flex flex-col items-center gap-1 ${activeTab === 'done' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Archive className="w-4 h-4" />完了
          </button>
          <button onClick={() => setActiveTab('log')} className={`flex-1 py-3 text-[10px] font-bold flex flex-col items-center gap-1 ${activeTab === 'log' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>
            <BookOpen className="w-4 h-4" />記録用紙
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="検索..."
              className="w-full bg-white border border-slate-200 rounded-full py-1 pl-8 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {/* IDEA TAB */}
          {activeTab === 'list' && (
            <>
              <form onSubmit={addIdea} className="p-2 border-b border-slate-100 bg-white shadow-sm">
                <textarea
                  placeholder="新しいアイデアをメモ..."
                  className="w-full min-h-[60px] p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5 my-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${selectedCategory === cat.id ? cat.active : "bg-white text-slate-500 border-slate-200"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">追加</button>
                </div>
              </form>

              <div className="p-2 space-y-2">
                {filteredIdeas.map((idea) => (
                  <div key={idea.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between gap-3 group animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${CATEGORIES.find(c => c.id === idea.category)?.color}`}>
                        {CATEGORIES.find(c => c.id === idea.category)?.label}
                      </span>
                      <p className="mt-1 text-sm text-slate-700 font-medium">{idea.text}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => toggleExecuted(idea)} className="text-slate-300 hover:text-indigo-400">
                        <Circle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEmailSend("アイデア通知", idea.text)}
                        className="text-slate-300 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
            )}

          {/* ACTION TAB */}
          {activeTab === 'action' && (
            <div className="p-2 space-y-3">
              {filteredIdeas.map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl border border-indigo-100 shadow-sm">
                  <div className="bg-indigo-50/50 p-2 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{idea.text}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEmailSend("アクションプラン", `アイデア: ${idea.text}\n方法: ${idea.method}`)}
                        className="p-1 text-indigo-400 hover:bg-white rounded"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleExecuted(idea)}
                        className="text-[9px] font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded-full"
                      >
                        完了
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white min-h-[50px]"
                      placeholder="どうすれば？"
                      value={idea.method || ''}
                      onChange={(e) => updateField(idea.id, 'method', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DONE TAB */}
          {activeTab === 'done' && (
            <div className="p-2 space-y-3">
              {filteredIdeas.map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                  <div className="bg-emerald-50/50 p-2 border-b border-emerald-100 flex justify-between items-center">
                    <div className="flex items-center gap-1 truncate max-w-[150px]">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-500 line-through truncate">{idea.text}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEmailSend("完了レポート", `内容: ${idea.text}\n方法: ${idea.method}\n結果: ${idea.outcome}`)}
                        className="p-1 text-emerald-500 hover:bg-white rounded"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteItem('idea', idea.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <textarea
                      className="w-full bg-emerald-50/30 border border-emerald-100 rounded-lg p-2 text-xs focus:bg-white min-h-[50px]"
                      placeholder="こうなった（結果）"
                      value={idea.outcome || ''}
                      onChange={(e) => updateField(idea.id, 'outcome', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOG TAB */}
          {activeTab === 'log' && (
            <div className="flex flex-col h-full">
              <form onSubmit={addFreeLog} className="p-2 bg-violet-50/50 border-b border-violet-100 flex flex-col gap-3">
                <textarea
                  placeholder="A: どうすれば"
                  className="w-full p-2 text-xs bg-white border border-violet-200 rounded-lg"
                  value={logA}
                  onChange={(e) => setLogA(e.target.value)}
                />
                <textarea
                  placeholder="B: こうなった"
                  className="w-full p-2 text-xs bg-white border border-emerald-200 rounded-lg"
                  value={logB}
                  onChange={(e) => setLogB(e.target.value)}
                />
                <div className="flex justify-end">
                  <button type="submit" className="bg-violet-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">記録</button>
                </div>
              </form>

              <div className="p-2 space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 relative group">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="border-r border-slate-100 pr-2">
                        <span className="text-[8px] font-bold text-slate-300 block mb-1">A: HOW TO</span>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{log.method || '---'}</p>
                      </div>
                      <div className="pl-1">
                        <span className="text-[8px] font-bold text-slate-300 block mb-1">B: OUTCOME</span>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{log.outcome || '---'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      <span className="text-[9px] text-slate-300 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {formatDate(log.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEmailSend("自由記録", `A: ${log.method}\nB: ${log.outcome}`)}
                          className="text-slate-300 hover:text-violet-500"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem('log', log.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-2 bg-white border-t border-slate-100 flex justify-around text-[8px] text-slate-400 font-bold">
          <span>アイデア: {ideas.filter(i => !i.executed).length}</span>
          <span>完了済み: {ideas.filter(i => i.executed).length}</span>
          <span>自由記録: {logs.length}</span>
        </div>
      </div>
    </div>
  );
}
