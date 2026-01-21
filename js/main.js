// Глобальные переменные
let categories = [];
let cards = [];
let filteredCards = [];
let searchTimeout;

// DOM элементы
const categoriesList = document.getElementById("categoriesList");
const cardsGrid = document.getElementById("cardsGrid");
const cardModal = document.getElementById("cardModal");
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalDescription = document.getElementById("modalDescription");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

// Вспомогательные функции
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Обновление иконки темы
function updateThemeIcon() {
  const themeToggleIcon = document.querySelector("#themeToggle i");
  if (document.body.classList.contains("dark-theme")) {
    // В темной теме показываем солнце
    themeToggleIcon.classList.remove("fa-moon");
    themeToggleIcon.classList.add("fa-sun");
    document
      .getElementById("themeToggle")
      .setAttribute("aria-label", "Переключить на светлую тему");
  } else {
    // В светлой теме показываем луну
    themeToggleIcon.classList.remove("fa-sun");
    themeToggleIcon.classList.add("fa-moon");
    document
      .getElementById("themeToggle")
      .setAttribute("aria-label", "Переключить на темную тему");
  }
}

function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function getImagePath(imageName) {
  if (!imageName || imageName.trim() === "") {
    return "data/image/placeholder.png";
  }

  const trimmedName = imageName.trim();

  // Проверяем, является ли путь уже полным (URL или data URI)
  if (
    trimmedName.startsWith("http://") ||
    trimmedName.startsWith("https://") ||
    trimmedName.startsWith("data:")
  ) {
    return trimmedName;
  }

  // Если это просто имя файла, добавляем путь к папке
  if (!trimmedName.includes("/")) {
    return `data/image/${trimmedName}`;
  }

  return trimmedName;
}

function handleImageError(img) {
  // Если ошибка при загрузке локального изображения
  if (img.src.includes("data/image/")) {
    // Если это не placeholder, пытаемся загрузить placeholder
    if (!img.src.endsWith("placeholder.png")) {
      img.src = "data/image/placeholder.png";
      img.onerror = () => {
        // Если placeholder тоже не загрузился, показываем текстовый плейсхолдер
        showTextPlaceholder(img);
      };
    } else {
      // Если уже placeholder не загрузился
      showTextPlaceholder(img);
    }
  } else {
    // Для внешних ссылок пробуем локальный placeholder
    img.src = "data/image/placeholder.png";
    img.onerror = () => showTextPlaceholder(img);
  }
}

function showTextPlaceholder(img) {
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = "No Image";
  placeholder.style.cssText = `
    width: 100%;
    height: 100%;
    background: #2d3748;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    border-radius: 4px;
  `;

  // Заменяем изображение на placeholder
  if (img.parentNode) {
    img.parentNode.replaceChild(placeholder, img);
  }
}

// Проверяем расширение файла
function isValidImageExtension(filename) {
  if (!filename) return false;

  const validExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
  const lowerFilename = filename.toLowerCase();

  return validExtensions.some((ext) => lowerFilename.endsWith(ext));
}

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  // Восстанавливаем тему из localStorage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  updateThemeIcon(); // Устанавливаем правильную иконку при загрузке

  loadData();
  setupEventListeners();
});

// Загрузка данных
async function loadData() {
  try {
    showLoading();
    const response = await fetch("data/data.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    categories = data.categories || [];
    cards = data.cards || [];

    renderCategories();
    renderCards(cards);
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    cardsGrid.innerHTML = `
      <div class="error-message">
        <h3>Ошибка загрузки данных</h3>
        <p>Проверьте:</p>
        <ul>
          <li>Файл data/data.json существует</li>
          <li>Запущен локальный сервер (python -m http.server)</li>
          <li>JSON файл имеет правильный формат</li>
        </ul>
        <p><small>${error.message}</small></p>
      </div>
    `;
  }
}

function showLoading() {
  cardsGrid.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Загрузка данных...</p>
    </div>
  `;
}

// Рендер категорий
function renderCategories() {
  categoriesList.innerHTML = "";

  // Кнопка "Все"
  const allBtn = document.createElement("button");
  allBtn.className = "category-btn active";
  allBtn.textContent = "Все";
  allBtn.dataset.id = "all";
  allBtn.addEventListener("click", () => filterByCategory("all"));
  categoriesList.appendChild(allBtn);

  // Кнопки категорий
  categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.textContent = category.name;
    btn.dataset.id = category.id;
    btn.title = category.name;
    btn.addEventListener("click", () => filterByCategory(category.id));
    categoriesList.appendChild(btn);
  });
}

// Рендер карточек
function renderCards(cardsToRender) {
  cardsGrid.innerHTML = "";

  if (cardsToRender.length === 0) {
    cardsGrid.innerHTML = `
      <div class="no-results">
        <p>Карточки не найдены</p>
        <p><small>Попробуйте изменить поисковый запрос или выбрать другую категорию</small></p>
      </div>
    `;
    return;
  }

  cardsToRender.forEach((card) => {
    const category = categories.find((c) => c.id === card.categoryId);

    // Получаем путь к thumbnail изображению
    let thumbnailPath = "data/image/placeholder.png";
    if (card.thumbnail && card.thumbnail.trim()) {
      thumbnailPath = getImagePath(card.thumbnail);
    } else if (card.image && card.image.trim()) {
      thumbnailPath = getImagePath(card.image);
    }

    // Получаем путь к полному изображению для модального окна
    const fullImagePath =
      card.image && card.image.trim()
        ? getImagePath(card.image)
        : thumbnailPath;

    const cardElement = document.createElement("div");
    cardElement.className = "card elevation-1";
    cardElement.innerHTML = `
      <div class="card-image-container">
        <img src="${escapeHtml(thumbnailPath)}"
             alt="${escapeHtml(card.title || "Без названия")}"
             class="card-image"
             loading="lazy"
             data-full-image="${escapeHtml(fullImagePath)}">
      </div>
      <div class="card-content">
        <h3 class="card-title" title="${escapeHtml(card.title || "")}">
          ${escapeHtml(truncateText(card.title || "Без названия", 60))}
        </h3>
        ${
          category
            ? `<p class="card-category">${escapeHtml(category.name)}</p>`
            : ""
        }
        ${
          card.description
            ? `<p class="card-description">${escapeHtml(
                truncateText(card.description, 80)
              )}</p>`
            : ""
        }
      </div>
    `;

    // Обработчик ошибок изображения
    const img = cardElement.querySelector(".card-image");
    if (!isValidImageExtension(thumbnailPath)) {
      // Если расширение невалидное, сразу показываем placeholder
      handleImageError(img);
    } else {
      img.onerror = () => handleImageError(img);
    }

    cardElement.addEventListener("click", () => openCardModal(card));
    cardsGrid.appendChild(cardElement);
  });
}

// Фильтрация по категории
function filterByCategory(categoryId) {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(
    `.category-btn[data-id="${categoryId}"]`
  );
  if (activeBtn) {
    activeBtn.classList.add("active");
  } else {
    document
      .querySelector('.category-btn[data-id="all"]')
      .classList.add("active");
    categoryId = "all";
  }

  // Фильтруем карточки
  if (categoryId === "all") {
    filteredCards = [...cards];
  } else {
    filteredCards = cards.filter((card) => card.categoryId == categoryId);
  }

  // Применяем текущий поиск если есть
  const currentSearch = searchInput.value.trim();
  if (currentSearch) {
    const searchResults = filteredCards.filter(
      (card) =>
        (card.title &&
          card.title.toLowerCase().includes(currentSearch.toLowerCase())) ||
        (card.description &&
          card.description
            .toLowerCase()
            .includes(currentSearch.toLowerCase())) ||
        (card.content &&
          card.content.toLowerCase().includes(currentSearch.toLowerCase()))
    );
    renderCards(searchResults);
  } else {
    renderCards(filteredCards);
  }
}

// Открытие модального окна карточки
function openCardModal(card) {
  const category = categories.find((c) => c.id === card.categoryId);

  // Очищаем предыдущий контент
  modalTitle.innerHTML = escapeHtml(card.title || "Без названия");
  modalTitle.title = card.title || "";

  if (category) {
    const categorySpan = document.createElement("span");
    categorySpan.className = "modal-category";
    categorySpan.textContent = ` (${category.name})`;
    modalTitle.appendChild(categorySpan);
  } else if (card.categoryId) {
    const categorySpan = document.createElement("span");
    categorySpan.className = "modal-category";
    categorySpan.textContent = ` (Категория ID: ${card.categoryId})`;
    modalTitle.appendChild(categorySpan);
  }

  // Получаем путь к изображению для модального окна
  let modalImagePath = "data/image/placeholder.png";
  if (card.image && card.image.trim()) {
    modalImagePath = getImagePath(card.image);
  } else if (card.thumbnail && card.thumbnail.trim()) {
    modalImagePath = getImagePath(card.thumbnail);
  }

  modalImage.src = modalImagePath;
  modalImage.alt = card.title || "Изображение карточки";
  modalImage.onerror = () => {
    // При ошибке пробуем placeholder
    if (!modalImage.src.includes("placeholder.png")) {
      modalImage.src = "data/image/placeholder.png";
      modalImage.onerror = () => {
        modalImage.style.display = "none";
        const placeholder = document.createElement("div");
        placeholder.className = "modal-image-placeholder";
        placeholder.textContent = "Изображение не загружено";
        placeholder.style.cssText = `
          width: 100%;
          height: 300px;
          background: #2d3748;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border-radius: 8px;
          margin: 10px 0;
        `;
        modalImage.parentNode.insertBefore(placeholder, modalImage.nextSibling);
      };
    } else {
      modalImage.style.display = "none";
    }
  };
  modalImage.style.display = "block";

  modalDescription.textContent = card.description || "Нет описания";
  modalDescription.title = card.description || "";

  // Безопасное отображение HTML контента
  if (card.content && card.content.trim()) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = card.content;

    // Очищаем от потенциально опасных тегов
    const dangerousTags = [
      "script",
      "style",
      "link",
      "meta",
      "object",
      "embed",
      "applet",
      "frame",
      "iframe",
    ];
    dangerousTags.forEach((tag) => {
      tempDiv.querySelectorAll(tag).forEach((el) => el.remove());
    });

    // Добавляем базовые стили для контента
    tempDiv.classList.add("modal-content-text");
    modalContent.innerHTML = "";
    modalContent.appendChild(tempDiv);
  } else {
    modalContent.innerHTML =
      '<p class="modal-content-text">Подробная информация отсутствует</p>';
  }

  cardModal.style.display = "flex";
  document.body.style.overflow = "hidden";
  cardModal.focus();
}

// Поиск
function performSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const activeCategory = document.querySelector(".category-btn.active");
  const categoryId = activeCategory ? activeCategory.dataset.id : "all";

  let results =
    categoryId === "all"
      ? [...cards]
      : cards.filter((card) => card.categoryId == categoryId);

  if (query) {
    results = results.filter(
      (card) =>
        (card.title && card.title.toLowerCase().includes(query)) ||
        (card.description && card.description.toLowerCase().includes(query)) ||
        (card.content && card.content.toLowerCase().includes(query)) ||
        (card.tags &&
          Array.isArray(card.tags) &&
          card.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }

  renderCards(results);
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Закрытие модального окна
  closeModal.addEventListener("click", closeModalHandler);

  // Закрытие по клику вне окна
  cardModal.addEventListener("click", (e) => {
    if (e.target === cardModal) {
      closeModalHandler();
    }
  });

  // Поиск
  searchBtn.addEventListener("click", () => {
    clearTimeout(searchTimeout);
    performSearch();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 300);
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimeout);
      performSearch();
    }
  });

  // Закрытие по ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cardModal.style.display === "flex") {
      closeModalHandler();
    }
  });

  // Очистка поиска при клике на крестик (если добавите)
  searchInput.addEventListener("search", () => {
    if (!searchInput.value.trim()) {
      clearTimeout(searchTimeout);
      performSearch();
    }
  });
}

function closeModalHandler() {
  cardModal.style.display = "none";
  document.body.style.overflow = "auto";
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-theme") ? "dark" : "light"
  );
  updateThemeIcon(); // Добавляем вызов функции обновления иконки
}

// Инициализация темы
document.getElementById("themeToggle").addEventListener("click", toggleTheme);
