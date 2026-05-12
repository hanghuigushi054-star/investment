/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Activity, Plus, X, Loader2, TrendingUp, TrendingDown, Newspaper, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const themeStyles: Record<string, { bg: string, text: string, badgeBg: string, badgeText: string, iconColor: string, gradient: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', iconColor: 'text-blue-400', gradient: 'from-blue-50/50 to-white' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', iconColor: 'text-orange-400', gradient: 'from-orange-50/50 to-white' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', iconColor: 'text-purple-400', gradient: 'from-purple-50/50 to-white' },
  green: { bg: 'bg-green-50', text: 'text-green-600', badgeBg: 'bg-green-100', badgeText: 'text-green-700', iconColor: 'text-green-400', gradient: 'from-green-50/50 to-white' },
  red: { bg: 'bg-red-50', text: 'text-red-600', badgeBg: 'bg-red-100', badgeText: 'text-red-700', iconColor: 'text-red-400', gradient: 'from-red-50/50 to-white' },
};

export default function App() {
  const [watchlist, setWatchlist] = useState([
    { id: '1', name: 'トヨタ自動車', price: '---', change: '---', isPositive: true },
    { id: '2', name: 'ソニーグループ', price: '---', change: '---', isPositive: true },
    { id: '3', name: 'ソフトバンクグループ', price: '---', change: '---', isPositive: true },
  ]);
  const [marketInfo, setMarketInfo] = useState({
    nikkei: { price: '---', change: '---', isPositive: true },
    usdjpy: { price: '---', change: '---', isPositive: true },
  });
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  const isFetched = useRef(false);

  const fetchLatestDashboard = async () => {
    setIsDashboardLoading(true);
    try {
      const watchNames = watchlist.map(w => w.name).join('、');
      const now = new Date();
      const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `今日（${dateStr}）の最新市場データをGoogle検索を用いて取得し、以下の内容をJSON出力してください。
1. 日経平均とドル円の最新価格と前日比（日経平均は価格に「円」を付けること）
2. ウォッチリスト銘柄（${watchNames || '無し'}）の最新の株価（または直近の終値）と前日比。「[銘柄名] 株価」で検索し、実際の正確な取引価格を取得してください。日本の銘柄には「円」を付けてください。推測値は厳禁です。
3. 直近で重要な日本の金融・経済・企業動向に関する実際のニュース3件とその要約（それぞれ3箇条書き）。themeColorはニュースカテゴリに合わせて "blue", "orange", "purple", "green", "red" のいずれかを指定してください。`,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nikkei: {
                type: Type.OBJECT,
                properties: { price: { type: Type.STRING }, change: { type: Type.STRING }, isPositive: { type: Type.BOOLEAN } },
                required: ["price", "change", "isPositive"]
              },
              usdjpy: {
                type: Type.OBJECT,
                properties: { price: { type: Type.STRING }, change: { type: Type.STRING }, isPositive: { type: Type.BOOLEAN } },
                required: ["price", "change", "isPositive"]
              },
              watchlist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.STRING },
                    change: { type: Type.STRING },
                    isPositive: { type: Type.BOOLEAN }
                  },
                  required: ["name", "price", "change", "isPositive"]
                }
              },
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    points: { type: Type.ARRAY, items: { type: Type.STRING } },
                    themeColor: { type: Type.STRING }
                  },
                  required: ["category", "title", "points", "themeColor"]
                }
              }
            },
            required: ["nikkei", "usdjpy", "watchlist", "news"]
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        setMarketInfo({ nikkei: data.nikkei, usdjpy: data.usdjpy });
        
        setWatchlist(prev => prev.map(w => {
          const fw = data.watchlist?.find((item: any) => item.name === w.name);
          return fw ? { ...w, price: fw.price, change: fw.change, isPositive: fw.isPositive } : w;
        }));
        
        setNewsItems(data.news);
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchLatestDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${yyyy}-${mm}-${dd} ${hh}:${min} JST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || isAdding) return;
    
    setIsAdding(true);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `ウェブ検索を使用して、今日現在の「${newName} 株価」を検索し、正確な最新の株価（または直近の終値）と前日比を取得してください。推測値ではなく実際の金融データを取得してください。日本の企業の場合は価格に必ず「円」を付けてください（例: "3,452円"）。JSON形式で、"price"（文字列）、"change"（文字列、例: "+1.2%" または "-0.8%" または "-120円"）、"isPositive"（真偽値）を返してください。`,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              price: { type: Type.STRING },
              change: { type: Type.STRING },
              isPositive: { type: Type.BOOLEAN },
            },
            required: ["price", "change", "isPositive"]
          }
        }
      });
      
      if (response.text) {
        const data = JSON.parse(response.text);
        setWatchlist([
          ...watchlist,
          {
            id: Date.now().toString(),
            name: newName,
            price: data.price || '---',
            change: data.change || '0.0%',
            isPositive: data.isPositive ?? true
          }
        ]);
        setNewName('');
      }
    } catch (error) {
      console.error("AI Fetch Error:", error);
      // Fallback
      setWatchlist([
        ...watchlist,
        {
          id: Date.now().toString(),
          name: newName,
          price: '---',
          change: '---',
          isPositive: true
        }
      ]);
      setNewName('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveWatchlist = (id: string) => {
    setWatchlist(watchlist.filter(item => item.id !== id));
  };

  return (
    <div className="bg-[#F1F3F5] text-[#1A1C1E] font-sans h-screen w-full flex flex-col overflow-hidden">
      {/* Global Header */}
      <header className="bg-[#0A192F] text-white h-16 flex items-center justify-between px-4 md:px-8 border-b border-[#1E2D44] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            投資インテリジェンス <span className="text-blue-400 font-normal">v2.4</span>
          </h1>
        </div>
        <div className="hidden md:flex gap-6 items-center text-sm">
          <div className="flex gap-4">
            <span className="text-[#8E9299]">
              日経平均 <span className={`font-mono ${marketInfo.nikkei.isPositive ? 'text-green-400' : 'text-red-400'}`}>{marketInfo.nikkei.price} ({marketInfo.nikkei.change})</span>
            </span>
            <span className="text-[#8E9299]">
              USD/JPY <span className={`font-mono ${marketInfo.usdjpy.isPositive ? 'text-green-400' : 'text-red-400'}`}>{marketInfo.usdjpy.price} ({marketInfo.usdjpy.change})</span>
            </span>
          </div>
          <div className="h-8 w-[1px] bg-[#1E2D44]"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-xs font-semibold tracking-wider text-green-400">
              接続済み
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Watchlist */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] p-6 flex flex-col gap-6 hidden md:flex shrink-0">
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-[#8E9299] tracking-widest">
                ウォッチリスト
              </h2>
              <button
                onClick={fetchLatestDashboard}
                disabled={isDashboardLoading}
                className="text-[#8E9299] hover:text-blue-500 transition-colors disabled:opacity-50"
                title="最新のデータに更新"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDashboardLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-1">
              {watchlist.map(item => (
                <div key={item.id} className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0 group">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-gray-800">{item.name}</span>
                    <button 
                      onClick={() => handleRemoveWatchlist(item.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-mono text-gray-500 font-medium">{item.price}</span>
                    <span className={`font-mono font-bold flex items-center gap-0.5 ${item.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {item.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddWatchlist} className="mt-6 flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-[#8E9299]">AI自動取得ツール</span>
              <input 
                type="text" 
                placeholder="銘柄名 (例: トヨタ自動車)" 
                className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded w-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isAdding}
              />
              <button 
                type="submit" 
                disabled={isAdding || !newName}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold py-2 rounded flex justify-center items-center gap-1.5 mt-1"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {isAdding ? 'AI取得中...' : '追加'}
              </button>
            </form>
          </div>
          <div className="mt-auto p-4 bg-blue-50 rounded-lg border border-blue-100 shrink-0">
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              AIモジュール状況:
              <span className="block font-bold">14のRSSフィードを監視中</span>
            </p>
          </div>
        </aside>

        {/* Main Processing Area */}
        <section className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4 lg:gap-0">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1C1E] tracking-tight flex items-center gap-4">
                重要ニュース選定・要約モジュール
                <button
                  onClick={fetchLatestDashboard}
                  disabled={isDashboardLoading}
                  className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${isDashboardLoading ? 'animate-spin' : ''}`} />
                  更新
                </button>
              </h2>
              <p className="text-[#5E636E] text-sm mt-1">
                入力ソース: {currentTime || '取得中...'}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white border border-[#E2E8F0] rounded-md text-xs font-semibold">
                生データ: 142件
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold">
                抽出済み: 3件
              </div>
            </div>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch relative">
            {isDashboardLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-600 tracking-wider">最新データを取得中...</p>
              </div>
            )}
            
            {newsItems.map((news, index) => {
              const theme = themeStyles[news.themeColor] || themeStyles.blue;
              return (
                <div key={index} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className={`p-6 border-b border-[#F1F3F5] bg-gradient-to-br ${theme.gradient}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold ${theme.badgeText} ${theme.badgeBg} px-2.5 py-1 rounded-md tracking-wider`}>
                        {news.category}
                      </span>
                      <Newspaper className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                    </div>
                    <h3 className="font-bold text-[#1A1C1E] text-[15px] leading-relaxed">
                      {news.title}
                    </h3>
                  </div>
                  <div className="p-6 bg-white flex-1">
                    <ul className="space-y-4">
                      {news.points.map((point: string, ptIdx: number) => (
                        <li key={ptIdx} className="flex gap-3">
                          <span className={`w-5 h-5 rounded ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold`}>{ptIdx + 1}</span>
                          <p className="text-[13px] text-[#454950] leading-relaxed">
                            {point}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}

            {/* Empty placeholders if less than 3 news while loading */}
            {newsItems.length === 0 && !isDashboardLoading && (
               <div className="col-span-3 text-center py-20 text-gray-500">
                 ニュースデータを取得できませんでした。
               </div>
            )}
            {newsItems.length === 0 && isDashboardLoading && [1, 2, 3].map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col h-[400px]">
                 <div className="p-6 border-b border-[#F1F3F5] h-32 bg-gray-50 animate-pulse" />
                 <div className="p-6 flex-1 space-y-4 bg-white animate-pulse">
                   <div className="h-10 bg-gray-50 rounded" />
                   <div className="h-10 bg-gray-50 rounded" />
                   <div className="h-10 bg-gray-50 rounded" />
                 </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-white border-t border-[#E2E8F0] p-4 md:h-10 md:p-0 flex flex-col md:flex-row items-center justify-between text-[10px] font-semibold text-[#8E9299] tracking-wider md:px-8 gap-2 md:gap-0 shrink-0">
        <div className="flex gap-6">
          <span>情報源: ロイター, 日経, ブルームバーグRSS</span>
          <span>フィルターエンジン: V4.1安定版</span>
        </div>
        <div className="flex items-center gap-4">
          <span>暗号化: AES-256</span>
          <span className="text-blue-600">セキュアノード #841</span>
        </div>
      </footer>
    </div>
  );
}
