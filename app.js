const form = document.getElementById("expenseForm");
const list = document.getElementById("expenseList");
const template = document.getElementById("expenseItemTemplate");
const totalAmount = document.getElementById("totalAmount");
const categorySummary = document.getElementById("categorySummary");
const emptyState = document.getElementById("emptyState");
const clearAllButton = document.getElementById("clearAll");
const categoryForm = document.getElementById("categoryForm");
const categoryList = document.getElementById("categoryList");
const categorySelect = document.getElementById("categorySelect");
const filterForm = document.getElementById("filterForm");
const filterCategory = document.getElementById("filterCategory");
const resetFilters = document.getElementById("resetFilters");
const authSection = document.getElementById("authSection");
const appContent = document.getElementById("appContent");
const filtersBar = document.getElementById("filtersBar");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const logoutButton = document.getElementById("logoutButton");
const profileButton = document.getElementById("profileButton");
const profileShortName = document.getElementById("profileShortName");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const totalCount = document.getElementById("totalCount");
const filteredCount = document.getElementById("filteredCount");
const profileModal = document.getElementById("profileModal");
const categoryModal = document.getElementById("categoryModal");
const categoryModalForm = document.getElementById("categoryModalForm");
const openCategoryModal = document.getElementById("openCategoryModal");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const shareButton = document.getElementById("shareButton");
const shareMessage = document.getElementById("shareMessage");
const summaryPeriod = document.getElementById("summaryPeriod");
const quickFilterButtons = document.querySelectorAll("[data-quick-filter]");
const authTabs = document.querySelectorAll("[data-auth-tab]");
const authPanels = document.querySelectorAll("[data-auth-view]");

const API_BASE = "/api";
const TOKEN_KEY = "auth_token";

const formatCurrency = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);

let state = {
  user: null,
  categories: [],
  expenses: [],
};

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logoutUser();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Ошибка запроса");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const toggleModal = (modal, isOpen) => {
  modal.classList.toggle("is-open", isOpen);
};

const attachModalHandlers = () => {
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleModal(profileModal, false);
      toggleModal(categoryModal, false);
    });
  });
};

const setAuthView = (view) => {
  authTabs.forEach((tab) => {
    tab.classList.toggle("auth__tab--active", tab.dataset.authTab === view);
  });
  authPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.authView !== view);
  });
};

const toggleAuthView = () => {
  const isAuthenticated = Boolean(state.user);
  authSection.style.display = isAuthenticated ? "none" : "flex";
  appContent.style.display = isAuthenticated ? "grid" : "none";
  filtersBar.style.display = isAuthenticated ? "grid" : "none";
};

const renderUserProfile = () => {
  if (!state.user) {
    userName.textContent = "—";
    userEmail.textContent = "—";
    profileShortName.textContent = "—";
    avatarPreview.removeAttribute("src");
    return;
  }

  userName.textContent = state.user.name;
  userEmail.textContent = state.user.email;
  profileShortName.textContent = state.user.name;
  avatarPreview.src = state.user.avatar_url || "https://placehold.co/120x120?text=MF";
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

  categories.forEach(({ id, name }) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    select.appendChild(option);
  });
};

const renderCategories = () => {
  categoryList.innerHTML = "";

  state.categories.forEach((category) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = category.name;

    if (!category.is_default) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "✕";
      button.addEventListener("click", () => removeCategory(category.id));
      chip.appendChild(button);
    }

    categoryList.appendChild(chip);
  });

  buildCategoryOptions(state.categories, categorySelect);
  buildCategoryOptions(state.categories, filterCategory, true);
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

const setDateRange = (start, end) => {
  filterForm.elements.startDate.value = start;
  filterForm.elements.endDate.value = end;
};

const formatISODate = (date) => date.toISOString().split("T")[0];

const applyQuickFilter = (key) => {
  const now = new Date();
  if (key === "today") {
    const today = formatISODate(now);
    setDateRange(today, today);
    filterForm.dataset.minAmount = "";
  } else if (key === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    setDateRange(formatISODate(start), formatISODate(now));
    filterForm.dataset.minAmount = "";
  } else if (key === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateRange(formatISODate(start), formatISODate(now));
    filterForm.dataset.minAmount = "";
  } else if (key === "big") {
    filterForm.elements.search.value = "";
    setDateRange("", "");
    filterForm.elements.category.value = "all";
    filterForm.dataset.minAmount = "1000";
  }

  render();
};

const applyFilters = (expenses) => {
  const { category, startDate, endDate, search } = getFilters();
  const minAmount = Number.parseFloat(filterForm.dataset.minAmount || "0");

  return expenses.filter((expense) => {
    if (category !== "all" && expense.category_id !== category) {
      return false;
    }

    if (startDate && new Date(expense.spent_on) < new Date(startDate)) {
      return false;
    }

    if (endDate && new Date(expense.spent_on) > new Date(endDate)) {
      return false;
    }

    if (search && !expense.title.toLowerCase().includes(search)) {
      return false;
    }

    if (minAmount && Number(expense.amount) < minAmount) {
      return false;
    }

    return true;
  });
};

const filterByPeriod = (expenses) => {
  const period = summaryPeriod.value;
  if (period === "all") {
    return expenses;
  }

  const now = new Date();
  const start = new Date(now);

  if (period === "day") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "half-year") {
    const halfYearStartMonth = now.getMonth() < 6 ? 0 : 6;
    start.setMonth(halfYearStartMonth, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return expenses.filter((expense) => new Date(expense.spent_on) >= start);
};

const renderTotals = (filteredExpenses) => {
  const total = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  totalAmount.textContent = formatCurrency(total);

  const periodExpenses = filterByPeriod(filteredExpenses);
  const summary = periodExpenses.reduce((acc, item) => {
    const category = state.categories.find((cat) => cat.id === item.category_id);
    if (!category) {
      return acc;
    }
    acc[category.name] = (acc[category.name] || 0) + Number(item.amount);
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
    .sort((a, b) => new Date(b.spent_on) - new Date(a.spent_on))
    .forEach((expense) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".expense-item");
      const title = clone.querySelector("h3");
      const meta = clone.querySelector(".expense-item__meta");
      const amount = clone.querySelector(".expense-item__amount");
      const removeButton = clone.querySelector(".expense-item__remove");

      const category = state.categories.find((cat) => cat.id === expense.category_id);
      title.textContent = expense.title;
      meta.textContent = `${category ? category.name : ""} · ${new Date(
        expense.spent_on
      ).toLocaleDateString("ru-RU")}`;
      amount.textContent = formatCurrency(Number(expense.amount));
      removeButton.addEventListener("click", () => removeExpense(expense.id));

      item.dataset.id = expense.id;
      list.appendChild(clone);
    });
};

const render = () => {
  if (!state.user) {
    return;
  }

  const filteredExpenses = applyFilters(state.expenses);
  totalCount.textContent = state.expenses.length;
  filteredCount.textContent = filteredExpenses.length;
  renderList(filteredExpenses);
  renderTotals(filteredExpenses);
};

const syncUI = () => {
  toggleAuthView();
  renderUserProfile();
  renderCategories();
  render();
};

const fetchUserData = async () => {
  state.user = await apiFetch("/me");
  state.categories = await apiFetch("/categories");
  state.expenses = await apiFetch("/expenses");
  syncUI();
};

const loginUser = async ({ email, password }) => {
  const response = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, response.token);
  await fetchUserData();
};

const registerUser = async ({ name, email, password }) => {
  const response = await apiFetch("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  localStorage.setItem(TOKEN_KEY, response.token);
  await fetchUserData();
  toggleModal(profileModal, true);
};

const logoutUser = () => {
  localStorage.removeItem(TOKEN_KEY);
  state = { user: null, categories: [], expenses: [] };
  filterForm.reset();
  syncUI();
};

const addCategory = async (name) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  await apiFetch("/categories", {
    method: "POST",
    body: JSON.stringify({ name: trimmed }),
  });
  state.categories = await apiFetch("/categories");
  renderCategories();
};

const removeCategory = async (id) => {
  await apiFetch(`/categories/${id}`, { method: "DELETE" });
  state.categories = await apiFetch("/categories");
  state.expenses = await apiFetch("/expenses");
  renderCategories();
  render();
};

const addExpense = async ({ title, categoryId, amount, date }) => {
  const newExpense = await apiFetch("/expenses", {
    method: "POST",
    body: JSON.stringify({
      title,
      amount,
      spent_on: date,
      category_id: categoryId,
    }),
  });
  state.expenses.unshift(newExpense);
  render();
};

const removeExpense = async (id) => {
  await apiFetch(`/expenses/${id}`, { method: "DELETE" });
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  render();
};

const clearAllExpenses = async () => {
  await apiFetch("/expenses", { method: "DELETE" });
  state.expenses = [];
  render();
};

const updateAvatar = (file) => {
  if (!file || !state.user) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    await apiFetch("/me/avatar", {
      method: "PATCH",
      body: JSON.stringify({ avatar: reader.result }),
    });
    state.user.avatar_url = reader.result;
    renderUserProfile();
  };
  reader.readAsDataURL(file);
};

const shareProfileLink = async () => {
  if (!state.user) {
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?user=${state.user.id}`;
  try {
    await navigator.clipboard.writeText(url);
    shareMessage.textContent = "Ссылка скопирована в буфер обмена.";
  } catch (error) {
    shareMessage.textContent = "Не удалось скопировать ссылку.";
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const title = formData.get("title").trim();
  const categoryId = formData.get("category");
  const amount = Number.parseFloat(formData.get("amount"));
  const date = formData.get("date");

  if (!title || !categoryId || !amount || !date) {
    return;
  }

  await addExpense({ title, categoryId, amount, date });
  form.reset();
  form.elements.date.value = new Date().toISOString().split("T")[0];
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(categoryForm);
  await addCategory(formData.get("categoryName"));
  categoryForm.reset();
});

filterForm.addEventListener("input", () => {
  render();
});

resetFilters.addEventListener("click", () => {
  filterForm.reset();
  delete filterForm.dataset.minAmount;
  render();
});

summaryPeriod.addEventListener("change", () => {
  render();
});

clearAllButton.addEventListener("click", async () => {
  if (!state.expenses.length) {
    return;
  }

  const confirmed = window.confirm("Удалить все расходы текущего профиля?");
  if (confirmed) {
    await clearAllExpenses();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  const formData = new FormData(loginForm);

  try {
    await loginUser({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.textContent = "";
  registerMessage.classList.remove("message--success");
  const formData = new FormData(registerForm);

  try {
    await registerUser({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (error) {
    registerMessage.textContent = error.message;
  }
});

logoutButton.addEventListener("click", () => {
  logoutUser();
});

profileButton.addEventListener("click", () => {
  toggleModal(profileModal, true);
});

openCategoryModal.addEventListener("click", () => {
  toggleModal(categoryModal, true);
});

categoryModalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(categoryModalForm);
  await addCategory(formData.get("categoryName"));
  categoryModalForm.reset();
  toggleModal(categoryModal, false);
});

avatarInput.addEventListener("change", (event) => {
  updateAvatar(event.target.files[0]);
});

shareButton.addEventListener("click", () => {
  shareProfileLink();
});

quickFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyQuickFilter(button.dataset.quickFilter);
  });
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setAuthView(tab.dataset.authTab);
  });
});

const today = new Date().toISOString().split("T")[0];
form.elements.date.value = today;

attachModalHandlers();
setAuthView("login");

const existingToken = localStorage.getItem(TOKEN_KEY);
if (existingToken) {
  fetchUserData().catch(() => logoutUser());
} else {
  syncUI();
}
