import React, { useEffect, useRef, useState } from 'react';
import ScenarioStage from '../components/ScenarioStage.jsx';

// Сценарий «Мой первый бизнес»: 30 дней, цель 5000 монет на смартфон.
// Стартовый капитал 1500. Ежедневный доход от популярности + сюжетные выборы. Реально дойти до 5к.
const DAYS_BASE = [
  {
    day: 1,
    title: 'Выбор места',
    text: 'Утром ты решаешь, где поставить киоск. От места зависят аренда и поток людей.',
    choices: [
      { label: 'У входа в парк — много прохожих, аренда 150 монет в день', delta: -150, popularityDelta: 12, comment: 'Место бойкое, народ замечает киоск. Популярность растёт.', hint: 'Высокая аренда часто окупается большим потоком.', outro: 'Аренда — постоянный расход. Умение оценить, окупится ли он выручкой, отличает успешный бизнес.' },
      { label: 'Подальше, у скамеек — аренда 40 монет, людей меньше', delta: -40, popularityDelta: 2, comment: 'Тише, но и выручка скромнее. Зато экономнее.', hint: 'Дешевле — не всегда выгоднее в итоге.', outro: 'Низкие расходы не всегда дают большую прибыль: важно, сколько людей готовы купить.' },
    ],
  },
  {
    day: 2,
    title: 'Закупка ингредиентов',
    text: 'Нужно купить лимоны, сахар и стаканы. Можно взять подороже (качество) или подешевле.',
    choices: [
      { label: 'Качественные продукты — дороже, но клиенты довольны', delta: -140, popularityDelta: 10, comment: 'Лимонад получился вкусный. Гости хвалят.', hint: 'Качество продукта влияет на репутацию.', outro: 'Качество часто окупается повторными покупками и хорошей репутацией.' },
      { label: 'Эконом-вариант — сэкономишь, но вкус средний', delta: -60, popularityDelta: -2, comment: 'Сэкономил, но отзывы так себе.', hint: 'Слишком большая экономия может отпугнуть клиентов.', outro: 'Баланс цены и качества — основа устойчивого дохода.' },
    ],
  },
  {
    day: 3,
    title: 'Погода испортилась',
    text: 'Начался дождь. Посетителей почти нет. Что делать?',
    choices: [
      { label: 'Снизить цену вдвое, чтобы хоть что-то продать', delta: 70, popularityDelta: -2, comment: 'Часть остатков продал. Выручка скромная, но есть.', hint: 'Распродажа по низкой цене лучше, чем вылить товар.', outro: 'Распродажа помогает вернуть часть денег. Это один из способов управлять рисками.' },
      { label: 'Закрыться на день и не тратить товар', delta: 0, popularityDelta: 0, comment: 'День потерян, зато ингредиенты целы.', hint: 'Иногда сохранить ресурсы важнее.', outro: 'Сохранить ресурсы на потом — тоже решение.' },
      { label: 'Акция "Горячий чай с лимоном" — доп. затраты 80 монет', delta: -80, popularityDelta: 14, comment: 'В дождь чай разошёлся на ура! Выручка +180.', hint: 'Адаптация к обстоятельствам приносит результат.', outro: 'Гибкость — навык предпринимателя.' },
    ],
  },
  {
    day: 4,
    title: 'Первый постоянный клиент',
    text: 'Мальчик из соседнего дома приходит каждый день и советует тебя друзьям.',
    choices: [
      { label: 'Дать ему скидку 10% — пусть рассказывает другим', delta: -10, popularityDelta: 18, comment: 'Он привёл целую компанию. Популярность выросла.', hint: 'Лояльность клиентов — бесплатная реклама.', outro: 'Небольшая скидка постоянному клиенту может принести новых. Сарафанное радио.' },
      { label: 'Поблагодарить и ничего не менять', delta: 0, popularityDelta: 6, comment: 'Он всё равно заходит. Неплохо.', hint: 'Маленькие жесты иногда окупаются.', outro: 'Хорошее отношение создаёт лояльность.' },
    ],
  },
  {
    day: 5,
    title: 'Конкурент открылся рядом',
    text: 'Прямо напротив твоего киоска открыли такой же. Что делать?',
    choices: [
      { label: 'Ценовая война — снизить цену до минимума', delta: 50, popularityDelta: 12, comment: 'Клиенты пошли к тебе, но прибыль с одной чашки меньше.', hint: 'Ценовая война бьёт по прибыли обоих.', outro: 'Конкуренция за счёт цены часто уменьшает прибыль у всех.' },
      { label: 'Уникальное предложение — наклейки к стакану (40 монет)', delta: -40, popularityDelta: 18, comment: 'Наклейки понравились! Ты выделился.', hint: 'Уникальность важнее гонки цен.', outro: 'Уникальное предложение выделяет среди конкурентов.' },
      { label: 'Договориться с конкурентом, поделить ассортимент', delta: 30, popularityDelta: 10, comment: 'Вы договорились. Оба в плюсе.', hint: 'Переговоры могут быть выгоднее конфликта.', outro: 'Умение договариваться — важный навык.' },
    ],
  },
  {
    day: 6,
    title: 'Жара',
    text: 'Небывалая жара. Все мечтают о холодном лимонаде. Спрос огромный!',
    choices: [
      { label: 'Поднять цену — спрос высокий', delta: 200, popularityDelta: -4, comment: 'Заработал, но часть людей ушла к конкуренту.', hint: 'Завышенная цена может оттолкнуть.', outro: 'Репутация важна.' },
      { label: 'Оставить цену, сделать больше стаканов', delta: 320, popularityDelta: 12, comment: 'Честная цена — очередь к тебе. Отличный день!', hint: 'Честность и объём иногда выгоднее наценки.', outro: 'Честная цена и объём часто приносят больше дохода.' },
    ],
  },
  {
    day: 7,
    title: 'Пришёл проверяющий',
    text: 'Санитарная инспекция хочет проверить твою точку.',
    choices: [
      { label: 'Предъявить документы и показать чистоту', delta: 0, popularityDelta: 6, comment: 'Проверка пройдена. Всё по правилам.', hint: 'Честное ведение дела защищает от рисков.', outro: 'Вести дело по правилам — защита от штрафов.' },
      { label: 'Дать взятку 250 монет (риск)', delta: -250, popularityDelta: -12, comment: 'Рискованно. Лучше так не делать.', hint: 'Взятка — преступление и риск.', outro: 'Легальное ведение бизнеса надёжнее.' },
      { label: 'Закрыться на день "под ремонт"', delta: 0, popularityDelta: 0, comment: 'День потерян, зато проверки избежал.', hint: 'Иногда отложить — не худший вариант.', outro: 'Лучше заранее готовиться к проверкам.' },
    ],
  },
  {
    day: 8,
    title: 'Совет от бабушки',
    text: 'Бабушка предлагает свой секретный рецепт лимонада за 80 монет.',
    choices: [
      { label: 'Купить рецепт', delta: -80, popularityDelta: 18, comment: 'Рецепт сработал! Очередь выстроилась.', hint: 'Инвестиция в качество окупается.', outro: 'Инвестиция в продукт окупается ростом продаж.' },
      { label: 'Отказаться — у меня и так хорошо', delta: 0, popularityDelta: 0, comment: 'Ты остался при своих.', hint: 'Иногда новые идеи стоят небольших вложений.', outro: 'Небольшие вложения иногда дают большой результат.' },
    ],
  },
  {
    day: 9,
    title: 'Фестиваль в парке',
    text: 'В парке фестиваль — людей в разы больше. Закупить ли много товара вперёд?',
    choices: [
      { label: 'Закупить на 180 монет и продавать активно', delta: -180, popularityDelta: 8, comment: 'Продал почти всё. Выручка +420. Отличный день!', hint: 'Умение оценить спрос приносит прибыль.', outro: 'Готовность рискнуть в удачный день приносит прибыль.' },
      { label: 'Работать как обычно, не рисковать', delta: 90, popularityDelta: 3, comment: 'Продал столько, сколько было. Стабильно.', hint: 'Консервативная стратегия тоже имеет право на жизнь.', outro: 'Выбор между риском и стабильностью — часть планирования.' },
    ],
  },
  {
    day: 10,
    title: 'Поломка холодильника',
    text: 'Портативный холодильник сломался. Лёд тает, лимонад теплеет.',
    choices: [
      { label: 'Срочно починить — 120 монет', delta: -120, popularityDelta: 0, comment: 'Починил. Работа идёт дальше.', hint: 'Техника — часть расходов бизнеса.', outro: 'Резервный фонд помогает на ремонт.' },
      { label: 'Продавать тёплый лимонад со скидкой', delta: 50, popularityDelta: -6, comment: 'Часть продал, но репутация пострадала.', hint: 'Качество продукта нельзя терять надолго.', outro: 'Качество напрямую влияет на репутацию.' },
    ],
  },
  {
    day: 11,
    title: 'Предложение от друга',
    text: 'Друг готов помогать за 70 монет в день. С ним успеешь обслужить больше клиентов.',
    choices: [
      { label: 'Нанять помощника на день', delta: -70, popularityDelta: 14, comment: 'Вдвоём обслужили в полтора раза больше. Выручка +220.', hint: 'Инвестиция в людей может увеличить доход.', outro: 'Если выручка растёт больше затрат — бизнес расширяется.' },
      { label: 'Справляться сам', delta: 0, popularityDelta: 0, comment: 'Работаешь один. Как обычно.', hint: 'Расширение — это выбор и риск.', outro: 'Важно считать: окупится ли новый расход.' },
    ],
  },
  {
    day: 12,
    title: 'Реклама в соцсетях',
    text: 'Можно заплатить 50 монет за рекламный пост в местной группе парка.',
    choices: [
      { label: 'Заказать рекламу', delta: -50, popularityDelta: 20, comment: 'Пост сработал — пришли новые клиенты. Выручка выросла.', hint: 'Маркетинг увеличивает узнаваемость.', outro: 'Реклама — способ привлечь клиентов.' },
      { label: 'Сэкономить, не рекламировать', delta: 0, popularityDelta: 0, comment: 'Обходишься без рекламы.', hint: 'Реклама — способ привлечь клиентов.', outro: 'Тратить на рекламу осознанно.' },
    ],
  },
  {
    day: 13,
    title: 'Жалоба на очередь',
    text: 'Кто-то пожаловался, что у тебя долгая очередь и мешает проходу.',
    choices: [
      { label: 'Сделать вторую стойку — доп. 80 монет', delta: -80, popularityDelta: 12, comment: 'Очередь раздвоилась. Все довольны. Продажи выросли.', hint: 'Удобство клиентов = лояльность.', outro: 'Инвестиция в сервис окупается.' },
      { label: 'Ничего не менять', delta: 0, popularityDelta: -5, comment: 'Продолжаешь как есть. Кто-то недоволен.', hint: 'Игнорирование жалоб может стоить репутации.', outro: 'Учёт мнения людей важен для бизнеса.' },
    ],
  },
  {
    day: 14,
    title: 'Середина первой половины',
    text: 'Неделя с лишним позади. Киоск приносит стабильный доход. Сегодня обычный день с хорошим потоком.',
    choices: [
      { label: 'Работать в полную силу', delta: 180, popularityDelta: 5, comment: 'Хороший день. Клиенты довольны.', hint: 'Стабильность приносит результат.', outro: 'Регулярная работа — основа дохода.' },
      { label: 'Сделать скидку "друзьям" — привлечь новых', delta: 120, popularityDelta: 12, comment: 'Меньше прибыли с чашки, но пришло больше людей.', hint: 'Скидки могут привлечь постоянных клиентов.', outro: 'Баланс между ценой и количеством клиентов.' },
    ],
  },
  {
    day: 15,
    title: 'Две недели — итоги',
    text: 'Две недели киоска позади. Ты уже набрался опыта. Впереди ещё две недели до цели!',
    choices: [
      { label: 'Закупиться получше и готовиться к финальному рывку', delta: -100, popularityDelta: 8, comment: 'Вложился в качество. Следующие дни обещают быть удачными.', hint: 'Инвестиция в запасы окупается.', outro: 'Планирование закупок — часть успеха.' },
      { label: 'Продать остатки и подвести промежуточный итог', delta: 140, popularityDelta: 2, comment: 'Хорошая выручка. Продолжим завтра.', hint: 'Регулярные итоги помогают планировать.', outro: 'Считать прибыль полезно на любом этапе.' },
    ],
  },
];

// Рандомные события для дней 16–30 (каждый запуск выбирается 5 случайных)
const BUSINESS_RANDOM_EVENTS = [
  {
    title: 'Спонтанный флешмоб',
    text: 'В парке неожиданно начался флешмоб. Толпа хочет пить — все бегут к киоскам.',
    choices: [
      { label: 'Быстро подготовить двойную партию', delta: 250, popularityDelta: 8, comment: 'Успел! Продал всё. Невероятный день.', hint: 'Умение реагировать на ситуацию.', outro: 'Готовность к неожиданному спросу приносит прибыль.' },
      { label: 'Продавать как обычно', delta: 120, popularityDelta: 2, comment: 'Продал столько, сколько было.', hint: 'Не всегда можно предугадать.', outro: 'Стабильность тоже ценна.' },
    ],
  },
  {
    title: 'Блогер снимает обзор',
    text: 'К твоему киоску подошёл блогер и снимает обзор. Если понравится — покажет подписчикам.',
    choices: [
      { label: 'Угостить бесплатно и рассказать про рецепт', delta: -30, popularityDelta: 22, comment: 'Блогер похвалил! Подписчики пообещали зайти.', hint: 'Пиар иногда дороже одной порции.', outro: 'Инвестиция в репутацию окупается.' },
      { label: 'Продать как обычному клиенту', delta: 25, popularityDelta: 5, comment: 'Он купил и ушёл. Ничего особенного.', hint: 'Каждый сам решает.', outro: 'Честность — тоже стратегия.' },
    ],
  },
  {
    title: 'Соседний киоск закрылся',
    text: 'Конкурент рядом не выдержал и закрылся. Его клиенты ищут, где купить лимонад.',
    choices: [
      { label: 'Принять всех — закупить ещё', delta: -60, popularityDelta: 15, comment: 'Новые постоянные клиенты. Выручка +200.', hint: 'Момент расширения.', outro: 'Когда конкуренция уходит — важно не упустить шанс.' },
      { label: 'Работать в обычном режиме', delta: 100, popularityDelta: 8, comment: 'Часть клиентов перешла к тебе и так.', hint: 'Рост без лишних затрат.', outro: 'Иногда достаточно быть на месте.' },
    ],
  },
  {
    title: 'Жара снова',
    text: 'Опять зной. Очередь к твоему киоску с утра.',
    choices: [
      { label: 'Поднять объём продаж, не поднимая цену', delta: 280, popularityDelta: 10, comment: 'Честная цена — все к тебе. Отличный день!', hint: 'Объём и репутация.', outro: 'Долгосрочная репутация важнее сиюминутной наценки.' },
      { label: 'Чуть поднять цену', delta: 180, popularityDelta: -3, comment: 'Заработал, но кто-то ворчал.', hint: 'Цена и лояльность.', outro: 'Баланс цены и количества клиентов.' },
    ],
  },
  {
    title: 'Школьная экскурсия',
    text: 'В парк пришла школьная экскурсия. Учитель спрашивает: можно оптом со скидкой?',
    choices: [
      { label: 'Дать скидку 20% на 30 стаканов', delta: 180, popularityDelta: 12, comment: 'Дети довольны, учитель порекомендовал тебя другим.', hint: 'Опт и репутация.', outro: 'Оптовые сделки и сарафанное радио.' },
      { label: 'Продавать по обычной цене', delta: 220, popularityDelta: 2, comment: 'Купили меньше, но полная выручка.', hint: 'Цена или объём.', outro: 'Выбор между объёмом и маржой.' },
    ],
  },
  {
    title: 'Поломка зонтика',
    text: 'От солнца сломался зонтик над стойкой. Клиенты жалуются на жару в очереди.',
    choices: [
      { label: 'Купить новый зонт — 90 монет', delta: -90, popularityDelta: 6, comment: 'Тень вернулась. Очередь снова растёт.', hint: 'Удобство клиентов.', outro: 'Мелкие вложения в комфорт окупаются.' },
      { label: 'Пока обойтись без зонта', delta: 40, popularityDelta: -5, comment: 'Часть клиентов ушла. Выручка упала.', hint: 'Комфорт влияет на продажи.', outro: 'Экономия на комфорте может стоить выручки.' },
    ],
  },
  {
    title: 'Предложение от сети кафе',
    text: 'Представитель сети кафе предлагает купить твой рецепт за 400 монет разово.',
    choices: [
      { label: 'Продать рецепт', delta: 400, popularityDelta: -5, comment: 'Получил деньги, но рецепт теперь не эксклюзив.', hint: 'Разовый доход vs долгосрочная уникальность.', outro: 'Продажа актива — решение с последствиями.' },
      { label: 'Отказаться — рецепт твоя фишка', delta: 0, popularityDelta: 10, comment: 'Сохранил уникальность. Клиенты ценят.', hint: 'Уникальность как капитал.', outro: 'Иногда сохранить актив выгоднее продажи.' },
    ],
  },
  {
    title: 'Дождь в разгар дня',
    text: 'Неожиданно пошёл дождь. Осталось много непроданного лимонада.',
    choices: [
      { label: 'Акция "Тёплый чай" — доп. затраты 60', delta: -60, popularityDelta: 14, comment: 'Чай разошёлся. Минимизировал потери.', hint: 'Адаптация к погоде.', outro: 'Гибкость спасает от потерь.' },
      { label: 'Распродать холодный по скидке', delta: 55, popularityDelta: -2, comment: 'Часть продал. Остальное пришлось вылить.', hint: 'Распродажа лучше потерь.', outro: 'Частичная выручка лучше нуля.' },
    ],
  },
];

// Новый сюжет: дни 16–30 (10 сюжетных + 5 слотов под рандом)
const DAYS_PLOT_16_30 = [
  {
    day: 16,
    title: 'Третья неделя стартует',
    text: 'Началась третья неделя. Киоск уже узнают. Решаешь, как действовать дальше.',
    choices: [
      { label: 'Расширить ассортимент — морс (+50 к закупке)', delta: -50, popularityDelta: 12, comment: 'Морс пошёл на ура. Выручка растёт.', hint: 'Новый продукт привлекает.', outro: 'Расширение ассортимента — способ увеличить выручку.' },
      { label: 'Оставить только лимонад', delta: 130, popularityDelta: 3, comment: 'Работаешь как обычно. Стабильно.', hint: 'Простота тоже плюс.', outro: 'Не всегда нужно усложнять.' },
    ],
  },
  {
    day: 17,
    title: 'Постоянный клиент стал другом',
    text: 'Тот самый мальчик теперь помогает бесплатно расклеивать объявления. Людей приходит больше.',
    choices: [
      { label: 'Поблагодарить и угостить каждый день', delta: -20, popularityDelta: 18, comment: 'Он вдохновлён. Приводит целые компании.', hint: 'Благодарность окупается.', outro: 'Лояльность клиентов бесценна.' },
      { label: 'Просто сказать спасибо', delta: 80, popularityDelta: 8, comment: 'Он рад. Продолжает помогать словом.', hint: 'Искренность важна.', outro: 'Деньги не единственная благодарность.' },
    ],
  },
  {
    day: 18,
    title: 'Журналист из газеты',
    text: 'Журналист пишет статью про летний бизнес школьников. Хочет взять у тебя интервью.',
    choices: [
      { label: 'Дать интервью и угостить', delta: -25, popularityDelta: 25, comment: 'Статья вышла! К киоску выстроилась очередь.', hint: 'Пиар в СМИ.', outro: 'Одна статья может принести много клиентов.' },
      { label: 'Отказаться — стесняешься', delta: 60, popularityDelta: 0, comment: 'Работаешь без публичности.', hint: 'Каждый решает сам.', outro: 'Выход из зоны комфорта — выбор.' },
    ],
  },
  {
    day: 19,
    title: 'Жара без конца',
    text: 'Третья неделя жары. Лимонад разлетается. Запасы заканчиваются к полудню.',
    choices: [
      { label: 'Утром докупить ингредиентов на 100', delta: -100, popularityDelta: 5, comment: 'Успел продать всё. Выручка +380.', hint: 'Спрос и предложение.', outro: 'Подстройка под спрос увеличивает прибыль.' },
      { label: 'Продать то, что есть', delta: 200, popularityDelta: 0, comment: 'К полудню всё закончилось. Кто-то ушёл без покупки.', hint: 'Ограниченный запас.', outro: 'Не всегда можно угнаться за спросом.' },
    ],
  },
  {
    day: 20,
    title: 'Родители предлагают помощь',
    text: 'Родители видят, что ты устаёшь. Готовы дать 150 монет на помощника на неделю.',
    choices: [
      { label: 'Взять и нанять друга на пару дней', delta: -80, popularityDelta: 14, comment: 'Вдвоём успеваете больше. Выручка выросла.', hint: 'Помощь и масштаб.', outro: 'Принятие помощи — не слабость, а умение.' },
      { label: 'Отказаться — справлюсь сам', delta: 110, popularityDelta: 2, comment: 'Работаешь один. Гордишься собой.', hint: 'Самостоятельность.', outro: 'Выбор между гордостью и эффективностью.' },
    ],
  },
  {
    day: 21,
    title: 'Финальная неделя',
    text: 'Осталась последняя неделя. Цель — 5000 монет — уже близко. Нужен последний рывок.',
    choices: [
      { label: 'Мега-закупка и акция "Два по цене одного" в выходные', delta: -120, popularityDelta: 20, comment: 'В выходные очередь не кончалась. Огромная выручка.', hint: 'Финальный рывок.', outro: 'Планирование финального спурта окупается.' },
      { label: 'Работать стабильно без риска', delta: 160, popularityDelta: 5, comment: 'Стабильные продажи. Меньше стресса.', hint: 'Стабильность до конца.', outro: 'Предсказуемость снижает риск.' },
    ],
  },
  {
    day: 22,
    title: 'Суббота — пик сезона',
    text: 'Суббота, солнце, парк полон. Идеальный день для рекорда.',
    choices: [
      { label: 'Работать с утра до вечера без перерыва', delta: 350, popularityDelta: 8, comment: 'Рекордный день! Устал, но касса полная.', hint: 'Труд и результат.', outro: 'Пиковые дни дают основную выручку.' },
      { label: 'Работать в обычном режиме', delta: 200, popularityDelta: 3, comment: 'Хороший день. Без перегрузок.', hint: 'Здоровье тоже важно.', outro: 'Баланс работы и отдыха.' },
    ],
  },
  {
    day: 23,
    title: 'Воскресный пикник',
    text: 'В парке пикник — семьи заказывают лимонад пачками. Можно сделать "семейный набор".',
    choices: [
      { label: 'Ввести "Семейный набор" — 4 стакана со скидкой', delta: 220, popularityDelta: 15, comment: 'Семьи довольны. Много продал.', hint: 'Семейный сегмент.', outro: 'Специальные предложения под сегмент клиентов.' },
      { label: 'Продавать по одному стакану', delta: 140, popularityDelta: 4, comment: 'Продажи хорошие, но можно было больше.', hint: 'Упущенная выгода.', outro: 'Форматы под спрос увеличивают выручку.' },
    ],
  },
  {
    day: 24,
    title: 'Предпоследний день',
    text: 'Завтра закрытие сезона. Сегодня последний полный день продаж.',
    choices: [
      { label: 'Распродать всё по скидке — очистить запасы', delta: 180, popularityDelta: 10, comment: 'Остатки распроданы. Ничего не пропало.', hint: 'Управление остатками.', outro: 'Распродажа в конце — норма практики.' },
      { label: 'Продавать по обычной цене', delta: 150, popularityDelta: 2, comment: 'Часть остатков завтра придётся вылить.', hint: 'Остатки и потери.', outro: 'Баланс между ценой и потерями.' },
    ],
  },
  {
    day: 25,
    title: 'Предпоследний день',
    text: 'Завтра последний день. Сегодня ещё можно заработать и распродать остатки.',
    choices: [
      { label: 'Акция "Всё по полцены" на остатки', delta: 160, popularityDelta: 8, comment: 'Очередь до вечера. Остатки распроданы.', hint: 'Финал сезона.', outro: 'Распродажа остатков — норма практики.' },
      { label: 'Продавать как обычно', delta: 130, popularityDelta: 2, comment: 'Стабильный день.', hint: 'Предсказуемость.', outro: 'Баланс цены и потерь.' },
    ],
  },
  {
    day: 27,
    title: 'Воскресный пик',
    text: 'Воскресенье, последние выходные сезона. Парк полон. Последний большой день.',
    choices: [
      { label: 'Работать на полную', delta: 320, popularityDelta: 6, comment: 'Рекордный день! Касса полная.', hint: 'Последний рывок.', outro: 'Пиковые дни дают основную выручку.' },
      { label: 'Сокращённый день — устал', delta: 180, popularityDelta: 2, comment: 'Хорошая выручка без перегрузки.', hint: 'Здоровье важно.', outro: 'Баланс работы и отдыха.' },
    ],
  },
  {
    day: 28,
    title: 'Понедельник — тихий день',
    text: 'Понедельник, людей меньше. Можно подвести предварительные итоги.',
    choices: [
      { label: 'Продать остатки и считать итог', delta: 100, popularityDelta: 0, comment: 'Спокойный день. Почти финиш.', hint: 'Финальная прямая.', outro: 'Подведение итогов — часть опыта.' },
      { label: 'Закупиться на последний день', delta: -50, popularityDelta: 4, comment: 'Завтра последний шанс продать.', hint: 'Планирование.', outro: 'Последний день тоже может принести выручку.' },
    ],
  },
  {
    day: 30,
    title: 'Последний день сезона',
    text: 'Каникулы заканчиваются. Сегодня ты закрываешь киоск и считаешь итоги.',
    choices: [
      { label: 'Продать остатки и подвести итог', delta: 140, popularityDelta: 0, comment: 'Киоск закрыт. Время считать прибыль!', hint: 'Финал и итоги.', outro: 'Итог бизнеса — выручка минус расходы.' },
    ],
  },
];

// Собираем 30 дней: 15 базовых + 5 рандомных + 10 сюжетных (рандом в слотах 16,19,22,26,29)
function buildBusinessDays() {
  const shuffled = [...BUSINESS_RANDOM_EVENTS].sort(() => Math.random() - 0.5);
  const randomSlots = [16, 19, 22, 26, 29];
  const plotIndexByDay = { 17: 0, 18: 1, 20: 2, 21: 3, 23: 4, 24: 5, 25: 6, 27: 10, 28: 11, 30: 12 };
  const result = [...DAYS_BASE];
  let r = 0;
  for (let d = 16; d <= 30; d++) {
    if (randomSlots.includes(d)) {
      result.push({ ...shuffled[r++], day: d });
    } else {
      const plotIdx = plotIndexByDay[d];
      if (plotIdx !== undefined) result.push({ ...DAYS_PLOT_16_30[plotIdx], day: d });
    }
  }
  return result;
}

export default function ScenarioBusiness({
  apiBase,
  apiFetch,
  user,
  scenario,
  difficulty,
  onBackToMap,
}) {
  const maxDays = scenario.maxDays ?? 30;
  const goal = scenario.goal || 5000;
  const startCapital = scenario.baseBudget || 1500;
  const [loading, setLoading] = useState(true);
  const [saveInfo, setSaveInfo] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [budget, setBudget] = useState(startCapital);
  const [popularity, setPopularity] = useState(20);
  const [comment, setComment] = useState('');
  const [finished, setFinished] = useState(false);
  const [resultText, setResultText] = useState('');
  const [phase, setPhase] = useState('context');
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const [businessDays, setBusinessDays] = useState([]);
  const typingTimer = useRef(null);
  const fullTextRef = useRef('');

  const INTRO_TEXT = `Лето! У тебя появилась отличная идея — открыть свой киоск с лимонадом в парке. У тебя есть стартовый капитал ${startCapital} монет. Нужно закупить инвентарь, ингредиенты, выбрать место и, может быть, нанять помощника. Погода переменчива, конкуренты не дремлют, но бывают и удачные дни. Сможешь ли ты заработать на смартфон за ${goal} монет? У тебя ${maxDays} дней.`;
  const DAYS = businessDays.length === maxDays ? businessDays : [...DAYS_BASE];
  const currentEvent = DAYS[dayIndex] || DAYS[DAYS.length - 1];
  const currentDay = currentEvent.day;
  const isExpert = difficulty === 'expert';
  const characterName = user?.name || user?.login || 'Игрок';

  const startTypewriter = (text) => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    typingTimer.current = null;
    fullTextRef.current = text;
    setTypedText('');
    setIsTyping(true);
    let i = 0;
    typingTimer.current = setInterval(() => {
      i += 1;
      setTypedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
        setIsTyping(false);
      }
    }, 40);
  };

  const revealAll = () => {
    if (!typingTimer.current) return;
    clearInterval(typingTimer.current);
    typingTimer.current = null;
    setTypedText(fullTextRef.current);
    setIsTyping(false);
  };

  useEffect(() => {
    let alive = true;
    async function initRun() {
      try {
        setLoading(true);
        const r1 = await apiFetch(`${apiBase}/runs/${scenario.code}`);
        let run = r1.ok ? await r1.json() : null;
        if (!run) {
          const r2 = await apiFetch(`${apiBase}/runs/start`, {
            method: 'POST',
            body: JSON.stringify({ scenarioCode: scenario.code }),
          });
          run = await r2.json();
        }
        if (!alive) return;
        const state = run.state || {};
        setDayIndex(Math.min(Number(run.dayIndex || 0), maxDays - 1));
        setBudget(Number.isFinite(run.budget) ? run.budget : startCapital);
        setPopularity(Math.max(0, Math.min(100, state.popularity ?? 20)));
        setIntroSeen(Boolean(state.introSeen));
        if (state.businessDays && Array.isArray(state.businessDays) && state.businessDays.length === maxDays) {
          setBusinessDays(state.businessDays);
        } else {
          setBusinessDays(buildBusinessDays());
        }
        setPhase('context');
      } finally {
        if (alive) setLoading(false);
      }
    }
    initRun();
    return () => { alive = false; };
  }, [apiBase, apiFetch, scenario.code, startCapital, maxDays]);

  useEffect(() => {
    if (introSeen) {
      setPhase('context');
      setComment('');
      startTypewriter(`${currentEvent.title}\n\n${currentEvent.text}`);
    }
    return () => { if (typingTimer.current) clearInterval(typingTimer.current); };
  }, [dayIndex, introSeen]);

  const saveRun = async (nextDayIndex, nextBudget, nextPopularity, daysToSave = null) => {
    const daysForState = daysToSave ?? (businessDays.length === maxDays ? businessDays : null);
    try {
      setSaveInfo('Сохраняем...');
      const res = await apiFetch(`${apiBase}/runs/save`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          dayIndex: nextDayIndex,
          budget: nextBudget,
          earned: 0,
          spent: 0,
          state: {
            popularity: nextPopularity,
            introSeen: true,
            businessDays: daysForState,
          },
        }),
      });
      if (res && res.ok) setSaveInfo('Сохранено');
    } catch {
      setSaveInfo('');
    } finally {
      setTimeout(() => setSaveInfo(''), 900);
    }
  };

  const finishScenario = async (finalBudget) => {
    const profit = finalBudget - startCapital;
    const passed = finalBudget >= goal;
    let text =
      passed
        ? `Ты заработал(а) ${finalBudget} монет! Цель (${goal} на смартфон) достигнута. Прибыль за каникулы: +${profit} монет. Ты узнал(а), что бизнес — это вложения, риск и награда.`
        : finalBudget >= startCapital
        ? `Итог: ${finalBudget} монет. Прибыль +${finalBudget - startCapital}, но до смартфона не хватило. Ты приобрёл(а) опыт: аренда, конкуренция, маркетинг — всё это часть предпринимательства.`
        : `Итог: ${finalBudget} монет. Убыток ${startCapital - finalBudget}. Бизнес — это риск: не всегда получается с первого раза. Зато ты узнал(а) про себестоимость, спрос и конкуренцию.`;
    setFinished(true);
    setResultText(text);
    setPhase('result');
    startTypewriter(text);
    try {
      await apiFetch(`${apiBase}/runs/finish`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          status: passed ? 'passed' : 'failed',
          finalBudget: finalBudget,
          earned: finalBudget - startCapital,
          spent: startCapital,
        }),
      });
    } catch {}
    if (passed) setTimeout(() => setShowUnlock(true), 450);
  };

  const speakText = (t) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ru-RU';
    window.speechSynthesis.speak(u);
  };

  const handleChoice = (choice) => {
    const baseDelta = choice.delta || 0;
    // Ежедневный доход от киоска: тем выше, чем выше популярность (реально дойти до 5к за 30 дней)
    const dailyIncome = Math.round(25 + (popularity / 100) * 60);
    const popularityBonus = baseDelta > 0 ? Math.round((popularity / 100) * Math.max(15, baseDelta * 0.4)) : 0;
    const effectiveDelta = baseDelta + popularityBonus + dailyIncome;
    const newBudget = budget + effectiveDelta;
    const newPopularity = Math.max(0, Math.min(100, popularity + (choice.popularityDelta || 0)));
    setBudget(newBudget);
    setPopularity(newPopularity);
    const commentLine = choice.comment || '';
    const dailyLine = `\n\nДневная выручка киоска: +${dailyIncome} монет.`;
    const bonusLine = popularityBonus > 0 ? ` Бонус от популярности: +${popularityBonus}.` : '';
    const outroLine = choice.outro ? `\n\n💡 ${choice.outro}` : '';
    setComment(commentLine + dailyLine + bonusLine + outroLine);
    setPhase('result');
    startTypewriter(commentLine + bonusLine + outroLine);

    const nextIndex = dayIndex + 1;
    if (nextIndex >= maxDays) {
      finishScenario(newBudget);
    } else {
      setTimeout(() => setDayIndex(nextIndex), 0);
      saveRun(nextIndex, newBudget, newPopularity);
    }
  };

  const exitScenario = async () => {
    try {
      await apiFetch(`${apiBase}/runs/save`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          dayIndex,
          budget,
          earned: 0,
          spent: 0,
          state: { popularity, introSeen, businessDays: businessDays.length === maxDays ? businessDays : undefined },
        }),
      });
    } catch {}
    onBackToMap();
  };

  if (loading) return <div className="text-muted">Загружаем...</div>;

  if (!introSeen) {
    return (
      <ScenarioStage
        leftHud={
          <>
            <div className="hud-pill"><span className="hud-label">День</span><span className="hud-value">0/{maxDays}</span></div>
            <div className="hud-pill"><span className="hud-label">💰</span><span className="hud-value">{budget}</span></div>
          </>
        }
        onExit={exitScenario}
      >
        <div className="dialog-area">
          <div className="dialog-box">
            <div className="speaker-row"><div className="speaker-name">🍋 Мой первый бизнес</div></div>
            <div className="dialog-text">{INTRO_TEXT}</div>
          </div>
          <div className="dialog-box">
            <button type="button" className="primary-btn" onClick={() => { const days = businessDays.length === maxDays ? businessDays : buildBusinessDays(); setBusinessDays(days); setIntroSeen(true); saveRun(0, budget, popularity, days); }}>
              Начать
            </button>
          </div>
        </div>
      </ScenarioStage>
    );
  }

  const leftHud = (
    <>
      <div className="hud-pill">
        <span className="hud-label">День</span>
        <span className="hud-value">{currentDay}/{maxDays}</span>
      </div>
      <div className="hud-pill">
        <span className="hud-label">💰 Бюджет</span>
        <span className="hud-value">{budget}</span>
      </div>
      <div className="hud-pill business-popularity">
        <span className="hud-label">⭐ Популярность</span>
        <div className="popularity-bar-wrap">
          <div className="popularity-bar" style={{ width: `${popularity}%` }} />
          <span className="popularity-value">{popularity}</span>
        </div>
      </div>
    </>
  );

  return (
    <ScenarioStage leftHud={leftHud} onExit={exitScenario}>
      {showUnlock && (
        <div className="unlock-overlay" onClick={() => setShowUnlock(false)}>
          <div className="unlock-card" onClick={(e) => e.stopPropagation()}>
            <div className="unlock-item">📱</div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>Цель достигнута!</div>
            <div className="text-muted" style={{ marginTop: 8 }}>«Смартфон» — твой первый бизнес-успех.</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="primary-btn" type="button" onClick={() => { setShowUnlock(false); onBackToMap(); }}>К сценариям</button>
              <button className="secondary-btn" type="button" onClick={() => setShowUnlock(false)}>Продолжить</button>
            </div>
          </div>
        </div>
      )}

      <div className="dialog-area">
        <div className="dialog-box" onClick={revealAll} role="button" tabIndex={0}>
          <div className="speaker-row">
            <div className="speaker-name">{characterName}</div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>{saveInfo || (isTyping ? 'Нажми, чтобы ускорить' : '')}</div>
          </div>
          <div className="dialog-text">
            {typedText}
            {isTyping && <span className="caret" />}
          </div>
        </div>

        {!finished && (
          <div className="dialog-box">
            {phase === 'context' && (
              isTyping ? (
                <div className="choice-ghost">Выбор появится после того, как ты дочитаешь текст.</div>
              ) : (
                <div className="choices-row">
                  <div className="text-muted" style={{ marginBottom: 6 }}>Выбери действие:</div>
                  {currentEvent.choices.map((choice, idx) => (
                    <div key={idx}>
                      <button type="button" className="primary-btn choice-btn" onClick={() => handleChoice(choice)}>
                        <span>{choice.label}</span>
                        {(choice.delta !== 0 || choice.popularityDelta) && !isExpert && (
                          <span style={{ fontSize: '0.8rem', marginLeft: 8 }}>
                            {choice.delta !== 0 && (
                              <span className={choice.delta > 0 ? 'text-success' : 'text-danger'}>
                                {choice.delta > 0 ? '+' : ''}{choice.delta} 💰
                              </span>
                            )}
                            {choice.popularityDelta != null && choice.popularityDelta !== 0 && (
                              <span className="text-muted"> {choice.popularityDelta > 0 ? '+' : ''}{choice.popularityDelta} ⭐</span>
                            )}
                          </span>
                        )}
                      </button>
                      {!isExpert && choice.hint && (
                        <div className="text-muted" style={{ fontSize: '0.78rem', marginLeft: 6, marginTop: 2 }}>Подсказка: {choice.hint}</div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={() => speakText(`${currentEvent.title}. ${currentEvent.text}`)}>🔊 Озвучить</button>
                </div>
              )
            )}
            {phase === 'result' && <div className="choices-row"><div className="text-muted">{isTyping ? '...' : 'Готово. Дальше.'}</div></div>}
          </div>
        )}

        {finished && (
          <div className="dialog-box">
            <div className="choices-row">
              <button className="primary-btn" type="button" onClick={onBackToMap}>Вернуться к сценариям</button>
            </div>
          </div>
        )}
      </div>
    </ScenarioStage>
  );
}
