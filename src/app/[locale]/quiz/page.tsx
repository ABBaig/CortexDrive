'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

const TOPICS = [
  'road_signs',
  'traffic_rules',
  'safe_driving',
  'parking',
  'highway',
  'license_test',
];

export default function QuizPage() {
  const t = useTranslations('Quiz');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [topic, setTopic] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startQuiz() {
    if (!topic) return;
    setError(null);
    setLoading(true);
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic, locale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      setQuestions((json.questions ?? []) as Question[]);
      setIsMock(Boolean(json.mock));
    } catch {
      setError(tc('error'));
    } finally {
      setLoading(false);
    }
  }

  function submitAnswer() {
    if (selected === null) return;
    setAnswers((a) => [...a, selected]);
    setSelected(null);
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
    }
  }

  const score = answers.reduce(
    (s, a, i) => s + (questions[i] && a === questions[i].answerIndex ? 1 : 0),
    0
  );

  function topicLabel(tp: string) {
    return t(`topics.${tp}`);
  }

  if (finished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <BackButton />
        <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>
        <div className="mt-6 p-6 bg-slate-800 rounded-xl ring-1 ring-slate-700 text-center">
          <div className="text-sm text-slate-400">{t('yourScore')}</div>
          <div className="mt-2 text-5xl font-bold text-white">
            {score}/{questions.length}
          </div>
          <div className={`mt-2 text-sm font-medium ${pct >= 80 ? 'text-emerald-300' : pct >= 50 ? 'text-amber-300' : 'text-red-400'}`}>
            {t('resultLabel', { score: pct })}
          </div>
          <div className="mt-6 space-y-3 text-left">
            {questions.map((q, i) => {
              const correct = answers[i] === q.answerIndex;
              return (
                <div key={i} className="p-3 bg-slate-900/60 rounded-lg">
                  <div className="text-sm text-white">
                    {i + 1}. {q.question}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {correct ? (
                      <span className="text-emerald-300">{t('correct')}</span>
                    ) : (
                      <span>
                        {t('yourAnswer')}: {q.options[answers[i]] ?? '—'} · {t('correctAnswer')}: {q.options[q.answerIndex]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{q.explanation}</div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setFinished(false);
              setQuestions([]);
              setCurrent(0);
              setAnswers([]);
            }}
            className="mt-6 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
          >
            {t('anotherTopic')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>

      {questions.length === 0 && (
        <div className="mt-6">
          <div className="text-sm text-slate-400">{t('pickTopic')}</div>
          {isMock === false && loading === false && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TOPICS.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTopic(tp)}
                  className={`p-3 rounded-xl text-sm font-medium ring-1 transition-colors ${
                    topic === tp
                      ? 'bg-sky-600 text-white ring-sky-500'
                      : 'bg-slate-800 text-slate-300 ring-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {topicLabel(tp)}
                </button>
              ))}
            </div>
          )}
          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void startQuiz()}
              disabled={!topic || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? tc('loading') : t('startQuiz')}
            </button>
            {loading && <span className="text-xs text-slate-500">{t('generating')}</span>}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-6 p-6 bg-slate-800 rounded-xl ring-1 ring-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {t('questionN', { current: current + 1, total: questions.length })}
            </span>
            {isMock && <span className="text-amber-400">{t('mockNotice')}</span>}
          </div>
          <div className="mt-3 text-lg font-semibold text-white">{questions[current].question}</div>
          <div className="mt-4 space-y-2">
            {questions[current].options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`w-full text-left p-3 rounded-lg text-sm ring-1 transition-colors ${
                  selected === i
                    ? 'bg-sky-600 text-white ring-sky-500'
                    : 'bg-slate-900/60 text-slate-200 ring-slate-700 hover:bg-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submitAnswer}
              disabled={selected === null}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}