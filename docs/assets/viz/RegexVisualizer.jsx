import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, CheckCircle, Info, ArrowRightLeft, Type, BookOpen, 
  ArrowRight, Repeat, GitFork, Box, Layers, Code, Hash, FileText
} from 'lucide-react';

// --- [Helper Component] Regex Tokenizer & Visualizer Logic ---
const parseRegexToBlocks = (pattern) => {
  if (!pattern) return [];
  
  const blocks = [];
  let i = 0;
  let currentGroupDepth = 0;
  let groupCounter = 0;
  
  while (i < pattern.length) {
    const char = pattern[i];
    let token = { type: 'literal', text: char, quantifier: null, depth: currentGroupDepth };

    if (char === '[') {
      let end = pattern.indexOf(']', i);
      if (end === -1) end = pattern.length;
      token.type = 'class';
      token.text = pattern.substring(i, end + 1);
      i = end;
    } else if (char === '\\') {
      token.type = 'escape';
      token.text = pattern.substring(i, i + 2);
      i++;
    } else if (char === '(') {
      if (pattern[i+1] === '?' && pattern[i+2] === ':') {
        token.type = 'group-non-capturing';
        token.text = '(?:';
        i += 2;
      } else {
        currentGroupDepth++;
        groupCounter++;
        token.type = 'group-start';
        token.text = '(';
        token.groupNum = groupCounter;
      }
    } else if (char === ')') {
      currentGroupDepth = Math.max(0, currentGroupDepth - 1);
      token.type = 'group-end';
      token.text = ')';
    } else if (char === '|') {
      token.type = 'or';
      token.text = '|';
    } else if (char === '.') {
      token.type = 'dot';
      token.text = '.';
    }

    if (i + 1 < pattern.length) {
      const next = pattern[i + 1];
      if (['+', '*', '?'].includes(next)) {
        token.quantifier = next;
        i++;
      } else if (next === '{') {
        const braceEnd = pattern.indexOf('}', i + 1);
        if (braceEnd !== -1) {
          token.quantifier = pattern.substring(i + 1, braceEnd + 1);
          i = braceEnd;
        }
      }
    }

    blocks.push(token);
    i++;
  }
  return blocks;
};

const RegexVisualizer = () => {
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [replaceString, setReplaceString] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [flags, setFlags] = useState({ g: true, i: false, m: false, u: true });
  const [matches, setMatches] = useState([]);
  const [replacedResult, setReplacedResult] = useState('');
  const [error, setError] = useState('');
  const [selectedExample, setSelectedExample] = useState(null);
  const [parsedBlocks, setParsedBlocks] = useState([]);

  const examples = [
    {
      name: '언어별 스크립트 혼합',
      pattern: '([가-힣]+)|([\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF]+)|(\\w+)',
      testString: '한국어(Korean)와 日本語(Japanese)와 1234',
      description: '한글, 일본어, 영숫자를 각각 다른 그룹으로 매칭'
    },
    {
      name: '형태소 분석 (Morphology)',
      pattern: '([가-힣]+)(을|를)',
      testString: '사과를 먹었다. 밥을 먹었다.',
      description: '체언(Group 1)과 조사(Group 2) 분리'
    },
    {
      name: '이메일 구조',
      pattern: '([\\w.-]+)@([\\w.-]+)',
      testString: 'user.name@domain.com',
      description: 'ID부분과 도메인 부분 그룹화'
    }
  ];

  const syntaxGuide = [
    { symbol: '.', description: '임의의 한 문자' },
    { symbol: '[...]', description: '문자 클래스 (범위)' },
    { symbol: '|', description: '또는 (OR 분기)' },
    { symbol: '*', description: '0회 이상 반복 (Loop)' },
    { symbol: '+', description: '1회 이상 반복 (Loop)' },
    { symbol: '(...)', description: '그룹 (캡처)' },
  ];

  useEffect(() => {
    setParsedBlocks(parseRegexToBlocks(pattern));
    
    if (!pattern) {
      setMatches([]);
      setReplacedResult('');
      setError('');
      return;
    }

    try {
      const flagString = Object.entries(flags)
        .filter(([_, enabled]) => enabled)
        .map(([flag, _]) => flag)
        .join('');
      
      const regex = new RegExp(pattern, flagString);
      
      const found = [];
      if (!testString) {
        setMatches([]);
        return;
      }

      if (flags.g) {
        let match;
        while ((match = regex.exec(testString)) !== null) {
          found.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1)
          });
          if (match.index === regex.lastIndex) regex.lastIndex++;
          if (found.length > 2000) break;
        }
      } else {
        const match = regex.exec(testString);
        if (match) {
          found.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1)
          });
        }
      }
      
      setMatches(found);
      setError('');

      if (showReplace) {
        try {
          setReplacedResult(testString.replace(regex, replaceString));
        } catch (e) {}
      }

    } catch (e) {
      setError(e.message);
      setMatches([]);
      setReplacedResult('');
    }
  }, [pattern, testString, flags, replaceString, showReplace]);

  const loadExample = (example) => {
    setPattern(example.pattern);
    setTestString(example.testString);
    setSelectedExample(example);
    if (example.flags) setFlags(example.flags);
  };

  // --- Helper: Language/Script Detection for Color Coding ---
  const getMatchStyle = (text) => {
    if (!text) return "bg-gray-200 text-gray-800 border-gray-400";

    // 1. Japanese (Hiragana, Katakana, Kanji) -> Rose/Red
    // Range: Hiragana(3040-309F), Katakana(30A0-30FF), CJK Unified(4E00-9FAF)
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      return "bg-rose-100 text-rose-900 border-rose-400 hover:bg-rose-200";
    }
    
    // 2. Korean (Hangul Syllables, Jamo) -> Indigo/Blue
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) {
      return "bg-indigo-100 text-indigo-900 border-indigo-400 hover:bg-indigo-200";
    }

    // 3. English (Latin) -> Emerald/Green
    if (/[a-zA-Z]/.test(text)) {
      return "bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200";
    }

    // 4. Numbers -> Amber/Orange
    if (/[0-9]/.test(text)) {
      return "bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200";
    }

    // 5. Default (Symbols, etc) -> Slate/Gray
    return "bg-slate-200 text-slate-800 border-slate-400 hover:bg-slate-300";
  };

  // 1. 텍스트 하이라이트 렌더링 (with Color Coding)
  const renderHighlights = () => {
    if (!testString) return <span className="text-gray-400 italic">분석할 텍스트를 상단 입력창에 입력해주세요.</span>;
    if (matches.length === 0) return <span>{testString}</span>;

    const parts = [];
    let lastIndex = 0;

    matches.forEach((match, idx) => {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${idx}`}>{testString.substring(lastIndex, match.index)}</span>);
      }
      
      // Determine color based on content
      const colorClass = getMatchStyle(match.match);

      parts.push(
        <mark 
          key={`match-${idx}`}
          className={`${colorClass} rounded px-1 font-medium border-b-2 transition-colors cursor-default mx-0.5`}
          title={`Match ${idx + 1}: ${match.match}`}
        >
          {match.match || <span className="text-xs opacity-50">(empty)</span>}
        </mark>
      );
      lastIndex = match.index + match.length;
    });

    if (lastIndex < testString.length) {
      parts.push(<span key="text-end">{testString.substring(lastIndex)}</span>);
    }
    return <div className="whitespace-pre-wrap break-all">{parts}</div>;
  };

  // 2. 정규식 플로우 차트 렌더링
  const renderPatternFlow = () => {
    if (!pattern) return <div className="text-slate-400 text-sm italic text-center py-4">패턴을 입력하면 구조도가 표시됩니다.</div>;

    return (
      <div className="flex flex-wrap items-center gap-2 p-4 overflow-x-auto">
        <div className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
          Start
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        
        {parsedBlocks.map((block, idx) => {
          let baseClasses = "flex flex-col items-center justify-center px-3 py-2 rounded-lg border-2 text-sm font-mono min-w-[60px] relative transition-all hover:scale-105 cursor-help";
          let colorClasses = "bg-white border-slate-200 text-slate-700";
          let label = "Literal";
          let Icon = Type;

          if (block.type === 'class') {
            colorClasses = "bg-green-50 border-green-200 text-green-800";
            label = "Class";
            Icon = Box;
          } else if (block.type === 'group-start') {
            colorClasses = "bg-blue-50 border-blue-200 text-blue-800";
            label = `Group #${block.groupNum}`;
            Icon = Layers;
          } else if (block.type === 'group-end') {
            colorClasses = "bg-blue-50 border-blue-200 text-blue-800";
            label = "End Group";
            Icon = Layers;
          } else if (block.type === 'or') {
            colorClasses = "bg-amber-50 border-amber-200 text-amber-800";
            label = "OR";
            Icon = GitFork;
          } else if (block.type === 'escape') {
            colorClasses = "bg-purple-50 border-purple-200 text-purple-800";
            label = "Escaped";
            Icon = Code;
          }

          return (
            <React.Fragment key={idx}>
              <div className={`${baseClasses} ${colorClasses} group`}>
                <span className="absolute -top-5 text-[10px] bg-slate-800 text-white px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {label}
                </span>
                
                <div className="flex items-center gap-1.5 mb-1">
                  {block.quantifier ? (
                    <Repeat className="w-3 h-3 text-red-500 animate-pulse" />
                  ) : (
                    <Icon className="w-3 h-3 opacity-50" />
                  )}
                </div>
                <div className="font-bold flex items-center gap-1">
                   {block.groupNum && (
                     <span className="bg-blue-600 text-white text-[9px] px-1 rounded-full leading-none h-3 flex items-center justify-center">
                       {block.groupNum}
                     </span>
                   )}
                   {block.text}
                </div>
                
                {block.quantifier && (
                  <div className="absolute -right-2 -top-2 bg-red-100 text-red-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-red-200 shadow-sm" title={`Repeat: ${block.quantifier}`}>
                    {block.quantifier}
                  </div>
                )}
              </div>
              {idx < parsedBlocks.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          );
        })}
         <ArrowRight className="w-4 h-4 text-slate-300" />
         <div className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
          End
        </div>
      </div>
    );
  };

  const renderMatchStructure = (match, index) => {
    return (
      <div key={index} className="mb-4 last:mb-0 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
          <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Match #{index + 1}
          </span>
          <span className="text-xs text-slate-400 font-mono">index: {match.index}</span>
        </div>

        <div className="p-3">
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Full Match</div>
            {/* 매치된 텍스트에도 색상 코딩 적용 */}
            <div className={`font-mono text-lg px-3 py-2 rounded border flex items-center justify-center ${getMatchStyle(match.match)}`}>
              {match.match}
            </div>
          </div>

          {match.groups.length > 0 && (
            <div>
               <div className="text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider flex items-center gap-1">
                 <Layers className="w-3 h-3" /> Group Hierarchy
               </div>
               <div className="space-y-1">
                 {match.groups.map((gText, gIdx) => {
                   const isMatch = gText !== undefined;
                   return (
                    <div key={gIdx} className={`flex items-center relative pl-4 group ${!isMatch ? 'opacity-50 grayscale' : ''}`}>
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 group-last:h-1/2"></div>
                      <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-200"></div>
                      
                      <div className={`flex-1 flex flex-col sm:flex-row sm:items-center gap-2 border rounded p-2 transition-colors ${
                        isMatch 
                          ? 'bg-white border-slate-200 hover:border-blue-400' 
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        <div className="flex items-center gap-2 min-w-[80px]">
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                             isMatch 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-slate-200 text-slate-500 border-slate-300'
                           }`}>
                             Group ${gIdx + 1}
                           </span>
                        </div>
                        
                        {isMatch ? (
                          <span className="font-mono text-slate-800 break-all font-bold">{gText}</span>
                        ) : (
                          <span className="font-mono text-xs italic text-slate-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> No Match (비참여)
                          </span>
                        )}
                        
                        {isMatch && <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />}
                      </div>
                    </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 영역 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 flex items-center gap-3">
            <Type className="w-8 h-8 md:w-10 md:h-10" />
            Regex Visualizer <span className="text-lg font-light text-indigo-400">v2.2</span>
          </h1>
          {/* 일본어 로컬라이제이션 적용 */}
          <p className="text-slate-600 mt-2 font-medium">
            正規表現の<span className="font-bold text-indigo-600">構造的フロー</span>と<span className="font-bold text-indigo-600">マッチング階層</span>を可視化し、言語データの分析をサポートします。
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* 메인 입력 및 결과 영역 (Left Column) */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* 1. [STEP 1] 텍스트 입력 (위치 변경: 최상단) */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Target Text (Corpus Data)
                  </h3>
               </div>
               <div className="p-4">
                  <textarea
                    value={testString}
                    onChange={(e) => setTestString(e.target.value)}
                    placeholder="분석할 텍스트를 여기에 붙여넣으세요..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-y text-lg"
                  />
               </div>
            </div>

            {/* 2. [STEP 2] 정규식 패턴 입력 (중간 배치) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Regular Expression Pattern
                </label>
                {error ? (
                  <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Invalid
                  </span>
                ) : (
                   <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Valid
                  </span>
                )}
              </div>
              
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="패턴을 입력하세요 (예: ([가-힣]+)(을|를))"
                  className={`w-full pl-8 pr-16 py-3 bg-slate-50 border-2 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 transition-all ${
                    error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg">/</span>
              </div>

              {/* Visual Pattern Flow */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden mb-4">
                <div className="px-3 py-1 bg-slate-100 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 flex items-center gap-2">
                  <GitFork className="w-3 h-3" /> Pattern Flow & Group Numbers
                </div>
                {renderPatternFlow()}
              </div>

              {/* 플래그 설정 */}
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'g', label: 'Global' },
                  { key: 'i', label: 'Insensitive' },
                  { key: 'm', label: 'Multiline' },
                  { key: 'u', label: 'Unicode' }
                ].map((flag) => (
                  <label key={flag.key} className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-2 py-1 rounded hover:bg-indigo-50 hover:border-indigo-200 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={flags[flag.key]}
                      onChange={(e) => setFlags({...flags, [flag.key]: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="font-mono font-bold text-indigo-700 text-sm">{flag.key}</span>
                    <span className="text-xs text-slate-500">{flag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. [STEP 3] 결과 확인 (Highlight View) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Analysis Result (Highlight)
                  </h3>
                  <div className="flex gap-2 text-[10px] font-bold uppercase">
                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">JP</span>
                    <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200">KR</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">EN</span>
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">123</span>
                  </div>
               </div>

               <div className="p-6">
                  <div>
                    <div className="w-full p-4 bg-slate-50/50 border-2 border-slate-200 rounded-lg min-h-[80px] text-lg leading-relaxed text-slate-800 font-sans">
                      {renderHighlights()}
                    </div>
                  </div>
               </div>
            </div>

             {/* 4. 매치 구조 분석 (Match Structure Analysis) */}
             {matches.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Match Structure Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((match, idx) => renderMatchStructure(match, idx))}
                </div>
              </div>
            )}

            {/* 5. 치환(Substitution) 도구 (최하단 배치) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setShowReplace(!showReplace)}
                className="w-full px-6 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <ArrowRightLeft className="w-4 h-4" />
                  Substitution Tool
                </div>
                <span className="text-xs text-slate-500">{showReplace ? 'Hide' : 'Show'}</span>
              </button>
              
              {showReplace && (
                <div className="p-6 bg-slate-50/50">
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center gap-4">
                       <span className="font-mono text-slate-500">s/regex/</span>
                       <input
                        type="text"
                        value={replaceString}
                        onChange={(e) => setReplaceString(e.target.value)}
                        placeholder="$1 [replaced]"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none font-mono text-sm"
                      />
                      <span className="font-mono text-slate-500">/g</span>
                     </div>
                     <div className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 whitespace-pre-wrap break-all">
                       {replacedResult || <span className="text-slate-300 italic">결과가 여기에 표시됩니다</span>}
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 사이드바: 예제 및 가이드 (Right Column) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* 예제 리스트 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Linguistic Presets
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {examples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadExample(example)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all group ${
                      selectedExample?.name === example.name
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                        : 'border-slate-100 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-700">{example.name}</div>
                    </div>
                    <div className="font-mono text-xs text-indigo-600 mt-1 truncate bg-white/50 p-1 rounded">
                      {example.pattern}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {example.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 구문 가이드 */}
            <div className="bg-indigo-900 text-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-indigo-800 pb-3">
                <Info className="w-5 h-5 text-indigo-300" />
                <h2 className="text-lg font-bold">Quick Reference</h2>
              </div>
              <div className="space-y-0 text-sm">
                {syntaxGuide.map((item, idx) => (
                  <div key={idx} className="flex gap-3 py-2 border-b border-indigo-800/50 last:border-0">
                    <code className="font-mono font-bold text-amber-300 min-w-[40px] text-right">
                      {item.symbol}
                    </code>
                    <span className="text-indigo-100 font-light opacity-90">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegexVisualizer;