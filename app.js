const STORAGE_KEY = "gastos-app-v1";

const expenseCategories = [
  { name: "Comida", color: "#0f766e" },
  { name: "Transporte", color: "#2563eb" },
  { name: "Casa", color: "#7c3aed" },
  { name: "Servicios", color: "#d97706" },
  { name: "Salud", color: "#dc2626" },
  { name: "Ocio", color: "#db2777" },
  { name: "Compras", color: "#0891b2" },
  { name: "Otros", color: "#475569" },
];

const incomeCategories = [
  { name: "Sueldo", color: "#15803d" },
  { name: "Extra", color: "#16a34a" },
  { name: "Venta", color: "#65a30d" },
  { name: "Otros", color: "#475569" },
];

const initialState = {
  settings: {
    budget: 0,
    currency: "ARS",
  },
  activeType: "expense",
  transactions: [],
};

let state = loadState();
applyRecurringTransactions();

const $ = (id) => document.getElementById(id);

const els = {
  monthTitle: $("monthTitle"),
  availableAmount: $("availableAmount"),
  incomeAmount: $("incomeAmount"),
  expenseAmount: $("expenseAmount"),
  budgetAmount: $("budgetAmount"),
  budgetProgress: $("budgetProgress"),
  budgetStatus: $("budgetStatus"),
  expenseTab: $("expenseTab"),
  incomeTab: $("incomeTab"),
  form: $("transactionForm"),
  amount: $("amountInput"),
  category: $("categoryInput"),
  date: $("dateInput"),
  note: $("noteInput"),
  recurring: $("recurringInput"),
  periodFilter: $("periodFilter"),
  categoryChart: $("categoryChart"),
  typeFilter: $("typeFilter"),
  categoryFilter: $("categoryFilter"),
  transactionList: $("transactionList"),
  clearFilters: $("clearFiltersBtn"),
  settingsBtn: $("settingsBtn"),
  settingsDialog: $("settingsDialog"),
  budgetInput: $("budgetInput"),
  currencyInput: $("currencyInput"),
  saveSettings: $("saveSettingsBtn"),
  exportBtn: $("exportBtn"),
  importInput: $("importInput"),
  emptyTemplate: $("emptyTemplate"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...initialState, ...saved, settings: { ...initialState.settings, ...saved.settings } } : initialState;
  } catch {
    return initialState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: state.settings.currency,
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value || 0);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function addMonths(month, count) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + count, 1);
  return date.toISOString().slice(0, 7);
}

function dateForMonth(originalDate, targetMonth) {
  const day = Number(originalDate.slice(8, 10));
  const [year, monthIndex] = targetMonth.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return `${targetMonth}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function applyRecurringTransactions() {
  const current = monthKey();
  let changed = false;
  const roots = state.transactions.filter((item) => item.recurring && !item.recurringSourceId);

  roots.forEach((root) => {
    let cursor = addMonths(root.date.slice(0, 7), 1);
    while (cursor <= current) {
      const alreadyExists = state.transactions.some(
        (item) => item.recurringSourceId === root.id && item.date.startsWith(cursor)
      );
      if (!alreadyExists) {
        state.transactions.unshift({
          ...root,
          id: crypto.randomUUID(),
          date: dateForMonth(root.date, cursor),
          recurringSourceId: root.id,
          createdAt: new Date().toISOString(),
        });
        changed = true;
      }
      cursor = addMonths(cursor, 1);
    }
  });

  if (changed) saveState();
}

function currentMonthTransactions() {
  const key = monthKey();
  return state.transactions.filter((item) => item.date.startsWith(key));
}

function categoriesFor(type = state.activeType) {
  return type === "income" ? incomeCategories : expenseCategories;
}

function setActiveType(type) {
  state.activeType = type;
  els.expenseTab.classList.toggle("active", type === "expense");
  els.incomeTab.classList.toggle("active", type === "income");
  renderCategoryOptions();
  saveState();
}

function renderCategoryOptions() {
  const options = categoriesFor()
    .map((category) => `<option value="${category.name}">${category.name}</option>`)
    .join("");
  els.category.innerHTML = options;

  const allCategories = [...expenseCategories, ...incomeCategories].map((category) => category.name);
  const unique = ["all", ...new Set(allCategories)];
  els.categoryFilter.innerHTML = unique
    .map((name) => `<option value="${name}">${name === "all" ? "Todas las categorías" : name}</option>`)
    .join("");
}

function addTransaction(event) {
  event.preventDefault();
  const amount = Number(els.amount.value);
  if (!amount || amount <= 0) return;

  const id = crypto.randomUUID();
  state.transactions.unshift({
    id,
    type: state.activeType,
    amount,
    category: els.category.value,
    date: els.date.value,
    note: els.note.value.trim(),
    recurring: els.recurring.checked,
    createdAt: new Date().toISOString(),
  });

  els.form.reset();
  els.date.value = todayISO();
  setActiveType(state.activeType);
  saveState();
  render();
}

function totals(items) {
  return items.reduce(
    (acc, item) => {
      acc[item.type] += item.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
}

function renderSummary() {
  const monthItems = currentMonthTransactions();
  const total = totals(monthItems);
  const available = total.income - total.expense;
  const budget = Number(state.settings.budget) || 0;
  const used = budget > 0 ? Math.min((total.expense / budget) * 100, 100) : 0;
  const monthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date());

  els.monthTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  els.availableAmount.textContent = money(available);
  els.incomeAmount.textContent = money(total.income);
  els.expenseAmount.textContent = money(total.expense);
  els.budgetAmount.textContent = budget ? money(budget) : "Sin definir";
  els.budgetProgress.style.width = `${used}%`;
  els.budgetProgress.style.background = used > 85 ? "var(--expense)" : used > 65 ? "var(--warning)" : "var(--accent)";
  els.budgetStatus.textContent = budget ? `${Math.round(used)}% usado` : "Definilo en ajustes";
}

function renderChart() {
  const source = els.periodFilter.value === "month" ? currentMonthTransactions() : state.transactions;
  const expenses = source.filter((item) => item.type === "expense");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!expenses.length) {
    els.categoryChart.innerHTML = "";
    els.categoryChart.appendChild(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  const grouped = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  els.categoryChart.innerHTML = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const meta = expenseCategories.find((item) => item.name === category) || expenseCategories.at(-1);
      const percent = total ? (amount / total) * 100 : 0;
      return `
        <div class="category-row">
          <div class="category-meta">
            <strong>${category}</strong>
            <span>${money(amount)} · ${Math.round(percent)}%</span>
          </div>
          <div class="bar"><div style="width:${percent}%;background:${meta.color}"></div></div>
        </div>
      `;
    })
    .join("");
}

function renderTransactions() {
  const type = els.typeFilter.value;
  const category = els.categoryFilter.value;
  const items = state.transactions.filter((item) => {
    const typeMatch = type === "all" || item.type === type;
    const categoryMatch = category === "all" || item.category === category;
    return typeMatch && categoryMatch;
  });

  if (!items.length) {
    els.transactionList.innerHTML = "";
    els.transactionList.appendChild(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  els.transactionList.innerHTML = items
    .map((item) => {
      const sign = item.type === "income" ? "+" : "-";
      const note = item.note ? ` · ${item.note}` : "";
      const recurring = item.recurring ? " · mensual" : "";
      const date = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(`${item.date}T00:00:00`));
      return `
        <article class="transaction-item">
          <div class="transaction-main">
            <strong>${item.category}</strong>
            <span>${date}${note}${recurring}</span>
          </div>
          <div class="transaction-side">
            <strong class="${item.type}">${sign}${money(item.amount)}</strong>
            <span>${item.type === "income" ? "Ingreso" : "Egreso"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderSummary();
  renderChart();
  renderTransactions();
}

function openSettings() {
  els.budgetInput.value = state.settings.budget || "";
  els.currencyInput.value = state.settings.currency;
  els.settingsDialog.showModal();
}

function saveSettings() {
  state.settings.budget = Number(els.budgetInput.value) || 0;
  state.settings.currency = els.currencyInput.value;
  saveState();
  render();
}

function exportData() {
  const data = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(data);
  link.download = `gastos-respaldo-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.transactions)) throw new Error("Formato inválido");
      state = { ...initialState, ...imported, settings: { ...initialState.settings, ...imported.settings } };
      saveState();
      renderCategoryOptions();
      setActiveType(state.activeType || "expense");
      render();
    } catch {
      alert("No pude importar ese archivo.");
    }
  };
  reader.readAsText(file);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

els.expenseTab.addEventListener("click", () => setActiveType("expense"));
els.incomeTab.addEventListener("click", () => setActiveType("income"));
els.form.addEventListener("submit", addTransaction);
els.periodFilter.addEventListener("change", renderChart);
els.typeFilter.addEventListener("change", renderTransactions);
els.categoryFilter.addEventListener("change", renderTransactions);
els.clearFilters.addEventListener("click", () => {
  els.typeFilter.value = "all";
  els.categoryFilter.value = "all";
  renderTransactions();
});
els.settingsBtn.addEventListener("click", openSettings);
els.saveSettings.addEventListener("click", saveSettings);
els.exportBtn.addEventListener("click", exportData);
els.importInput.addEventListener("change", importData);

els.date.value = todayISO();
renderCategoryOptions();
setActiveType(state.activeType || "expense");
render();
registerServiceWorker();
