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
const authTitle = document.getElementById("authTitle");
const logoutButton = document.getElementById("logoutButton");
const profileButton = document.getElementById("profileButton");
const profileShortName = document.getElementById("profileShortName");
const profileAvatar = document.getElementById("profileAvatar");
const appHeader = document.getElementById("appHeader");
const summaryCards = document.getElementById("summaryCards");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const totalCount = document.getElementById("totalCount");
const filteredCount = document.getElementById("filteredCount");
const profileModal = document.getElementById("profileModal");
const categoryModal = document.getElementById("categoryModal");
const operationModal = document.getElementById("operationModal");
const categoryModalForm = document.getElementById("categoryModalForm");
const openCategoryModal = document.getElementById("openCategoryModal");
const openOperationModal = document.getElementById("openOperationModal");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const shareButton = document.getElementById("shareButton");
const shareMessage = document.getElementById("shareMessage");
const summaryPeriod = document.getElementById("summaryPeriod");
const quickFilterButtons = document.querySelectorAll("[data-quick-filter]");
const authPanels = document.querySelectorAll("[data-auth-view]");
const authSwitchButtons = document.querySelectorAll("[data-auth-switch]");
const balanceAmount = document.getElementById("balanceAmount");
const incomeTotal = document.getElementById("incomeTotal");
const expenseTotal = document.getElementById("expenseTotal");
const planTotal = document.getElementById("planTotal");
const analyticsChart = document.getElementById("analyticsChart");
const transactionTypeButtons = document.querySelectorAll("[data-transaction-type]");
const formTypeButtons = document.querySelectorAll("[data-form-type]");
const categoryTypeButtons = document.querySelectorAll("[data-category-type]");
const addOperationSection = form.closest(".card");
const actionButtons = document.querySelectorAll("[data-action-type]");
const actionOpenButtons = document.querySelectorAll("[data-action-open]");

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

let filterType = "all";
let formType = "expense";
let categoryType = "expense";
let viewOnly = false;
const sharedUserId = new URLSearchParams(window.location.search).get("user");

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
      toggleModal(operationModal, false);
    });
  });
};

const setAuthView = (view) => {
  authPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.authView !== view);
  });
  if (authTitle) {
    authTitle.textContent = view === "register" ? "Регистрация" : "Вход";
  }
};

const toggleAuthView = () => {
  const isAuthenticated = Boolean(state.user);
  const showContent = isAuthenticated || viewOnly;
  authSection.style.display = showContent ? "none" : "flex";
  appContent.style.display = showContent ? "grid" : "none";
  filtersBar.style.display = showContent ? "grid" : "none";
  if (appHeader) {
    appHeader.style.display = showContent ? "flex" : "none";
  }
  if (summaryCards) {
    summaryCards.style.display = showContent ? "grid" : "none";
  }
  if (addOperationSection) {
    addOperationSection.style.display = viewOnly ? "none" : "flex";
  }
  form.style.display = viewOnly ? "none" : "grid";
  clearAllButton.style.display = viewOnly ? "none" : "inline-flex";
  openCategoryModal.style.display = viewOnly ? "none" : "inline-flex";
  categoryForm.style.display = viewOnly ? "none" : "flex";
  if (openOperationModal) {
    openOperationModal.style.display = viewOnly ? "none" : "inline-flex";
  }
};

const renderUserProfile = () => {
  if (!state.user) {
    userName.textContent = "—";
    userEmail.textContent = "—";
    profileShortName.textContent = "—";
    avatarPreview.removeAttribute("src");
    profileAvatar.removeAttribute("src");
    return;
  }

  userName.textContent = state.user.name;
  userEmail.textContent = state.user.email;
  profileShortName.textContent = state.user.name;
  const avatarUrl = state.user.avatar_url || "https://placehold.co/120x120?text=MF";
  avatarPreview.src = avatarUrl;
  profileAvatar.src = avatarUrl;
};

const getCategoryTypeForForm = (type) => (type === "income" ? "income" : "expense");

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
  const normalizedCategoryType = getCategoryTypeForForm(categoryType);
  const visibleCategories = state.categories.filter(
    (category) => category.type === normalizedCategoryType
  );

  visibleCategories.forEach((category) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = category.name;

    if (!category.is_default && !viewOnly) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "✕";
      button.addEventListener("click", () => removeCategory(category.id));
      chip.appendChild(button);
    }

    categoryList.appendChild(chip);
  });

  const formCategoryType = getCategoryTypeForForm(formType);
  const formCategories = state.categories.filter((category) => category.type === formCategoryType);
  buildCategoryOptions(formCategories, categorySelect);
  const filterCategories =
    filterType === "all"
      ? state.categories
      : state.categories.filter(
          (category) => category.type === getCategoryTypeForForm(filterType)
        );
  buildCategoryOptions(filterCategories, filterCategory, true);
};

const getFilters = () => {
  const data = new FormData(filterForm);
  return {
    category: data.get("category") || "all",
    startDate: data.get("startDate") || "",
    endDate: data.get("endDate") || "",
    search: data.get("search")?.toLowerCase().trim() || "",
    type: filterType,
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
  const { category, startDate, endDate, search, type } = getFilters();
  const minAmount = Number.parseFloat(filterForm.dataset.minAmount || "0");

  return expenses.filter((expense) => {
    if (type !== "all" && expense.type !== type) {
      return false;
    }

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
  const income = filteredExpenses.filter((item) => item.type === "income");
  const expense = filteredExpenses.filter((item) => item.type === "expense");
  const plan = filteredExpenses.filter((item) => item.type === "plan");
  const incomeSum = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenseSum = expense.reduce((sum, item) => sum + Number(item.amount), 0);
  const planSum = plan.reduce((sum, item) => sum + Number(item.amount), 0);
  const total = incomeSum - expenseSum;

  balanceAmount.textContent = formatCurrency(total);
  totalAmount.textContent = formatCurrency(total);
  incomeTotal.textContent = formatCurrency(incomeSum);
  expenseTotal.textContent = formatCurrency(expenseSum);
  planTotal.textContent = formatCurrency(planSum);

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

  renderChart(filteredExpenses);
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
      const typeLabel =
        expense.type === "income" ? "Доход" : expense.type === "plan" ? "План" : "Расход";
      meta.textContent = `${typeLabel} · ${category ? category.name : ""} · ${new Date(
        expense.spent_on
      ).toLocaleDateString("ru-RU")}`;
      amount.textContent = formatCurrency(Number(expense.amount));
      if (viewOnly) {
        removeButton.style.display = "none";
      } else {
        removeButton.addEventListener("click", () => removeExpense(expense.id));
      }

      item.dataset.id = expense.id;
      item.classList.add(`expense-item--${expense.type}`);
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

const renderChart = (expenses) => {
  if (!analyticsChart) {
    return;
  }

  const ctx = analyticsChart.getContext("2d");
  const width = analyticsChart.width;
  const height = analyticsChart.height;
  ctx.clearRect(0, 0, width, height);

  const days = 7;
  const now = new Date();
  const labels = [];
  const incomeData = [];
  const expenseData = [];
  const planData = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const label = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    labels.push(label);

    const dayExpenses = expenses.filter(
      (expense) => new Date(expense.spent_on).toDateString() === date.toDateString()
    );
    const incomeSum = dayExpenses
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expenseSum = dayExpenses
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const planSum = dayExpenses
      .filter((item) => item.type === "plan")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    incomeData.push(incomeSum);
    expenseData.push(expenseSum);
    planData.push(planSum);
  }

  const maxValue = Math.max(1, ...incomeData, ...expenseData, ...planData);
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = chartWidth / (days - 1);

  const drawLine = (data, color) => {
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + stepX * index;
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  drawLine(incomeData, "#16a34a");
  drawLine(expenseData, "#ef4444");
  drawLine(planData, "#38bdf8");
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

const fetchPublicData = async (userId) => {
  const response = await apiFetch(`/public/${userId}`);
  state.user = response.user;
  state.categories = response.categories;
  state.expenses = response.expenses;
  viewOnly = true;
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

const addCategory = async (name, type = categoryType) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  await apiFetch("/categories", {
    method: "POST",
    body: JSON.stringify({ name: trimmed, type: getCategoryTypeForForm(type) }),
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

const addExpense = async ({ title, categoryId, amount, date, type }) => {
  const newExpense = await apiFetch("/expenses", {
    method: "POST",
    body: JSON.stringify({
      title,
      amount,
      spent_on: date,
      category_id: categoryId,
      type,
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
    shareMessage.textContent = "Ссылка скопирована. Доступ будет только для просмотра.";
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

  await addExpense({ title, categoryId, amount, date, type: formType });
  form.reset();
  form.elements.date.value = new Date().toISOString().split("T")[0];
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(categoryForm);
  await addCategory(formData.get("categoryName"), categoryType);
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
  if (clearAllButton.dataset.action === "view-all") {
    return;
  }
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

if (openOperationModal) {
  openOperationModal.addEventListener("click", () => {
    toggleModal(operationModal, true);
  });
}

openCategoryModal.addEventListener("click", () => {
  toggleModal(categoryModal, true);
});

categoryModalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(categoryModalForm);
  await addCategory(formData.get("categoryName"), getCategoryTypeForForm(formType));
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

authSwitchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthView(button.dataset.authSwitch);
  });
});

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    formType = button.dataset.actionType;
    formTypeButtons.forEach((item) => item.classList.remove("is-active"));
    formTypeButtons.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.formType === formType);
    });
    renderCategories();
    toggleModal(operationModal, true);
  });
});

actionOpenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.actionOpen === "profile") {
      toggleModal(profileModal, true);
    }
  });
});

transactionTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    transactionTypeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    filterType = button.dataset.transactionType;
    renderCategories();
    render();
  });
});

formTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    formTypeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    formType = button.dataset.formType;
    renderCategories();
  });
});

categoryTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryTypeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    categoryType = button.dataset.categoryType;
    renderCategories();
  });
});

const today = new Date().toISOString().split("T")[0];
form.elements.date.value = today;

attachModalHandlers();
setAuthView("login");

const existingToken = localStorage.getItem(TOKEN_KEY);
if (sharedUserId) {
  fetchPublicData(sharedUserId).catch(() => {
    viewOnly = false;
    syncUI();
  });
} else if (existingToken) {
  fetchUserData().catch(() => logoutUser());
} else {
  syncUI();
}
