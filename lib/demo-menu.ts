export interface DemoMenuItem {
  name: string;
  description?: string;
  price: number;
}

export interface DemoMenuCategory {
  name: string;
  items: DemoMenuItem[];
}

const PRESETS: Record<string, DemoMenuCategory[]> = {
  en: [
    {
      name: "Starters",
      items: [
        { name: "Caesar salad", description: "Romaine, parmesan, croutons, caesar dressing", price: 8.5 },
        { name: "Bruschetta", description: "Grilled bread, tomato, basil, garlic", price: 6 },
        { name: "Soup of the day", description: "Ask your waiter", price: 7 },
      ],
    },
    {
      name: "Main courses",
      items: [
        { name: "Margherita pizza", description: "Tomato, mozzarella, basil", price: 12 },
        { name: "Grilled salmon", description: "Served with seasonal vegetables", price: 18 },
        { name: "Beef burger", description: "200g beef, cheddar, fries", price: 14 },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Fresh orange juice", price: 5 },
        { name: "Sparkling water", price: 3 },
      ],
    },
  ],
  ru: [
    {
      name: "Закуски",
      items: [
        { name: "Салат Цезарь", description: "Романо, пармезан, сухарики, соус цезарь", price: 450 },
        { name: "Брускетта", description: "Гриль хлеб, томат, базилик, чеснок", price: 320 },
        { name: "Суп дня", description: "Уточните у официанта", price: 380 },
      ],
    },
    {
      name: "Горячие блюда",
      items: [
        { name: "Пицца Маргарита", description: "Томат, моцарелла, базилик", price: 650 },
        { name: "Лосось на гриле", description: "С сезонными овощами", price: 950 },
        { name: "Бургер с говядиной", description: "200 г говядины, чеддер, картофель фри", price: 720 },
      ],
    },
    {
      name: "Напитки",
      items: [
        { name: "Эспрессо", price: 150 },
        { name: "Свежевыжатый апельсиновый сок", price: 280 },
        { name: "Минеральная вода", price: 180 },
      ],
    },
  ],
  es: [
    {
      name: "Entrantes",
      items: [
        { name: "Ensalada César", description: "Romana, parmesano, picatostes, salsa césar", price: 8.5 },
        { name: "Bruschetta", description: "Pan tostado, tomate, albahaca, ajo", price: 6 },
        { name: "Sopa del día", description: "Pregunta al camarero", price: 7 },
      ],
    },
    {
      name: "Platos principales",
      items: [
        { name: "Pizza Margherita", description: "Tomate, mozzarella, albahaca", price: 12 },
        { name: "Salmón a la parrilla", description: "Con verduras de temporada", price: 18 },
        { name: "Hamburguesa de ternera", description: "200 g de ternera, cheddar, patatas", price: 14 },
      ],
    },
    {
      name: "Bebidas",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Zumo de naranja natural", price: 5 },
        { name: "Agua con gas", price: 3 },
      ],
    },
  ],
  fr: [
    {
      name: "Entrées",
      items: [
        { name: "Salade César", description: "Romaine, parmesan, croûtons, sauce césar", price: 8.5 },
        { name: "Bruschetta", description: "Pain grillé, tomate, basilic, ail", price: 6 },
        { name: "Soupe du jour", description: "Demandez au serveur", price: 7 },
      ],
    },
    {
      name: "Plats principaux",
      items: [
        { name: "Pizza Margherita", description: "Tomate, mozzarella, basilic", price: 12 },
        { name: "Saumon grillé", description: "Servi avec légumes de saison", price: 18 },
        { name: "Burger de bœuf", description: "200 g de bœuf, cheddar, frites", price: 14 },
      ],
    },
    {
      name: "Boissons",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Jus d'orange pressé", price: 5 },
        { name: "Eau pétillante", price: 3 },
      ],
    },
  ],
  de: [
    {
      name: "Vorspeisen",
      items: [
        { name: "Caesar-Salat", description: "Römersalat, Parmesan, Croutons, Caesar-Dressing", price: 8.5 },
        { name: "Bruschetta", description: "Geröstetes Brot, Tomate, Basilikum, Knoblauch", price: 6 },
        { name: "Tagessuppe", description: "Fragen Sie den Kellner", price: 7 },
      ],
    },
    {
      name: "Hauptgerichte",
      items: [
        { name: "Pizza Margherita", description: "Tomate, Mozzarella, Basilikum", price: 12 },
        { name: "Gegrillter Lachs", description: "Mit Gemüse der Saison", price: 18 },
        { name: "Rindfleisch-Burger", description: "200 g Rind, Cheddar, Pommes", price: 14 },
      ],
    },
    {
      name: "Getränke",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Frisch gepresster Orangensaft", price: 5 },
        { name: "Sprudelwasser", price: 3 },
      ],
    },
  ],
  it: [
    {
      name: "Antipasti",
      items: [
        { name: "Insalata Cesare", description: "Lattuga romana, parmigiano, crostini, salsa cesare", price: 8.5 },
        { name: "Bruschetta", description: "Pane grigliato, pomodoro, basilico, aglio", price: 6 },
        { name: "Zuppa del giorno", description: "Chiedere al cameriere", price: 7 },
      ],
    },
    {
      name: "Secondi",
      items: [
        { name: "Pizza Margherita", description: "Pomodoro, mozzarella, basilico", price: 12 },
        { name: "Salmone alla griglia", description: "Con verdure di stagione", price: 18 },
        { name: "Hamburger di manzo", description: "200 g di manzo, cheddar, patatine", price: 14 },
      ],
    },
    {
      name: "Bevande",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Spremuta d'arancia", price: 5 },
        { name: "Acqua frizzante", price: 3 },
      ],
    },
  ],
  pt: [
    {
      name: "Entradas",
      items: [
        { name: "Salada César", description: "Alface romana, parmesão, croutons, molho césar", price: 8.5 },
        { name: "Bruschetta", description: "Pão grelhado, tomate, manjericão, alho", price: 6 },
        { name: "Sopa do dia", description: "Pergunte ao empregado", price: 7 },
      ],
    },
    {
      name: "Pratos principais",
      items: [
        { name: "Pizza Margherita", description: "Tomate, mozzarella, manjericão", price: 12 },
        { name: "Salmão grelhado", description: "Com vegetais da época", price: 18 },
        { name: "Hambúrguer de vaca", description: "200 g de vaca, cheddar, batatas fritas", price: 14 },
      ],
    },
    {
      name: "Bebidas",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Sumo de laranja natural", price: 5 },
        { name: "Água com gás", price: 3 },
      ],
    },
  ],
  uk: [
    {
      name: "Закуски",
      items: [
        { name: "Салат Цезар", description: "Романо, пармезан, сухарики, соус цезар", price: 180 },
        { name: "Брускета", description: "Грильований хліб, томат, базилік, часник", price: 140 },
        { name: "Суп дня", description: "Уточніть у офіціанта", price: 160 },
      ],
    },
    {
      name: "Гарячі страви",
      items: [
        { name: "Піца Маргарита", description: "Томат, моцарела, базилік", price: 260 },
        { name: "Лосось на грилі", description: "З сезонними овочами", price: 420 },
        { name: "Бургер з яловичиною", description: "200 г яловичини, чедер, картопля фрі", price: 320 },
      ],
    },
    {
      name: "Напої",
      items: [
        { name: "Еспресо", price: 60 },
        { name: "Свіжовичавлений апельсиновий сік", price: 120 },
        { name: "Мінеральна вода", price: 50 },
      ],
    },
  ],
  pl: [
    {
      name: "Przystawki",
      items: [
        { name: "Sałatka Cezar", description: "Rzymska, parmezan, grzanki, sos cezar", price: 30 },
        { name: "Bruschetta", description: "Grillowany chleb, pomidor, bazylia, czosnek", price: 22 },
        { name: "Zupa dnia", description: "Zapytaj kelnera", price: 25 },
      ],
    },
    {
      name: "Dania główne",
      items: [
        { name: "Pizza Margherita", description: "Pomidor, mozzarella, bazylia", price: 40 },
        { name: "Grillowany łosoś", description: "Z warzywami sezonowymi", price: 65 },
        { name: "Burger wołowy", description: "200 g wołowiny, cheddar, frytki", price: 50 },
      ],
    },
    {
      name: "Napoje",
      items: [
        { name: "Espresso", price: 10 },
        { name: "Świeży sok pomarańczowy", price: 18 },
        { name: "Woda gazowana", price: 10 },
      ],
    },
  ],
  nl: [
    {
      name: "Voorgerechten",
      items: [
        { name: "Caesarsalade", description: "Romeinse sla, parmezaan, croutons, caesar-dressing", price: 8.5 },
        { name: "Bruschetta", description: "Geroosterd brood, tomaat, basilicum, knoflook", price: 6 },
        { name: "Soep van de dag", description: "Vraag aan de ober", price: 7 },
      ],
    },
    {
      name: "Hoofdgerechten",
      items: [
        { name: "Pizza Margherita", description: "Tomaat, mozzarella, basilicum", price: 12 },
        { name: "Gegrilde zalm", description: "Geserveerd met seizoensgroenten", price: 18 },
        { name: "Rundvleesburger", description: "200 g rund, cheddar, frietjes", price: 14 },
      ],
    },
    {
      name: "Dranken",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Versgeperst sinaasappelsap", price: 5 },
        { name: "Bruiswater", price: 3 },
      ],
    },
  ],
  tr: [
    {
      name: "Başlangıçlar",
      items: [
        { name: "Sezar salatası", description: "Marul, parmesan, kruton, sezar sos", price: 120 },
        { name: "Bruschetta", description: "Kızarmış ekmek, domates, fesleğen, sarımsak", price: 90 },
        { name: "Günün çorbası", description: "Garsona sorun", price: 100 },
      ],
    },
    {
      name: "Ana yemekler",
      items: [
        { name: "Margherita pizza", description: "Domates, mozzarella, fesleğen", price: 180 },
        { name: "Izgara somon", description: "Mevsim sebzeleri ile", price: 280 },
        { name: "Dana burger", description: "200 g dana, cheddar, patates", price: 220 },
      ],
    },
    {
      name: "İçecekler",
      items: [
        { name: "Espresso", price: 50 },
        { name: "Taze portakal suyu", price: 90 },
        { name: "Maden suyu", price: 40 },
      ],
    },
  ],
  ja: [
    {
      name: "前菜",
      items: [
        { name: "シーザーサラダ", description: "ロメインレタス、パルメザン、クルトン、シーザードレッシング", price: 1200 },
        { name: "ブルスケッタ", description: "グリルパン、トマト、バジル、ガーリック", price: 900 },
        { name: "本日のスープ", description: "スタッフにお尋ねください", price: 1000 },
      ],
    },
    {
      name: "メイン",
      items: [
        { name: "マルゲリータピザ", description: "トマト、モッツァレラ、バジル", price: 1800 },
        { name: "サーモングリル", description: "季節の野菜添え", price: 2800 },
        { name: "ビーフバーガー", description: "ビーフ200g、チェダー、フライドポテト", price: 2200 },
      ],
    },
    {
      name: "ドリンク",
      items: [
        { name: "エスプレッソ", price: 400 },
        { name: "フレッシュオレンジジュース", price: 700 },
        { name: "スパークリングウォーター", price: 500 },
      ],
    },
  ],
  zh: [
    {
      name: "开胃菜",
      items: [
        { name: "凯撒沙拉", description: "罗马生菜、帕玛森、面包丁、凯撒酱", price: 58 },
        { name: "布鲁斯凯塔", description: "烤面包、番茄、罗勒、大蒜", price: 45 },
        { name: "每日例汤", description: "请询问服务员", price: 50 },
      ],
    },
    {
      name: "主菜",
      items: [
        { name: "玛格丽特比萨", description: "番茄、马苏里拉、罗勒", price: 88 },
        { name: "烤三文鱼", description: "搭配时令蔬菜", price: 138 },
        { name: "牛肉汉堡", description: "200克牛肉、切达、薯条", price: 108 },
      ],
    },
    {
      name: "饮品",
      items: [
        { name: "浓缩咖啡", price: 20 },
        { name: "鲜榨橙汁", price: 35 },
        { name: "气泡水", price: 20 },
      ],
    },
  ],
  ko: [
    {
      name: "에피타이저",
      items: [
        { name: "시저 샐러드", description: "로메인, 파르메산, 크루통, 시저 드레싱", price: 12000 },
        { name: "브루스케타", description: "그릴 빵, 토마토, 바질, 마늘", price: 9000 },
        { name: "오늘의 수프", description: "직원에게 문의", price: 10000 },
      ],
    },
    {
      name: "메인 요리",
      items: [
        { name: "마르게리타 피자", description: "토마토, 모짜렐라, 바질", price: 18000 },
        { name: "연어 그릴", description: "계절 채소와 함께", price: 28000 },
        { name: "비프 버거", description: "소고기 200g, 체다, 감자튀김", price: 22000 },
      ],
    },
    {
      name: "음료",
      items: [
        { name: "에스프레소", price: 4000 },
        { name: "생오렌지 주스", price: 7000 },
        { name: "탄산수", price: 5000 },
      ],
    },
  ],
  ar: [
    {
      name: "المقبلات",
      items: [
        { name: "سلطة سيزر", description: "خس روماني، بارميزان، خبز مقرمش، صلصة سيزر", price: 32 },
        { name: "بروسكيتا", description: "خبز مشوي، طماطم، ريحان، ثوم", price: 22 },
        { name: "شوربة اليوم", description: "اسأل النادل", price: 26 },
      ],
    },
    {
      name: "الأطباق الرئيسية",
      items: [
        { name: "بيتزا مارغريتا", description: "طماطم، موتزاريلا، ريحان", price: 46 },
        { name: "سلمون مشوي", description: "يقدم مع خضار الموسم", price: 70 },
        { name: "برغر لحم بقري", description: "200 غ لحم بقري، شيدر، بطاطس", price: 54 },
      ],
    },
    {
      name: "المشروبات",
      items: [
        { name: "إسبريسو", price: 10 },
        { name: "عصير برتقال طازج", price: 18 },
        { name: "مياه غازية", price: 10 },
      ],
    },
  ],
};

export function getDemoMenu(locale: string): DemoMenuCategory[] {
  return PRESETS[locale] || PRESETS.en;
}
