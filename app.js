const form = document.getElementById("expenseForm");
const list = document.getElementById("expenseList");
const template = document.getElementById("expenseItemTemplate");
const totalAmount = document.getElementById("totalAmount");
const categorySummary = document.getElementById("categorySummary");
const emptyState = document.getElementById("emptyState");
const clearAllButton = document.getElementById("clearAll");

const STORAGE_KEY = "expenses-data";

const formatCurrency = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);

const loadExpenses = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveExpenses = (expenses) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

let expenses = loadExpenses();

const renderTotals = () => {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  totalAmount.textContent = formatCurrency(total);

  const summary = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  categorySummary.innerHTML = "";
  const entries = Object.entries(summary).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    categorySummary.innerHTML = "<p class=\"empty\">Нет данных для отображения.</p>";
    return;
  }

  entries.forEach(([category, amount]) => {
    const item = document.createElement("div");
    item.className = "summary__item";
    item.innerHTML = `<span>${category}</span><span class="summary__amount">${formatCurrency(
      amount
    )}</span>`;
    categorySummary.appendChild(item);
  });
};

const renderList = () => {
  list.innerHTML = "";

  if (!expenses.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((expense) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".expense-item");
      const title = clone.querySelector("h3");
      const meta = clone.querySelector(".expense-item__meta");
      const amount = clone.querySelector(".expense-item__amount");
      const removeButton = clone.querySelector(".expense-item__remove");

      title.textContent = expense.title;
      meta.textContent = `${expense.category} · ${new Date(expense.date).toLocaleDateString(
        "ru-RU"
      )}`;
      amount.textContent = formatCurrency(expense.amount);
      removeButton.addEventListener("click", () => removeExpense(expense.id));

      item.dataset.id = expense.id;
      list.appendChild(clone);
    });
};

const render = () => {
  renderList();
  renderTotals();
};

const removeExpense = (id) => {
  expenses = expenses.filter((expense) => expense.id !== id);
  saveExpenses(expenses);
  render();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const title = formData.get("title").trim();
  const category = formData.get("category");
  const amount = Number.parseFloat(formData.get("amount"));
  const date = formData.get("date");

  if (!title || !category || !amount || !date) {
    return;
  }

  expenses.unshift({
    id: crypto.randomUUID(),
    title,
    category,
    amount,
    date,
  });

  saveExpenses(expenses);
  form.reset();
  render();
});

clearAllButton.addEventListener("click", () => {
  if (!expenses.length) {
    return;
  }

  const confirmed = window.confirm("Удалить все расходы?");
  if (confirmed) {
    expenses = [];
    saveExpenses(expenses);
    render();
  }
});

const today = new Date().toISOString().split("T")[0];
form.elements.date.value = today;

render();
