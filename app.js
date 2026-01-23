const form = document.getElementById("expenseForm");
const list = document.getElementById("expenseList");
const template = document.getElementById("expenseItemTemplate");
const totalAmount = document.getElementById("totalAmount");
const categorySummary = document.getElementById("categorySummary");
const emptyState = document.getElementById("emptyState");
const clearAllButton = document.getElementById("clearAll");
const profileSelect = document.getElementById("profileSelect");
const profileForm = document.getElementById("profileForm");
const categoryForm = document.getElementById("categoryForm");
const categoryList = document.getElementById("categoryList");
const categorySelect = document.getElementById("categorySelect");
const filterForm = document.getElementById("filterForm");
const filterCategory = document.getElementById("filterCategory");
const resetFilters = document.getElementById("resetFilters");

const STORAGE_KEY = "expenses-data";
const DEFAULT_CATEGORIES = [
  "Еда",
  "Транспорт",
  "Дом",
  "Развлечения",
  "Здоровье",
  "Обучение",
  "Другое",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);

const createProfile = (name) => ({
  id: crypto.randomUUID(),
  name,
  categories: DEFAULT_CATEGORIES.map((category) => ({
    name: category,
    locked: true,
  })),
  expenses: [],
});

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const profile = createProfile("Основной");
    return { profiles: [profile], activeProfileId: profile.id };
  }

  const parsed = JSON.parse(stored);
  if (!parsed.profiles || !parsed.profiles.length) {
    const profile = createProfile("Основной");
    return { profiles: [profile], activeProfileId: profile.id };
  }

  return parsed;
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

let state = loadState();

const getActiveProfile = () =>
  state.profiles.find((profile) => profile.id === state.activeProfileId) ||
  state.profiles[0];

const setActiveProfile = (id) => {
  state.activeProfileId = id;
  saveState();
  syncUI();
};

const buildCategoryOptions = (categories, select, includeAll = false) => {
  select.innerHTML = "";

  if (includeAll) {
    const option = document.createElement("option");
    option.value = "all";
    option.textContent = "Все категории";
    select.appendChild(option);
  } else {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Выберите категорию";
    select.appendChild(placeholder);
  }

  categories.forEach(({ name }) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
};

const renderProfiles = () => {
  profileSelect.innerHTML = "";
  state.profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    profileSelect.appendChild(option);
  });

  profileSelect.value = getActiveProfile().id;
};

const renderCategories = () => {
  const activeProfile = getActiveProfile();
  categoryList.innerHTML = "";

  activeProfile.categories.forEach((category) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = category.name;

    if (!category.locked) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "✕";
      button.addEventListener("click", () => removeCategory(category.name));
      chip.appendChild(button);
    }

    categoryList.appendChild(chip);
  });

  buildCategoryOptions(activeProfile.categories, categorySelect);
  buildCategoryOptions(activeProfile.categories, filterCategory, true);
};

const getFilters = () => {
  const data = new FormData(filterForm);
  return {
    category: data.get("category") || "all",
    startDate: data.get("startDate") || "",
    endDate: data.get("endDate") || "",
    search: data.get("search")?.toLowerCase().trim() || "",
  };
};

const applyFilters = (expenses) => {
  const { category, startDate, endDate, search } = getFilters();

  return expenses.filter((expense) => {
    if (category !== "all" && expense.category !== category) {
      return false;
    }

    if (startDate && new Date(expense.date) < new Date(startDate)) {
      return false;
    }

    if (endDate && new Date(expense.date) > new Date(endDate)) {
      return false;
    }

    if (search && !expense.title.toLowerCase().includes(search)) {
      return false;
    }

    return true;
  });
};

const renderTotals = (filteredExpenses) => {
  const total = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  totalAmount.textContent = formatCurrency(total);

  const summary = filteredExpenses.reduce((acc, item) => {
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

const renderList = (filteredExpenses) => {
  list.innerHTML = "";

  if (!filteredExpenses.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  filteredExpenses
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
  const activeProfile = getActiveProfile();
  const filteredExpenses = applyFilters(activeProfile.expenses);
  renderList(filteredExpenses);
  renderTotals(filteredExpenses);
};

const syncUI = () => {
  renderProfiles();
  renderCategories();
  render();
};

const removeExpense = (id) => {
  const activeProfile = getActiveProfile();
  activeProfile.expenses = activeProfile.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
};

const addProfile = (name) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const profile = createProfile(trimmed);
  state.profiles.push(profile);
  state.activeProfileId = profile.id;
  saveState();
  syncUI();
};

const addCategory = (name) => {
  const activeProfile = getActiveProfile();
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const exists = activeProfile.categories.some(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return;
  }

  activeProfile.categories.push({ name: trimmed, locked: false });
  saveState();
  renderCategories();
};

const removeCategory = (name) => {
  const activeProfile = getActiveProfile();
  activeProfile.categories = activeProfile.categories.filter(
    (category) => category.name !== name || category.locked
  );

  activeProfile.expenses = activeProfile.expenses.filter(
    (expense) => expense.category !== name
  );

  saveState();
  renderCategories();
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

  const activeProfile = getActiveProfile();
  activeProfile.expenses.unshift({
    id: crypto.randomUUID(),
    title,
    category,
    amount,
    date,
  });

  saveState();
  form.reset();
  form.elements.date.value = new Date().toISOString().split("T")[0];
  render();
});

profileSelect.addEventListener("change", (event) => {
  setActiveProfile(event.target.value);
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  addProfile(formData.get("profileName"));
  profileForm.reset();
});

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(categoryForm);
  addCategory(formData.get("categoryName"));
  categoryForm.reset();
});

filterForm.addEventListener("input", () => {
  render();
});

resetFilters.addEventListener("click", () => {
  filterForm.reset();
  render();
});

clearAllButton.addEventListener("click", () => {
  const activeProfile = getActiveProfile();
  if (!activeProfile.expenses.length) {
    return;
  }

  const confirmed = window.confirm("Удалить все расходы текущего профиля?");
  if (confirmed) {
    activeProfile.expenses = [];
    saveState();
    render();
  }
});

const today = new Date().toISOString().split("T")[0];
form.elements.date.value = today;

syncUI();
