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

const STORAGE_KEY = "expenses-db";
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

const createUser = ({ name, email, password }) => ({
  id: crypto.randomUUID(),
  name,
  email,
  password,
  avatar: "",
  categories: DEFAULT_CATEGORIES.map((category) => ({
    name: category,
    locked: true,
  })),
  expenses: [],
});

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { users: [], activeUserId: null };
  }

  const parsed = JSON.parse(stored);
  return {
    users: parsed.users || [],
    activeUserId: parsed.activeUserId || null,
  };
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

let state = loadState();

const getActiveUser = () =>
  state.users.find((user) => user.id === state.activeUserId) || null;

const setActiveUser = (id) => {
  state.activeUserId = id;
  saveState();
  syncUI();
};

const toggleAuthView = () => {
  const isAuthenticated = Boolean(getActiveUser());
  authSection.style.display = isAuthenticated ? "none" : "flex";
  appContent.style.display = isAuthenticated ? "grid" : "none";
  filtersBar.style.display = isAuthenticated ? "grid" : "none";
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

const renderCategories = () => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  categoryList.innerHTML = "";

  activeUser.categories.forEach((category) => {
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

  buildCategoryOptions(activeUser.categories, categorySelect);
  buildCategoryOptions(activeUser.categories, filterCategory, true);
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

    if (minAmount && expense.amount < minAmount) {
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

  return expenses.filter((expense) => new Date(expense.date) >= start);
};

const renderTotals = (filteredExpenses) => {
  const total = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  totalAmount.textContent = formatCurrency(total);

  const periodExpenses = filterByPeriod(filteredExpenses);

  const summary = periodExpenses.reduce((acc, item) => {
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

const renderUserProfile = () => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    userName.textContent = "—";
    userEmail.textContent = "—";
    profileShortName.textContent = "—";
    avatarPreview.removeAttribute("src");
    return;
  }

  userName.textContent = activeUser.name;
  userEmail.textContent = activeUser.email;
  profileShortName.textContent = activeUser.name;
  avatarPreview.src = activeUser.avatar || "https://placehold.co/120x120?text=MF";
};

const render = () => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  const filteredExpenses = applyFilters(activeUser.expenses);
  totalCount.textContent = activeUser.expenses.length;
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

const removeExpense = (id) => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  activeUser.expenses = activeUser.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
};

const addCategory = (name) => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const exists = activeUser.categories.some(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return;
  }

  activeUser.categories.push({ name: trimmed, locked: false });
  saveState();
  renderCategories();
};

const removeCategory = (name) => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  activeUser.categories = activeUser.categories.filter(
    (category) => category.name !== name || category.locked
  );

  activeUser.expenses = activeUser.expenses.filter(
    (expense) => expense.category !== name
  );

  saveState();
  renderCategories();
  render();
};

const addExpense = ({ title, category, amount, date }) => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  activeUser.expenses.unshift({
    id: crypto.randomUUID(),
    title,
    category,
    amount,
    date,
  });

  saveState();
  render();
};

const registerUser = ({ name, email, password }) => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < 6) {
    registerMessage.textContent = "Пароль должен быть минимум 6 символов.";
    return;
  }

  const exists = state.users.some((user) => user.email === trimmedEmail);
  if (exists) {
    registerMessage.textContent = "Пользователь с таким email уже существует.";
    return;
  }

  const user = createUser({
    name: trimmedName,
    email: trimmedEmail,
    password: trimmedPassword,
  });
  state.users.push(user);
  state.activeUserId = user.id;
  saveState();
  registerMessage.textContent = "Профиль создан, вы вошли в систему.";
  registerMessage.classList.add("message--success");
  registerForm.reset();
  syncUI();
  toggleModal(profileModal, true);
};

const loginUser = ({ email, password }) => {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  const user = state.users.find(
    (item) => item.email === trimmedEmail && item.password === trimmedPassword
  );

  if (!user) {
    loginMessage.textContent = "Неверный email или пароль.";
    return;
  }

  setActiveUser(user.id);
  loginMessage.textContent = "";
  loginForm.reset();
};

const logoutUser = () => {
  state.activeUserId = null;
  saveState();
  filterForm.reset();
  syncUI();
};

const updateAvatar = (file) => {
  const activeUser = getActiveUser();
  if (!activeUser || !file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    activeUser.avatar = reader.result;
    saveState();
    renderUserProfile();
  };
  reader.readAsDataURL(file);
};

const shareProfileLink = async () => {
  const activeUser = getActiveUser();
  if (!activeUser) {
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?user=${activeUser.id}`;
  try {
    await navigator.clipboard.writeText(url);
    shareMessage.textContent = "Ссылка скопирована в буфер обмена.";
  } catch (error) {
    shareMessage.textContent = "Не удалось скопировать ссылку.";
  }
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

  addExpense({ title, category, amount, date });
  form.reset();
  form.elements.date.value = new Date().toISOString().split("T")[0];
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
  delete filterForm.dataset.minAmount;
  render();
});

summaryPeriod.addEventListener("change", () => {
  render();
});

clearAllButton.addEventListener("click", () => {
  const activeUser = getActiveUser();
  if (!activeUser || !activeUser.expenses.length) {
    return;
  }

  const confirmed = window.confirm("Удалить все расходы текущего профиля?");
  if (confirmed) {
    activeUser.expenses = [];
    saveState();
    render();
  }
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  const formData = new FormData(loginForm);
  loginUser({
    email: formData.get("email"),
    password: formData.get("password"),
  });
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  registerMessage.textContent = "";
  registerMessage.classList.remove("message--success");
  const formData = new FormData(registerForm);
  registerUser({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
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

categoryModalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(categoryModalForm);
  addCategory(formData.get("categoryName"));
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

const today = new Date().toISOString().split("T")[0];
form.elements.date.value = today;

attachModalHandlers();
syncUI();
