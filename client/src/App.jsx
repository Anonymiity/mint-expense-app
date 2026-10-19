import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from './api.js';
import { parseBankStatement } from './statementParser.js';

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', type: 'expense' },
  { name: 'Transport', icon: '🚗', type: 'expense' },
  { name: 'Travel', icon: '🚆', type: 'expense' },
  { name: 'Food', icon: '🍽️', type: 'expense' },
  { name: 'Home', icon: '🏠', type: 'expense' },
  { name: 'Shopping', icon: '👕', type: 'expense' },
  { name: 'Personal care', icon: '🧴', type: 'expense' },
  { name: 'Gifts', icon: '🎁', type: 'expense' },
  { name: 'Fitness', icon: '🏃', type: 'expense' },
  { name: 'Health', icon: '🌡️', type: 'expense' },
  { name: 'Phone', icon: '📱', type: 'expense' },
  { name: 'Pets', icon: '🐈', type: 'expense' },
  { name: 'Salary', icon: '💼', type: 'income' },
  { name: 'Other income', icon: '＋', type: 'income' },
];

const currency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const monthKeyNow = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const monthFilePart = (key) => {
  const [year, month] = key.split('-').map(Number);
  return `${new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}_${year}`;
};

function App() {
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('mint_token') || '');
  const [sessionChecking, setSessionChecking] = useState(() => Boolean(localStorage.getItem('mint_token')));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [theme, setTheme] = useState(() => localStorage.getItem('mint_theme') || 'light');
  const [view, setView] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budget, setBudget] = useState(0);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthKeyNow());
  const [activeCategory, setActiveCategory] = useState(null);
  const [txType, setTxType] = useState('expense');
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(localDateValue());
  const [calcValue, setCalcValue] = useState('');
  const [calcStored, setCalcStored] = useState(null);
  const [calcOperator, setCalcOperator] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [appBusy, setAppBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [categoryDraft, setCategoryDraft] = useState({ name: '', icon: '✨', type: 'expense' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importStage, setImportStage] = useState('upload');
  const [importIndex, setImportIndex] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mint_theme', theme);
  }, [theme]);

  const loadData = useCallback(async (authToken = token) => {
    if (!authToken) return;
    setAppBusy(true);
    setError('');
    try {
      const [me, txs, cats, budgetResult] = await Promise.all([
        api('/auth/me', { token: authToken }),
        api(`/transactions?month=${selectedMonth}`, { token: authToken }),
        api('/categories', { token: authToken }),
        api(`/budget/${selectedMonth}`, { token: authToken }),
      ]);
      setUser(me.user);
      setTransactions(txs.transactions || []);
      setCategories(cats.categories || []);
      setBudget(budgetResult.budget?.amount || 0);
      setBudgetDraft(String(budgetResult.budget?.amount || ''));
    } catch (err) {
      setError(err.message || 'Could not connect to the app server.');
      if (/token|authoriz|session/i.test(err.message)) handleLogout();
    } finally {
      setAppBusy(false);
      setSessionChecking(false);
    }
  }, [token, selectedMonth]);

  useEffect(() => {
    if (token) loadData(token);
  }, [token, selectedMonth, loadData]);

  const visibleTransactions = useMemo(() => transactions.filter((tx) => {
    const date = new Date(tx.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
  }), [transactions, selectedMonth]);

  const totals = useMemo(() => visibleTransactions.reduce((acc, tx) => {
    const amountValue = Number(tx.amount || 0);
    if (tx.type === 'income') acc.income += amountValue;
    else acc.spent += amountValue;
    return acc;
  }, { spent: 0, income: 0 }), [visibleTransactions]);


  const categoryColors = [
    '#36A879', // Mint green
    '#F4A261', // Orange
    '#6388E8', // Blue
    '#E76F8A', // Rose
    '#A78BFA', // Violet
    '#E9C46A', // Yellow
    '#45B7C5', // Teal
    '#F28482', // Coral
    '#8D99AE', // Slate
    '#70AD47', // Leaf green
    '#D17BA5', // Pink
    '#E07A5F', // Terracotta
    '#577590', // Steel blue
    '#B8A05A', // Olive
  ];

  const categorySpending = useMemo(() => {
    const totalsByCategory = new Map();

    visibleTransactions
      .filter((tx) => tx.type !== 'income')
      .forEach((tx) => {
        const name = tx.category || 'Uncategorised';
        const amount = Number(tx.amount || 0);

        if (!Number.isFinite(amount) || amount <= 0) return;

        totalsByCategory.set(
          name,
          (totalsByCategory.get(name) || 0) + amount
        );
      });

    return Array.from(totalsByCategory, ([name, amount]) => ({
      name,
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [visibleTransactions]);

  const categoryChart = useMemo(() => {
    const total = categorySpending.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    let currentAngle = 0;

    const segments = categorySpending.map((item, index) => {
      const percentage = total > 0 ? (item.amount / total) * 100 : 0;
      const startAngle = currentAngle;
      currentAngle += percentage * 3.6;

      return {
        ...item,
        percentage,
        startAngle: startAngle * 1,
        endAngle: currentAngle,
        color: categoryColors[index % categoryColors.length],
      };
    });

    const gradient = segments.length
      ? `conic-gradient(${segments
        .map(
          (segment) =>
            `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`
        )
        .join(', ')})`
      : 'var(--donut-rest)';

    return { segments, gradient, total };
  }, [categorySpending]);


  const remaining = budget + totals.income - totals.spent;
  const spentPercentage = budget > 0 ? Math.min(100, Math.max(0, (totals.spent / budget) * 100)) : 0;

  function handleLogout() {
    localStorage.removeItem('mint_token');
    setToken('');
    setSessionChecking(false);
    setUser(null);
    setTransactions([]);
    setCategories([]);
    setView('home');
    setError('');
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setError('');
    try {
      const path = authMode === 'register' ? '/auth/register' : '/auth/login';
      const payload = await api(path, { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('mint_token', payload.token);
      setToken(payload.token);
      setUser(payload.user);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function openComposer(category, type = 'expense') {
    setActiveCategory(category || null);
    setTxType(type);
    setAmount('0');
    setDescription('');
    setTransactionDate(localDateValue());
    setCalcValue('');
    setCalcStored(null);
    setCalcOperator(null);
    setView('compose');
  }

  function pressCalc(key) {
    if (/^\d$/.test(key)) {
      setAmount((prev) => prev === '0' || calcValue !== '' ? (calcValue !== '' ? key : key) : prev + key);
      setCalcValue('');
      return;
    }
    if (key === '.') {
      setAmount((prev) => prev.includes('.') ? prev : `${prev || '0'}.`);
      setCalcValue('');
      return;
    }
    if (key === 'C') {
      setAmount('0'); setCalcValue(''); setCalcStored(null); setCalcOperator(null); return;
    }
    if (key === '⌫') {
      setAmount((prev) => prev.length > 1 ? prev.slice(0, -1) : '0'); return;
    }
    if (key === '=') {
      if (calcStored !== null && calcOperator) {
        const left = Number(calcStored), right = Number(amount);
        let result = right;
        if (calcOperator === '+') result = left + right;
        if (calcOperator === '−') result = left - right;
        if (calcOperator === '×') result = left * right;
        if (calcOperator === '÷') result = right === 0 ? left : left / right;
        setAmount(String(Number(result.toFixed(2)))); setCalcValue(''); setCalcStored(null); setCalcOperator(null);
      }
      return;
    }
    if (['+', '−', '×', '÷'].includes(key)) {
      setCalcStored(amount); setCalcOperator(key); setCalcValue(amount); setAmount('0');
    }
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !Number.isFinite(numericAmount)) {
      setError('Enter an amount greater than ₹0.'); return;
    }
    if (!activeCategory) { setError('Choose a category first.'); return; }
    setAppBusy(true); setError('');
    try {
      await api('/transactions', {
        method: 'POST', token,
        body: JSON.stringify({
          type: txType,
          amount: numericAmount,
          description: description.trim(),
          category: activeCategory.name,
          categoryIcon: activeCategory.icon || '•',
          categoryId: activeCategory._id,
          date: transactionDate,
          paymentMode: 'CASH',
          source: 'manual',
        }),
      });
      setNotice(`${txType === 'expense' ? 'Expense' : 'Income'} saved.`);
      setView('home'); setActiveCategory(null);
      await loadData(token);
    } catch (err) { setError(err.message); }
    finally { setAppBusy(false); }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction?')) return;
    setError('');
    try {
      await api(`/transactions/${id}`, { method: 'DELETE', token });
      await loadData(token);
    } catch (err) { setError(err.message); }
  }

  async function saveBudget(event) {
    event.preventDefault();
    const numeric = Number(budgetDraft);
    if (!Number.isFinite(numeric) || numeric < 0) { setError('Enter a valid budget amount.'); return; }
    try {
      const response = await api(`/budget/${selectedMonth}`, { method: 'PUT', token, body: JSON.stringify({ amount: numeric }) });
      setBudget(response.budget.amount);
      setNotice(`Budget saved for ${monthLabel(selectedMonth)}.`);
    } catch (err) { setError(err.message); }
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryDraft.name.trim()) { setError('Enter a category name.'); return; }
    try {
      if (editingCategoryId) {
        await api(`/categories/${editingCategoryId}`, { method: 'PUT', token, body: JSON.stringify(categoryDraft) });
      } else {
        await api('/categories', { method: 'POST', token, body: JSON.stringify(categoryDraft) });
      }
      setCategoryDraft({ name: '', icon: '✨', type: 'expense' });
      setEditingCategoryId(null);
      await loadData(token);
      setNotice('Category saved.');
    } catch (err) { setError(err.message); }
  }

  async function deleteCategory(id) {
    if (!window.confirm('Delete this category? Past transactions will keep their saved category name.')) return;
    try { await api(`/categories/${id}`, { method: 'DELETE', token }); await loadData(token); }
    catch (err) { setError(err.message); }
  }

  function exportMonth() {
    const headers = ['Date', 'Amount', 'Description', 'Category', 'Mode of payment'];
    const rows = visibleTransactions.map((tx) => [
      formatDate(tx.date),
      Number(tx.amount),
      tx.description || '',
      tx.category || 'Uncategorised',
      tx.source === 'imported' ? 'ONLINE' : 'CASH',
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 34 }, { wch: 20 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, `Expense_${monthFilePart(selectedMonth)}.xlsx`);
  }


  function normalizeStatementRows(parsed) {
    return parsed.map((row, index) => {
      const matchingCategories = categories.filter(
        (category) => category.type === row.type || category.type === 'both'
      );

      const defaultCategory = matchingCategories[0] || {
        name: row.type === 'income' ? 'Other income' : 'Uncategorised',
        icon: row.type === 'income' ? '＋' : '•',
        type: row.type,
      };

      return {
        importId: `${index}-${row.date}-${row.amount}`,
        selected: true,
        date: row.date,
        amount: Number(row.amount),
        type: row.type,
        remarks: row.remarks || '',
        description: row.remarks || '',
        category: defaultCategory.name,
        categoryIcon: defaultCategory.icon,
        categoryId: defaultCategory._id || '',
      };
    });
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportBusy(true);
    setError('');
    setNotice('');
    setImportRows([]);
    setImportFileName(file.name);

    try {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('Please choose a file smaller than 15 MB.');
      }

      const parsed = await parseBankStatement(file);
      const normalized = normalizeStatementRows(parsed);

      if (!normalized.length) {
        throw new Error('No transactions were found in this statement.');
      }

      setImportRows(normalized);
      setImportIndex(0);
      setImportStage('review');

      setNotice(
        `Extracted ${normalized.length} transaction(s). Review each transaction before saving.`
      );
    } catch (err) {
      setError(err.message || 'Could not read the statement.');
    } finally {
      setImportBusy(false);
      event.target.value = '';
    }
  }

  function updateImportRow(importId, changes) {
    setImportRows((previous) =>
      previous.map((row) =>
        row.importId === importId ? { ...row, ...changes } : row
      )
    );
  }

  async function saveImportedTransactions() {
    const selectedRows = importRows.filter((row) => row.selected);

    if (!selectedRows.length) {
      setError('Select at least one transaction to import.');
      return;
    }

    for (const row of selectedRows) {
      if (!row.date || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) {
        setError('Every selected transaction needs a valid date and amount.');
        return;
      }

      if (!row.category?.trim()) {
        setError('Choose a category for every selected transaction.');
        return;
      }

      if (!row.description?.trim()) {
        setError('Add a brief description for every selected transaction.');
        return;
      }
    }

    setAppBusy(true);
    setError('');

    let saved = 0;

    try {
      for (const row of selectedRows) {
        await api('/transactions', {
          method: 'POST',
          token,
          body: JSON.stringify({
            type: row.type,
            amount: Number(row.amount),
            description: row.description.trim(),
            category: row.category,
            categoryIcon: row.categoryIcon || '•',
            categoryId: row.categoryId || undefined,
            date: row.date,
            paymentMode: 'ONLINE',
            source: 'imported',
          }),
        });

        saved += 1;
      }

      setImportOpen(false);
      setImportRows([]);
      setImportStage('upload');
      setImportFileName('');

      setNotice(`${saved} transaction(s) imported successfully.`);
      await loadData(token);
    } catch (err) {
      setError(
        `${saved} transaction(s) saved before an error occurred. ${err.message || 'Please check your transactions before retrying.'}`
      );
    } finally {
      setAppBusy(false);
    }
  }


  function launchImport() {
    setImportOpen(true);
    setImportStage('upload');
    setImportRows([]);
    setImportFileName('');
    setError('');
    setNotice('');
  }

  const expenseCategories = categories.filter((category) => category.type !== 'income');
  const incomeCategories = categories.filter((category) => category.type !== 'expense');

  if (sessionChecking && token && !user) {
    return <main className="session-loading"><div className="brand-mark">m</div><strong>Opening your workspace…</strong><span className="muted small">Just a moment.</span></main>;
  }

  if (!token || !user) {
    return <main className="auth-screen" data-theme={theme}>
      <section className="auth-panel">
        <div className="brand-lockup"><div className="brand-mark">m</div><div><div className="brand-name">mint.</div><div className="muted small">Your money, made clear.</div></div></div>
        <div className="auth-copy"><p className="eyebrow">PERSONAL FINANCE, WITHOUT THE NOISE</p><h1>A calmer way to track your money.</h1><p className="muted">Tap a category. Enter an amount. Stay on top of your spending.</p></div>
        <form className="auth-form" onSubmit={submitAuth}>
          <div className="auth-toggle"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError(''); }}>Log in</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setError(''); }}>Create account</button></div>
          {authMode === 'register' && <label>Your name<input autoComplete="name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required /></label>}
          <label>Email address<input type="email" autoComplete="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required /></label>
          <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength="8" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required /></label>
          {error && <p className="inline-error">{error}</p>}
          <button className="primary-button full-button" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create my account'} <span>→</span></button>
          <p className="tiny muted">Your account has its own private transactions and categories.</p>
        </form>
        <button className="theme-link" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾ Use dark appearance' : '☀ Use light appearance'}</button>
      </section>
      <aside className="auth-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-center"><span>₹</span><small>Spend with intention.</small></div><div className="float-card card-spend"><span className="mini-dot coral" />Monthly spend<strong>₹12,480</strong><small>Looking manageable</small></div><div className="float-card card-budget"><span className="mini-dot green" />Budget left<strong>₹7,520</strong><div className="tiny-bar"><i /></div></div><p className="visual-caption">A little more clarity, every day.</p></aside>
    </main>;
  }

  return <div className="app-shell min-h-screen" data-theme={theme}>
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark">m</div><div><div className="brand-name">mint.</div><div className="muted tiny">PERSONAL FINANCE</div></div></div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={view === 'home' || view === 'compose' ? 'selected' : ''} onClick={() => setView('home')}><span>◫</span> Overview</button>
        <button className={view === 'transactions' ? 'selected' : ''} onClick={() => setView('transactions')}><span>↕</span> Transactions</button>
        <button className={view === 'categories' ? 'selected' : ''} onClick={() => setView('categories')}><span>◈</span> Categories</button>
        <button className={view === 'budget' ? 'selected' : ''} onClick={() => setView('budget')}><span>◎</span> Budget</button>
      </nav>
      <div className="sidebar-bottom"><div className="user-card"><div className="avatar">{(user.name || user.email || 'M').slice(0, 1).toUpperCase()}</div><div className="user-details"><strong>{user.name || 'Your account'}</strong><span>{user.email}</span></div><button aria-label="Log out" title="Log out" onClick={handleLogout}>↗</button></div><button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><span>{theme === 'light' ? '☾' : '☀'}</span>{theme === 'light' ? 'Dark mode' : 'Light mode'}<i>{theme === 'light' ? 'OFF' : 'ON'}</i></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div><div className="breadcrumb">PERSONAL FINANCE <span>/</span> {view === 'home' ? 'OVERVIEW' : view.toUpperCase()}</div><h1>{view === 'home' ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : view === 'compose' ? 'New transaction' : view === 'transactions' ? 'Transactions' : view === 'categories' ? 'Categories' : 'Budget'}</h1></div><div className="top-actions">


        <div className="month-selector">
          <button
            type="button"
            className="month-nav-button"
            aria-label="Previous month"
            onClick={() => {
              const [year, month] = selectedMonth.split('-').map(Number);
              const date = new Date(year, month - 2, 1);
              setSelectedMonth(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
              );
            }}
          >
            ‹
          </button>

          <div className="month-dropdown">
            <button
              type="button"
              className="month-dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded={monthDropdownOpen}
              onClick={() => setMonthDropdownOpen((open) => !open)}
            >
              <span className="month-calendar-icon">▦</span>
              <span className="month-dropdown-current">
                {monthLabel(selectedMonth)}
              </span>
              <span className={`month-chevron ${monthDropdownOpen ? 'rotated' : ''}`}>
                ⌄
              </span>
            </button>

            {monthDropdownOpen && (
              <>
                <button
                  className="month-dropdown-backdrop"
                  aria-label="Close month selector"
                  onClick={() => setMonthDropdownOpen(false)}
                  tabIndex={-1}
                />

                <div className="month-dropdown-menu" role="listbox" aria-label="Choose month">
                  <div className="month-dropdown-heading">SELECT MONTH</div>

                  {Array.from({ length: 18 }, (_, i) => {
                    const date = new Date();
                    date.setDate(1);
                    date.setMonth(date.getMonth() - i);

                    const key = `${date.getFullYear()}-${String(
                      date.getMonth() + 1
                    ).padStart(2, '0')}`;

                    const selected = key === selectedMonth;

                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        key={key}
                        className={`month-option ${selected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedMonth(key);
                          setMonthDropdownOpen(false);
                        }}
                      >
                        <span className="month-option-label">{monthLabel(key)}</span>
                        {selected && <span className="month-option-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="month-nav-button"
            aria-label="Next month"
            disabled={selectedMonth >= monthKeyNow()}
            onClick={() => {
              const [year, month] = selectedMonth.split('-').map(Number);
              const date = new Date(year, month, 1);
              setSelectedMonth(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
              );
            }}
          >
            ›
          </button>
        </div>


        <button className="icon-button desktop-theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Switch theme">{theme === 'light' ? '☾' : '☀'}</button></div></header>

      {error && <div className="notice error-notice"><span>!</span>{error}<button onClick={() => setError('')}>×</button></div>}
      {notice && <div className="notice success-notice"><span>✓</span>{notice}<button onClick={() => setNotice('')}>×</button></div>}

      {view === 'home' && <>
        <section className="summary-grid">
          <div className="summary-card primary-summary"><div className="summary-top"><span className="summary-label">Available this month</span><span className="summary-icon">₹</span></div><div className="summary-value">{currency(remaining)}</div><div className="summary-foot"><span className={remaining < 0 ? 'text-coral' : ''}>{budget > 0 ? `${Math.max(0, 100 - spentPercentage).toFixed(0)}% of budget remaining` : 'Set a budget to track your limit'}</span><button onClick={() => setView('budget')}>Manage budget ↗</button></div>{budget > 0 && <div className="progress-track"><i style={{ width: `${spentPercentage}%` }} /></div>}</div>
          <div className="summary-card"><div className="summary-top"><span className="summary-label">Spent</span><span className="summary-icon icon-coral">↘</span></div><div className="summary-value">{currency(totals.spent)}</div><div className="summary-foot"><span className="muted">{visibleTransactions.filter((tx) => tx.type === 'expense').length} expenses</span><span className="change-neutral">{monthLabel(selectedMonth)}</span></div></div>
          <div className="summary-card"><div className="summary-top"><span className="summary-label">Income</span><span className="summary-icon icon-green">↗</span></div><div className="summary-value">{currency(totals.income)}</div><div className="summary-foot"><span className="muted">{visibleTransactions.filter((tx) => tx.type === 'income').length} entries</span><span className="change-positive">Added this month</span></div></div>
        </section>

        <div className="content-grid">
          <section className="panel category-panel"><div className="section-heading"><div><p className="eyebrow">QUICK ENTRY</p><h2>Where did it go?</h2><p className="muted small">Choose a category to add a transaction.</p></div><button className="text-button" onClick={() => setView('categories')}>Edit categories ↗</button></div>
            <div className="category-grid">{expenseCategories.map((category) => <button className="category-tile" key={category._id || category.name} onClick={() => openComposer(category, 'expense')}><span className="category-icon">{category.icon || '◌'}</span><span>{category.name}</span></button>)}<button className="category-tile income-tile" onClick={() => openComposer(incomeCategories[0] || { name: 'Income', icon: '＋', type: 'income' }, 'income')}><span className="category-icon">＋</span><span>Add income</span></button></div>
            <button className="import-strip" onClick={launchImport}><span className="import-symbol">⇧</span><span><strong>Import bank statement</strong><small>Review transactions before adding them</small></span><b>→</b></button>
          </section>

          <section className="panel spending-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR MONTH</p>
                <h2>Spending at a glance</h2>
                <p className="muted small">
                  Expense breakdown by category
                </p>
              </div>
              <span className="panel-kebab">•••</span>
            </div>

            <div className="donut-wrap">
              <div
                className="donut"
                role="img"
                aria-label={`Expense breakdown. Total spent ${currency(categoryChart.total)}.`}
                style={{
                  background: categoryChart.gradient,
                }}
              >
                <div className="donut-hole">
                  <span className="tiny muted">TOTAL SPENT</span>
                  <strong>{currency(categoryChart.total)}</strong>
                  <span className="tiny muted">
                    {monthLabel(selectedMonth)}
                  </span>
                </div>
              </div>
            </div>

            {categoryChart.segments.length > 0 ? (
              <div
                className="category-chart-legend"
                aria-label="Expense categories"
              >
                {categoryChart.segments.map((item) => (
                  <div className="category-chart-row" key={item.name}>
                    <span
                      className="category-chart-dot"
                      style={{ backgroundColor: item.color }}
                    />

                    <span className="category-chart-name" title={item.name}>
                      {item.name}
                    </span>

                    <span className="category-chart-percentage">
                      {item.percentage.toFixed(1)}%
                    </span>

                    <strong className="category-chart-amount">
                      {currency(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Your expense categories will appear here once you record spending." />
            )}

            <div className="spending-legend">
              <div>
                <span className="legend-dot green-dot" />
                Spent
                <strong>{currency(categoryChart.total)}</strong>
              </div>
              <div>
                <span className="legend-dot grey-dot" />
                Budget
                <strong>{currency(budget)}</strong>
              </div>
            </div>

            <button
              className="secondary-button full-button"
              onClick={() => setView('transactions')}
            >
              View all transactions <span>→</span>
            </button>
          </section>
        </div>

        <section className="panel recent-panel"><div className="section-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setView('transactions')}>See all →</button></div>{visibleTransactions.length ? <TransactionTable transactions={visibleTransactions.slice(0, 5)} onDelete={deleteTransaction} /> : <EmptyState text="No transactions here yet. Start with a category above." />}</section>
      </>}

      {view === 'compose' && <section className="composer-layout"><div className="composer-main panel"><button className="back-link" onClick={() => setView('home')}>← Back to overview</button><div className="composer-heading"><div className={`large-category-icon ${txType === 'income' ? 'income-large' : ''}`}>{activeCategory?.icon || '₹'}</div><div><p className="eyebrow">{txType === 'expense' ? 'NEW EXPENSE' : 'NEW INCOME'}</p><h2>{activeCategory?.name || 'Choose a category'}</h2><p className="muted small">Add the amount and a short note.</p></div></div><div className="type-switch"><button className={txType === 'expense' ? 'active expense-active' : ''} onClick={() => { setTxType('expense'); setActiveCategory(expenseCategories[0] || null); }}>− Expense</button><button className={txType === 'income' ? 'active income-active' : ''} onClick={() => { setTxType('income'); setActiveCategory(incomeCategories[0] || null); }}>＋ Income</button></div><div className="amount-entry"><span>₹</span><input aria-label="Transaction amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} /><button title="Clear amount" onClick={() => setAmount('0')}>×</button></div><div className="calculator-grid">{['1', '2', '3', '+', '4', '5', '6', '−', '7', '8', '9', '×', '.', '0', '⌫', '÷', 'C', '=', '', ''].map((key, index) => key ? <button key={`${key}-${index}`} className={['+', '−', '×', '÷', '=', 'C', '⌫'].includes(key) ? 'calc-action' : ''} onClick={() => pressCalc(key)}>{key}</button> : <span key={`empty-${index}`} />)}</div><form className="transaction-fields" onSubmit={saveTransaction}><label>Note / description<input placeholder="e.g. Lunch with colleagues" value={description} onChange={(e) => setDescription(e.target.value)} maxLength="240" /></label><label>Date<input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required /></label><label>Category<select value={activeCategory?._id || activeCategory?.name || ''} onChange={(e) => setActiveCategory([...categories, ...DEFAULT_CATEGORIES].find((c) => (c._id || c.name) === e.target.value) || null)} required>{(txType === 'expense' ? expenseCategories : incomeCategories).map((category) => <option key={category._id || category.name} value={category._id || category.name}>{category.icon} {category.name}</option>)}</select></label><button className="primary-button full-button" disabled={appBusy}>Save {txType === 'expense' ? 'expense' : 'income'} <span>→</span></button></form></div><aside className="composer-aside panel"><p className="eyebrow">QUICK NOTE</p><h3>Little details help later.</h3><p className="muted">Add a short description so that when you review the month or export your Excel file, you know what each transaction was for.</p><div className="tip-box"><span>✦</span><p><strong>Budget tip</strong><br />Your monthly available amount updates as you add expenses and income.</p></div><div className="composer-shortcuts"><h4>Change category</h4>{(txType === 'expense' ? expenseCategories : incomeCategories).slice(0, 8).map((category) => <button key={category._id || category.name} className={activeCategory?.name === category.name ? 'chosen' : ''} onClick={() => setActiveCategory(category)}><span>{category.icon}</span>{category.name}</button>)}</div></aside></section>}

      {view === 'transactions' && <section className="panel list-page"><div className="section-heading"><div><p className="eyebrow">MONTHLY LEDGER</p><h2>{monthLabel(selectedMonth)}</h2><p className="muted small">All transactions for the selected month.</p></div><div className="button-row"><button className="secondary-button" onClick={launchImport}>⇧ Import</button><button className="primary-button" onClick={exportMonth}>↓ Export Excel</button></div></div>{visibleTransactions.length ? <TransactionTable transactions={visibleTransactions} onDelete={deleteTransaction} /> : <EmptyState text="No transactions for this month yet." />}</section>}

      {view === 'categories' && <section className="category-admin-layout"><div className="panel category-admin-main"><div className="section-heading"><div><p className="eyebrow">PERSONALISE</p><h2>Your categories</h2><p className="muted small">Change the label or emoji, or remove categories you don't use.</p></div></div><div className="managed-categories">{categories.map((category) => <div className="managed-category" key={category._id}><span className="managed-icon">{category.icon}</span><div className="managed-meta"><strong>{category.name}</strong><small>{category.type === 'income' ? 'Income' : 'Expense'}</small></div><button title="Edit category" onClick={() => { setEditingCategoryId(category._id); setCategoryDraft({ name: category.name, icon: category.icon || '✨', type: category.type || 'expense' }); }}>✎</button><button className="delete-icon" title="Delete category" onClick={() => deleteCategory(category._id)}>×</button></div>)}</div></div><form className="panel category-form" onSubmit={saveCategory}><p className="eyebrow">{editingCategoryId ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</p><h3>{editingCategoryId ? 'Make it yours' : 'Add a category'}</h3><label>Category name<input value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} placeholder="e.g. Coffee" maxLength="32" required /></label><label>Icon / emoji<input value={categoryDraft.icon} onChange={(e) => setCategoryDraft({ ...categoryDraft, icon: e.target.value })} maxLength="8" placeholder="☕" /></label><div className="emoji-suggestions">{['🛒', '🚗', '🍽️', '🏠', '👕', '☕', '✈️', '🎁', '📱', '💼', '🌡️', '✨'].map((emoji) => <button key={emoji} type="button" onClick={() => setCategoryDraft({ ...categoryDraft, icon: emoji })}>{emoji}</button>)}</div><label>Type<select value={categoryDraft.type} onChange={(e) => setCategoryDraft({ ...categoryDraft, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option><option value="both">Both</option></select></label><button className="primary-button full-button">{editingCategoryId ? 'Save changes' : 'Add category'}</button>{editingCategoryId && <button type="button" className="text-button cancel-edit" onClick={() => { setEditingCategoryId(null); setCategoryDraft({ name: '', icon: '✨', type: 'expense' }); }}>Cancel editing</button>}</form></section>}

      {view === 'budget' && <section className="budget-page"><div className="panel budget-main"><p className="eyebrow">MONTHLY PLAN</p><h2>Give your money a direction.</h2><p className="muted">Set a monthly starting amount. Expenses reduce what remains and income increases it.</p><form onSubmit={saveBudget} className="budget-form"><label>Budget for {monthLabel(selectedMonth)}<div className="budget-input"><span>₹</span><input type="number" min="0" step="0.01" value={budgetDraft} onChange={(e) => setBudgetDraft(e.target.value)} placeholder="0.00" /></div></label><button className="primary-button">Save budget <span>→</span></button></form></div><div className="panel budget-breakdown"><p className="eyebrow">BUDGET BREAKDOWN</p><h3>{currency(remaining)} <span className="muted">remaining</span></h3><div className="wide-progress"><i style={{ width: `${spentPercentage}%` }} /></div><div className="breakdown-row"><span>Starting budget</span><strong>{currency(budget)}</strong></div><div className="breakdown-row negative"><span>Expenses</span><strong>− {currency(totals.spent)}</strong></div><div className="breakdown-row positive"><span>Income</span><strong>+ {currency(totals.income)}</strong></div><div className="breakdown-row total-row"><span>Available amount</span><strong>{currency(remaining)}</strong></div></div></section>}

      <footer className="app-footer"><span>mint. <i>·</i> Personal spending, made simpler.</span><span>Your data is tied to your account.</span></footer>
    </main>



    {importOpen && (
      <div
        className="modal-backdrop"
        role="presentation"
        onClick={() => {
          if (!importBusy && !appBusy) setImportOpen(false);
        }}
        style={{
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <section
          className="import-modal panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 760,
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: 'clamp(20px, 4vw, 34px)',
            borderRadius: 24,
            position: 'relative',
          }}
        >
          <button
            className="modal-close"
            onClick={() => setImportOpen(false)}
            disabled={importBusy || appBusy}
            aria-label="Close importer"
          >
            ×
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--green-soft, #e4f5ec)',
                color: 'var(--green-strong, #20865b)',
                fontSize: 24,
              }}
            >
              ⇧
            </div>

            <div>
              <p className="eyebrow" style={{ marginBottom: 5 }}>
                BANK STATEMENT
              </p>
              <h2 id="import-title" style={{ margin: 0 }}>
                {importStage === 'upload'
                  ? 'Import your transactions'
                  : 'Categorise your transactions'}
              </h2>
            </div>
          </div>

          {importStage === 'upload' && (
            <div style={{ marginTop: 26 }}>
              <p className="muted">
                Upload your bank statement. Check every transaction and assign its
                category before adding it to your expense tracker.
              </p>

              <div
                style={{
                  border: '2px dashed var(--border, #d9e5dd)',
                  borderRadius: 20,
                  padding: '36px 20px',
                  textAlign: 'center',
                  marginTop: 24,
                  background: 'var(--surface-soft, #f8fbf9)',
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 12 }}>📄</div>
                <h3 style={{ marginBottom: 8 }}>Choose your bank statement</h3>
                <p className="muted small">
                  Excel statement · XLS or XLSX
                </p>

                <label
                  className="primary-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 12,
                    cursor: importBusy ? 'wait' : 'pointer',
                    opacity: importBusy ? 0.6 : 1,
                  }}
                >
                  {importBusy ? 'Reading statement…' : 'Choose file ↑'}
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    disabled={importBusy}
                    onChange={handleImportFile}
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      opacity: 0,
                      overflow: 'hidden',
                    }}
                    aria-label="Choose Excel bank statement"
                  />
                </label>

                {importBusy && (
                  <p className="muted small" style={{ marginTop: 16 }}>
                    Extracting transactions…
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 22,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  ['01', 'Upload', 'Select your statement'],
                  ['02', 'Categorise', 'Review each transaction'],
                  ['03', 'Confirm', 'Save to your account'],
                ].map(([number, title, detail]) => (
                  <div
                    key={number}
                    style={{
                      flex: '1 1 150px',
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--surface-soft, #f8fbf9)',
                    }}
                  >
                    <span className="muted small">{number}</span>
                    <strong style={{ display: 'block', marginTop: 5 }}>
                      {title}
                    </strong>
                    <span className="muted small">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importStage === 'review' && (() => {
            const row = importRows[importIndex];

            if (!row) {
              return (
                <div style={{ marginTop: 24 }}>
                  <p>No transactions remain to review.</p>
                  <button
                    className="secondary-button"
                    onClick={() => setImportStage('upload')}
                  >
                    Choose another file
                  </button>
                </div>
              );
            }

            const availableCategories = categories.filter(
              (category) =>
                category.type === row.type || category.type === 'both'
            );

            const selectedCount = importRows.filter(
              (item) => item.selected
            ).length;

            const goTo = (index) => {
              setImportIndex(
                Math.max(0, Math.min(index, importRows.length - 1))
              );
            };

            const changeCategory = (category) => {
              updateImportRow(row.importId, {
                category: category.name,
                categoryIcon: category.icon || '•',
                categoryId: category._id || '',
              });
            };

            const deleteCurrent = () => {
              const remainingRows = importRows.filter(
                (item) => item.importId !== row.importId
              );

              setImportRows(remainingRows);

              if (remainingRows.length === 0) {
                setImportIndex(0);
                setImportStage('upload');
              } else {
                setImportIndex(
                  Math.min(importIndex, remainingRows.length - 1)
                );
              }
            };

            return (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 5 }}>
                      TRANSACTION REVIEW
                    </p>
                    <p className="muted small" style={{ margin: 0 }}>
                      {importFileName}
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => setImportStage('upload')}
                  >
                    Change file
                  </button>
                </div>

                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 9,
                    }}
                  >
                    <strong>
                      Transaction {importIndex + 1} of {importRows.length}
                    </strong>
                    <span className="muted small">
                      {selectedCount} selected to import
                    </span>
                  </div>

                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      background: 'var(--border, #e4e9e5)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${((importIndex + 1) / importRows.length) * 100
                          }%`,
                        height: '100%',
                        background: 'var(--green-strong, #20865b)',
                        transition: 'width 180ms ease',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border, #e1e8e3)',
                    borderRadius: 20,
                    padding: 'clamp(18px, 4vw, 28px)',
                    marginTop: 22,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span
                        className="muted small"
                        style={{ display: 'block', marginBottom: 8 }}
                      >
                        {row.type === 'income' ? 'DEPOSIT' : 'WITHDRAWAL'}
                      </span>

                      <div
                        style={{
                          fontSize: 'clamp(28px, 6vw, 38px)',
                          fontWeight: 750,
                          letterSpacing: '-1px',
                        }}
                      >
                        ₹{Number(row.amount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={deleteCurrent}
                      title="Remove this transaction from the import"
                      aria-label="Delete this transaction"
                      style={{
                        color: '#c43e46',
                        borderColor: '#f0c9cc',
                        flexShrink: 0,
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>

                  <label style={{ display: 'block', marginTop: 22 }}>
                    Transaction amount (₹)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) =>
                        updateImportRow(row.importId, {
                          amount: event.target.value,
                        })
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: 8,
                        fontSize: 18,
                        fontWeight: 650,
                      }}
                    />
                  </label>

                  <label style={{ display: 'block', marginTop: 16 }}>
                    Transaction date
                    <input
                      type="date"
                      value={row.date}
                      onChange={(event) =>
                        updateImportRow(row.importId, {
                          date: event.target.value,
                        })
                      }
                      style={{ display: 'block', width: '100%', marginTop: 8 }}
                      required
                    />
                  </label>

                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>
                      Bank transaction remarks
                    </label>
                    <div
                      style={{
                        borderRadius: 12,
                        padding: 13,
                        background: 'var(--surface-soft, #f7faf8)',
                        overflowWrap: 'anywhere',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {row.remarks || 'No bank remarks provided'}
                    </div>
                  </div>

                  <label style={{ display: 'block', marginTop: 20 }}>
                    What was this transaction for?
                    <input
                      type="text"
                      value={row.description}
                      placeholder="e.g. Lunch, groceries, cab fare…"
                      maxLength={240}
                      onChange={(event) =>
                        updateImportRow(row.importId, {
                          description: event.target.value,
                        })
                      }
                      style={{ display: 'block', width: '100%', marginTop: 8 }}
                      required
                    />
                  </label>

                  <div style={{ marginTop: 24 }}>
                    <strong>
                      {row.type === 'income'
                        ? 'Choose an income category'
                        : 'Choose an expense category'}
                    </strong>
                    <p className="muted small" style={{ marginTop: 5 }}>
                      Tap a category to assign it to this transaction.
                    </p>

                    {availableCategories.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(105px, 1fr))',
                          gap: 10,
                          marginTop: 14,
                        }}
                      >
                        {availableCategories.map((category) => {
                          const isSelected = row.category === category.name;

                          return (
                            <button
                              type="button"
                              key={category._id || category.name}
                              onClick={() => changeCategory(category)}
                              aria-pressed={isSelected}
                              style={{
                                minHeight: 88,
                                padding: 12,
                                borderRadius: 15,
                                border: isSelected
                                  ? '2px solid var(--green-strong, #20865b)'
                                  : '1px solid var(--border, #e1e8e3)',
                                background: isSelected
                                  ? 'var(--green-soft, #e6f5ed)'
                                  : 'var(--surface, #fff)',
                                color: 'var(--text, #24352b)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 7,
                                fontWeight: isSelected ? 700 : 500,
                              }}
                            >
                              <span style={{ fontSize: 25 }}>
                                {category.icon || '•'}
                              </span>
                              <span style={{ fontSize: 12, textAlign: 'center' }}>
                                {category.name}
                              </span>
                              {isSelected && (
                                <span style={{ fontSize: 11 }}>✓ Selected</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted small">
                        No categories of this transaction type are available.
                        Add one in Categories before continuing.
                      </p>
                    )}
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 22,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(event) =>
                        updateImportRow(row.importId, {
                          selected: event.target.checked,
                        })
                      }
                    />
                    <span>Include this transaction in the import</span>
                  </label>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginTop: 20,
                  }}
                >
                  <button
                    className="secondary-button"
                    disabled={importIndex === 0}
                    onClick={() => goTo(importIndex - 1)}
                  >
                    ← Previous
                  </button>

                  <button
                    className="secondary-button"
                    disabled={importIndex === importRows.length - 1}
                    onClick={() => goTo(importIndex + 1)}
                  >
                    Next transaction →
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: '1px solid var(--border, #e1e8e3)',
                  }}
                >
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setImportRows([]);
                      setImportIndex(0);
                      setImportStage('upload');
                    }}
                    disabled={appBusy}
                  >
                    Cancel import
                  </button>

                  <button
                    className="primary-button"
                    onClick={() => setImportStage('confirm')}
                    disabled={!importRows.length || appBusy}
                  >
                    Review before saving →
                  </button>
                </div>
              </div>
            );
          })()}

          {importStage === 'confirm' && (
            <div style={{ marginTop: 24 }}>
              <h3>Confirm your import</h3>
              <p className="muted">
                Check the selected transactions before adding them to your account.
                You can return to editing if anything needs to change.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  margin: '20px 0',
                }}
              >
                <div
                  style={{
                    flex: '1 1 150px',
                    borderRadius: 16,
                    padding: 18,
                    background: 'var(--surface-soft, #f7faf8)',
                  }}
                >
                  <span className="muted small">Transactions selected</span>
                  <h2>
                    {importRows.filter((row) => row.selected).length}
                  </h2>
                </div>

                <div
                  style={{
                    flex: '1 1 150px',
                    borderRadius: 16,
                    padding: 18,
                    background: 'var(--surface-soft, #f7faf8)',
                  }}
                >
                  <span className="muted small">Selected withdrawals</span>
                  <h2>
                    ₹{importRows
                      .filter((row) => row.selected && row.type === 'expense')
                      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
                      .toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </h2>
                </div>

                <div
                  style={{
                    flex: '1 1 150px',
                    borderRadius: 16,
                    padding: 18,
                    background: 'var(--surface-soft, #f7faf8)',
                  }}
                >
                  <span className="muted small">Selected deposits</span>
                  <h2>
                    ₹{importRows
                      .filter((row) => row.selected && row.type === 'income')
                      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
                      .toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </h2>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="secondary-button"
                  onClick={() => {
                    setImportStage('review');
                    setImportIndex(0);
                  }}
                  disabled={appBusy}
                >
                  ← Back to transactions
                </button>

                <button
                  className="primary-button"
                  onClick={saveImportedTransactions}
                  disabled={
                    appBusy ||
                    !importRows.some((row) => row.selected)
                  }
                >
                  {appBusy ? 'Saving transactions…' : 'Confirm and import ✓'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )}
    <div className="mobile-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><span>◫</span>Home</button><button className={view === 'transactions' ? 'active' : ''} onClick={() => setView('transactions')}><span>↕</span>Activity</button><button className={view === 'categories' ? 'active' : ''} onClick={() => setView('categories')}><span>◈</span>Categories</button><button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}><span>◎</span>Budget</button></div>
  </div>;
}

function TransactionTable({ transactions, onDelete }) {
  return <div className="table-scroll"><table className="transaction-table"><thead><tr><th>Transaction</th><th>Date</th><th>Payment</th><th className="align-right">Amount</th><th aria-label="Actions" /></tr></thead><tbody>{transactions.map((tx) => <tr key={tx._id}><td><div className="transaction-title"><span className="transaction-icon">{tx.type === 'income' ? '↗' : tx.categoryIcon || '•'}</span><span><strong>{tx.description || tx.category || 'Transaction'}</strong><small>{tx.category || 'Uncategorised'}</small></span></div></td><td className="date-cell">{formatDate(tx.date)}</td><td><span className={`payment-chip ${tx.source === 'imported' ? 'online' : ''}`}>{tx.source === 'imported' ? 'ONLINE' : 'CASH'}</span></td><td className={`amount-cell align-right ${tx.type === 'income' ? 'income-amount' : ''}`}>{tx.type === 'income' ? '+' : '−'}{currency(tx.amount)}</td><td className="action-cell"><button title="Delete transaction" onClick={() => onDelete(tx._id)}>×</button></td></tr>)}</tbody></table></div>;
}

function EmptyState({ text }) {
  return <div className="empty-state"><div>◌</div><strong>Nothing to show yet</strong><p>{text}</p></div>;
}

export default App;
