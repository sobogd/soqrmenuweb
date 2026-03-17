import { prisma } from "@/lib/prisma";

type DemoTranslations = Record<string, { name: string; description?: string }>;

interface DemoItem {
  name: string;
  description?: string;
  price: number;
  translations: DemoTranslations;
}

interface DemoCategory {
  name: string;
  translations: Record<string, { name: string }>;
  items: DemoItem[];
}

const DEMO_CATEGORIES: DemoCategory[] = [
  {
    name: "Starters",
    translations: {
      en: { name: "Starters" },
      ru: { name: "Закуски" },
      uk: { name: "Закуски" },
      es: { name: "Entrantes" },
      de: { name: "Vorspeisen" },
      fr: { name: "Entrées" },
      it: { name: "Antipasti" },
      pt: { name: "Entradas" },
      nl: { name: "Voorgerechten" },
      pl: { name: "Przystawki" },
      tr: { name: "Başlangıçlar" },
      ar: { name: "مقبلات" },
      ja: { name: "前菜" },
      ko: { name: "전채요리" },
      zh: { name: "开胃菜" },
    },
    items: [
      {
        name: "Bruschetta",
        price: 6.5,
        translations: {
          en: { name: "Bruschetta", description: "Toasted bread with tomatoes, garlic and basil" },
          ru: { name: "Брускетта", description: "Поджаренный хлеб с помидорами, чесноком и базиликом" },
          uk: { name: "Брускетта", description: "Підсмажений хліб з помідорами, часником та базиліком" },
          es: { name: "Bruschetta", description: "Pan tostado con tomate, ajo y albahaca" },
          de: { name: "Bruschetta", description: "Geröstetes Brot mit Tomaten, Knoblauch und Basilikum" },
          fr: { name: "Bruschetta", description: "Pain grillé avec tomates, ail et basilic" },
          it: { name: "Bruschetta", description: "Pane tostato con pomodori, aglio e basilico" },
          pt: { name: "Bruschetta", description: "Pão torrado com tomate, alho e manjericão" },
          nl: { name: "Bruschetta", description: "Geroosterd brood met tomaten, knoflook en basilicum" },
          pl: { name: "Bruschetta", description: "Tostowy chleb z pomidorami, czosnkiem i bazylią" },
          tr: { name: "Bruschetta", description: "Domates, sarımsak ve fesleğenli kızarmış ekmek" },
          ar: { name: "بروسكيتا", description: "خبز محمص مع طماطم وثوم وريحان" },
          ja: { name: "ブルスケッタ", description: "トマト、ニンニク、バジルのトーストパン" },
          ko: { name: "브루스케타", description: "토마토, 마늘, 바질을 올린 구운 빵" },
          zh: { name: "意式烤面包", description: "烤面包配番茄、大蒜和罗勒" },
        },
      },
      {
        name: "Caesar Salad",
        price: 8.9,
        translations: {
          en: { name: "Caesar Salad", description: "Romaine lettuce, croutons, parmesan and Caesar dressing" },
          ru: { name: "Салат Цезарь", description: "Салат романо, гренки, пармезан и соус Цезарь" },
          uk: { name: "Салат Цезар", description: "Салат романо, грінки, пармезан та соус Цезар" },
          es: { name: "Ensalada César", description: "Lechuga romana, crutones, parmesano y aderezo César" },
          de: { name: "Caesar Salat", description: "Römersalat, Croutons, Parmesan und Caesar-Dressing" },
          fr: { name: "Salade César", description: "Laitue romaine, croûtons, parmesan et sauce César" },
          it: { name: "Insalata Caesar", description: "Lattuga romana, crostini, parmigiano e salsa Caesar" },
          pt: { name: "Salada Caesar", description: "Alface romana, croutons, parmesão e molho Caesar" },
          nl: { name: "Caesar Salade", description: "Romaine sla, croutons, parmezaan en Caesar dressing" },
          pl: { name: "Sałatka Cezar", description: "Sałata rzymska, grzanki, parmezan i sos Cezar" },
          tr: { name: "Sezar Salata", description: "Marul, kruton, parmesan ve Sezar sosu" },
          ar: { name: "سلطة سيزر", description: "خس روماني، خبز محمص، بارميزان وصلصة سيزر" },
          ja: { name: "シーザーサラダ", description: "ロメインレタス、クルトン、パルメザンとシーザードレッシング" },
          ko: { name: "시저 샐러드", description: "로메인 상추, 크루통, 파마산 치즈와 시저 드레싱" },
          zh: { name: "凯撒沙拉", description: "罗马生菜、面包丁、帕玛森芝士和凯撒酱" },
        },
      },
      {
        name: "Soup of the Day",
        price: 5.5,
        translations: {
          en: { name: "Soup of the Day", description: "Ask your server for today's selection" },
          ru: { name: "Суп дня", description: "Спросите у официанта о сегодняшнем выборе" },
          uk: { name: "Суп дня", description: "Запитайте у офіціанта про сьогоднішній вибір" },
          es: { name: "Sopa del día", description: "Pregunte al camarero por la selección de hoy" },
          de: { name: "Tagessuppe", description: "Fragen Sie Ihren Kellner nach der heutigen Auswahl" },
          fr: { name: "Soupe du jour", description: "Demandez au serveur la sélection du jour" },
          it: { name: "Zuppa del giorno", description: "Chiedete al cameriere la selezione del giorno" },
          pt: { name: "Sopa do dia", description: "Pergunte ao garçom a seleção do dia" },
          nl: { name: "Soep van de dag", description: "Vraag uw ober naar de selectie van vandaag" },
          pl: { name: "Zupa dnia", description: "Zapytaj kelnera o dzisiejszy wybór" },
          tr: { name: "Günün Çorbası", description: "Günün seçimi için garsonunuza sorun" },
          ar: { name: "شوربة اليوم", description: "اسأل النادل عن اختيار اليوم" },
          ja: { name: "本日のスープ", description: "本日のセレクションはスタッフにお尋ねください" },
          ko: { name: "오늘의 수프", description: "오늘의 메뉴는 직원에게 문의하세요" },
          zh: { name: "今日例汤", description: "请向服务员询问今日精选" },
        },
      },
    ],
  },
  {
    name: "Main Courses",
    translations: {
      en: { name: "Main Courses" },
      ru: { name: "Основные блюда" },
      uk: { name: "Основні страви" },
      es: { name: "Platos principales" },
      de: { name: "Hauptgerichte" },
      fr: { name: "Plats principaux" },
      it: { name: "Secondi piatti" },
      pt: { name: "Pratos principais" },
      nl: { name: "Hoofdgerechten" },
      pl: { name: "Dania główne" },
      tr: { name: "Ana Yemekler" },
      ar: { name: "الأطباق الرئيسية" },
      ja: { name: "メインコース" },
      ko: { name: "메인 코스" },
      zh: { name: "主菜" },
    },
    items: [
      {
        name: "Grilled Chicken",
        price: 14.9,
        translations: {
          en: { name: "Grilled Chicken", description: "Herb-marinated chicken breast with seasonal vegetables" },
          ru: { name: "Курица гриль", description: "Куриная грудка в травах с сезонными овощами" },
          uk: { name: "Курка гриль", description: "Куряче філе в травах із сезонними овочами" },
          es: { name: "Pollo a la parrilla", description: "Pechuga de pollo marinada con hierbas y verduras de temporada" },
          de: { name: "Gegrilltes Hähnchen", description: "Kräuter-marinierte Hähnchenbrust mit saisonalem Gemüse" },
          fr: { name: "Poulet grillé", description: "Blanc de poulet mariné aux herbes avec légumes de saison" },
          it: { name: "Pollo alla griglia", description: "Petto di pollo marinato alle erbe con verdure di stagione" },
          pt: { name: "Frango grelhado", description: "Peito de frango marinado com ervas e legumes da estação" },
          nl: { name: "Gegrilde kip", description: "Met kruiden gemarineerde kipfilet met seizoensgroenten" },
          pl: { name: "Kurczak z grilla", description: "Pierś kurczaka w ziołach z sezonowymi warzywami" },
          tr: { name: "Izgara Tavuk", description: "Baharatlı tavuk göğsü ve mevsim sebzeleri" },
          ar: { name: "دجاج مشوي", description: "صدر دجاج متبل بالأعشاب مع خضروات الموسم" },
          ja: { name: "グリルチキン", description: "ハーブマリネのチキンブレストと季節の野菜" },
          ko: { name: "그릴 치킨", description: "허브 마리네이드 닭가슴살과 제철 채소" },
          zh: { name: "烤鸡胸肉", description: "香草腌制鸡胸肉配时令蔬菜" },
        },
      },
      {
        name: "Pasta Carbonara",
        price: 12.5,
        translations: {
          en: { name: "Pasta Carbonara", description: "Spaghetti with pancetta, egg, parmesan and black pepper" },
          ru: { name: "Паста Карбонара", description: "Спагетти с панчеттой, яйцом, пармезаном и чёрным перцем" },
          uk: { name: "Паста Карбонара", description: "Спагетті з панчеттою, яйцем, пармезаном та чорним перцем" },
          es: { name: "Pasta Carbonara", description: "Espaguetis con panceta, huevo, parmesano y pimienta negra" },
          de: { name: "Pasta Carbonara", description: "Spaghetti mit Pancetta, Ei, Parmesan und schwarzem Pfeffer" },
          fr: { name: "Pâtes Carbonara", description: "Spaghetti avec pancetta, œuf, parmesan et poivre noir" },
          it: { name: "Pasta Carbonara", description: "Spaghetti con pancetta, uovo, parmigiano e pepe nero" },
          pt: { name: "Pasta Carbonara", description: "Espaguete com pancetta, ovo, parmesão e pimenta preta" },
          nl: { name: "Pasta Carbonara", description: "Spaghetti met pancetta, ei, parmezaan en zwarte peper" },
          pl: { name: "Pasta Carbonara", description: "Spaghetti z boczkiem, jajkiem, parmezanem i czarnym pieprzem" },
          tr: { name: "Makarna Carbonara", description: "Pancetta, yumurta, parmesan ve karabiber ile spagetti" },
          ar: { name: "باستا كاربونارا", description: "سباغيتي مع بانشيتا وبيض وبارميزان وفلفل أسود" },
          ja: { name: "カルボナーラ", description: "パンチェッタ、卵、パルメザン、黒コショウのスパゲッティ" },
          ko: { name: "까르보나라", description: "판체타, 계란, 파마산 치즈, 후추를 넣은 스파게티" },
          zh: { name: "奶油培根意面", description: "意大利面配培根、鸡蛋、帕玛森芝士和黑胡椒" },
        },
      },
      {
        name: "Beef Burger",
        price: 11.9,
        translations: {
          en: { name: "Beef Burger", description: "Juicy beef patty with lettuce, tomato and fries" },
          ru: { name: "Бургер с говядиной", description: "Сочная говяжья котлета с салатом, помидором и картофелем фри" },
          uk: { name: "Бургер з яловичиною", description: "Соковита яловича котлета з салатом, помідором та картоплею фрі" },
          es: { name: "Hamburguesa de ternera", description: "Jugosa hamburguesa con lechuga, tomate y patatas fritas" },
          de: { name: "Rindfleisch-Burger", description: "Saftiges Rindfleisch-Patty mit Salat, Tomate und Pommes" },
          fr: { name: "Burger bœuf", description: "Steak haché juteux avec salade, tomate et frites" },
          it: { name: "Hamburger di manzo", description: "Succoso hamburger con lattuga, pomodoro e patatine" },
          pt: { name: "Hambúrguer de carne", description: "Hambúrguer suculento com alface, tomate e batatas fritas" },
          nl: { name: "Rundvleesburger", description: "Sappige burger met sla, tomaat en frietjes" },
          pl: { name: "Burger wołowy", description: "Soczysty kotlet wołowy z sałatą, pomidorem i frytkami" },
          tr: { name: "Burger", description: "Sulu dana burger, marul, domates ve patates kızartması" },
          ar: { name: "برغر لحم بقر", description: "برغر لحم طري مع خس وطماطم وبطاطس مقلية" },
          ja: { name: "ビーフバーガー", description: "ジューシーなビーフパティ、レタス、トマト、フライドポテト付き" },
          ko: { name: "비프 버거", description: "육즙 가득한 소고기 패티에 양상추, 토마토, 감자튀김" },
          zh: { name: "牛肉汉堡", description: "多汁牛肉饼配生菜、番茄和薯条" },
        },
      },
    ],
  },
  {
    name: "Desserts",
    translations: {
      en: { name: "Desserts" },
      ru: { name: "Десерты" },
      uk: { name: "Десерти" },
      es: { name: "Postres" },
      de: { name: "Desserts" },
      fr: { name: "Desserts" },
      it: { name: "Dolci" },
      pt: { name: "Sobremesas" },
      nl: { name: "Desserts" },
      pl: { name: "Desery" },
      tr: { name: "Tatlılar" },
      ar: { name: "حلويات" },
      ja: { name: "デザート" },
      ko: { name: "디저트" },
      zh: { name: "甜点" },
    },
    items: [
      {
        name: "Tiramisu",
        price: 7.5,
        translations: {
          en: { name: "Tiramisu", description: "Classic Italian coffee-flavored dessert" },
          ru: { name: "Тирамису", description: "Классический итальянский десерт с кофе" },
          uk: { name: "Тірамісу", description: "Класичний італійський десерт з кавою" },
          es: { name: "Tiramisú", description: "Clásico postre italiano con sabor a café" },
          de: { name: "Tiramisu", description: "Klassisches italienisches Dessert mit Kaffeegeschmack" },
          fr: { name: "Tiramisu", description: "Dessert italien classique au café" },
          it: { name: "Tiramisù", description: "Classico dolce italiano al caffè" },
          pt: { name: "Tiramisu", description: "Clássica sobremesa italiana com sabor de café" },
          nl: { name: "Tiramisu", description: "Klassiek Italiaans dessert met koffiesmaak" },
          pl: { name: "Tiramisu", description: "Klasyczny włoski deser kawowy" },
          tr: { name: "Tiramisu", description: "Klasik İtalyan kahveli tatlısı" },
          ar: { name: "تيراميسو", description: "حلوى إيطالية كلاسيكية بنكهة القهوة" },
          ja: { name: "ティラミス", description: "クラシックなイタリアンコーヒーデザート" },
          ko: { name: "티라미수", description: "클래식 이탈리안 커피 디저트" },
          zh: { name: "提拉米苏", description: "经典意大利咖啡味甜点" },
        },
      },
      {
        name: "Chocolate Cake",
        price: 6.9,
        translations: {
          en: { name: "Chocolate Cake", description: "Rich chocolate cake with ganache" },
          ru: { name: "Шоколадный торт", description: "Насыщенный шоколадный торт с ганашем" },
          uk: { name: "Шоколадний торт", description: "Насичений шоколадний торт з ганашем" },
          es: { name: "Tarta de chocolate", description: "Rica tarta de chocolate con ganache" },
          de: { name: "Schokoladenkuchen", description: "Reichhaltiger Schokoladenkuchen mit Ganache" },
          fr: { name: "Gâteau au chocolat", description: "Riche gâteau au chocolat avec ganache" },
          it: { name: "Torta al cioccolato", description: "Ricca torta al cioccolato con ganache" },
          pt: { name: "Bolo de chocolate", description: "Rico bolo de chocolate com ganache" },
          nl: { name: "Chocoladetaart", description: "Rijke chocoladetaart met ganache" },
          pl: { name: "Ciasto czekoladowe", description: "Bogate ciasto czekoladowe z ganache" },
          tr: { name: "Çikolatalı Pasta", description: "Ganajlı zengin çikolatalı pasta" },
          ar: { name: "كيك الشوكولاتة", description: "كيك شوكولاتة غني مع غاناش" },
          ja: { name: "チョコレートケーキ", description: "ガナッシュ付きリッチチョコレートケーキ" },
          ko: { name: "초콜릿 케이크", description: "가나슈를 곁들인 진한 초콜릿 케이크" },
          zh: { name: "巧克力蛋糕", description: "浓郁巧克力蛋糕配甘纳许" },
        },
      },
    ],
  },
];

/**
 * Seeds demo menu for a newly created restaurant.
 * Creates 3 categories with 2-3 items each, all marked isDemo: true.
 * The `name` field uses the user's locale; other languages go into `translations`.
 */
export async function seedDemoMenu(companyId: string, locale: string) {
  for (let catIdx = 0; catIdx < DEMO_CATEGORIES.length; catIdx++) {
    const cat = DEMO_CATEGORIES[catIdx];
    const catTranslation = cat.translations[locale] || cat.translations.en;

    // Build translations object (all languages except the default locale)
    const catTranslations: Record<string, { name: string }> = {};
    for (const [lang, t] of Object.entries(cat.translations)) {
      if (lang !== locale) {
        catTranslations[lang] = t;
      }
    }

    const category = await prisma.category.create({
      data: {
        name: catTranslation.name,
        translations: catTranslations,
        sortOrder: catIdx,
        isDemo: true,
        companyId,
      },
    });

    await prisma.item.createMany({
      data: cat.items.map((item, itemIdx) => {
        const itemTranslation = item.translations[locale] || item.translations.en;

        // Build translations object (all languages except the default locale)
        const itemTranslations: Record<string, { name: string; description?: string }> = {};
        for (const [lang, t] of Object.entries(item.translations)) {
          if (lang !== locale) {
            itemTranslations[lang] = t;
          }
        }

        return {
          name: itemTranslation.name,
          description: itemTranslation.description || null,
          translations: itemTranslations,
          price: item.price,
          sortOrder: itemIdx,
          isDemo: true,
          categoryId: category.id,
          companyId,
        };
      }),
    });
  }
}
