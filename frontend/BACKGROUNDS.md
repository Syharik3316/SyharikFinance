# Фоновые изображения для карт

## Сценарий «Мой первый бизнес» (лимонад)

Фоны подставляются по номеру дня (1–30). Статика лежит в проекте.

1. Создайте папку **`frontend/public/backgrounds/lemonade/`**.
2. Положите туда изображения с именами **`day1.jpg`**, **`day2.jpg`**, … **`day30.jpg`** (формат может быть .webp или .png — тогда переименуйте в коде путь в `ScenarioBusiness.jsx` или назовите файлы day1.png и т.д.).
3. Экран «Начать» использует **`day1.jpg`**. Каждый игровой день использует **`dayN.jpg`** (N = номер дня).

Чтобы для отдельного дня использовать свой файл, в данных сценария у события можно задать `backgroundUrl` и `backgroundClassName` (по аналогии со сценарием «Велосипед»).

---

## Карта сценариев (главная карта квестов)

- **Файл:** положите изображение в папку `frontend/public/` с именем **`map-bg.jpg`** (или замените в коде на своё имя).
- **Где подключается:** в `frontend/src/styles/global.css` у класса `.play-page__map-wrap--bg` уже задано:
  ```css
  background-image: url('/map-bg.jpg');
  background-size: cover;
  background-position: center;
  ```
- Чтобы использовать другое имя (например `my-map.png`), замените в `global.css` строку:
  ```css
  background-image: url('/map-bg.jpg');
  ```
  на:
  ```css
  background-image: url('/my-map.png');
  ```
- Файлы из `public/` доступны по корневому пути: `/map-bg.jpg`, `/my-map.png` и т.д.

---

## Мини-игра «Остров сокровищ» (карта с зонами)

Сейчас у блока карты фона нет. Чтобы добавить фоновое изображение:

1. Положите картинку в `frontend/public/`, например **`island-map-bg.jpg`**.

2. В `frontend/src/styles/global.css` найдите класс **`.island-game-map-inner`** (или **`.island-game-map`**) и добавьте/измените стили:

   **Вариант для фона всей области карты:**
   ```css
   .island-game-map {
     background-image: url('/island-map-bg.jpg');
     background-size: cover;
     background-position: center;
   }
   ```

   **Вариант для фона только сетки зон:**
   ```css
   .island-game-map-inner {
     background-image: url('/island-map-bg.jpg');
     background-size: cover;
     background-position: center;
   }
   ```

3. При необходимости подстройте прозрачность зон (например, полупрозрачный фон у `.island-game-zone`), чтобы фон карты был виден.

---

## Итог

| Место                    | Файлы в `public/`                    | Где подключается                    |
|--------------------------|--------------------------------------|-------------------------------------|
| Карта сценариев          | `map-bg.jpg`                         | `.play-page__map-wrap--bg`          |
| Сценарий «Лимонад»       | `backgrounds/lemonade/day1.jpg` … `day30.jpg` | `ScenarioBusiness.jsx` (по дню)     |
| Карта мини-игры         | любой, например `island-map-bg.jpg`  | `.island-game-map` / `.island-game-map-inner` |

После добавления файла в `public/` перезапуск dev-сервера не обязателен — достаточно обновить страницу.
