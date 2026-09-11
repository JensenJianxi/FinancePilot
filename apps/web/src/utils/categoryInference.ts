import type { Category } from "@finance-pilot/shared";

interface CategoryKeywordRule {
  categoryNames: string[];
  keywords: string[];
}

const expenseRules: CategoryKeywordRule[] = [
  {
    categoryNames: ["Food", "Dining", "Groceries"],
    keywords: [
      "food",
      "drink",
      "drinks",
      "beverage",
      "tea",
      "boba",
      "bubble tea",
      "snack",
      "snacks",
      "restaurant",
      "dining",
      "mamak",
      "cafe",
      "coffee",
      "breakfast",
      "lunch",
      "dinner",
      "meal",
      "bbq",
      "barbecue",
      "bakery",
      "dessert",
      "cake",
      "ice cream",
      "burger",
      "pizza",
      "sushi",
      "ramen",
      "noodle",
      "rice",
      "nasi",
      "chicken",
      "seafood",
      "steamboat",
      "hotpot",
      "grocery",
      "groceries",
      "supermarket",
      "mcdonalds",
      "mcdonald",
      "kfc",
      "starbucks",
      "grabfood",
      "foodpanda"
    ]
  },
  {
    categoryNames: ["Transport", "Transportation"],
    keywords: [
      "refuel",
      "fuel",
      "petrol",
      "diesel",
      "ron95",
      "ron97",
      "shell",
      "petronas",
      "caltex",
      "bhp",
      "transport",
      "taxi",
      "grab",
      "uber",
      "train",
      "bus",
      "toll",
      "parking",
      "vehicle",
      "car wash",
      "motorcycle"
    ]
  },
  {
    categoryNames: ["Bills"],
    keywords: [
      "bill",
      "utility",
      "electricity",
      "water",
      "internet",
      "wifi",
      "phone",
      "mobile",
      "rent",
      "insurance",
      "tng",
      "tng topup",
      "touch n go",
      "touch n go topup",
      "topup",
      "top up",
      "reload",
      "ewallet",
      "e wallet"
    ]
  },
  {
    categoryNames: ["Shopping"],
    keywords: [
      "shopping",
      "clothes",
      "clothing",
      "shirt",
      "pants",
      "shoes",
      "bag",
      "accessories",
      "electronics",
      "gadget",
      "amazon",
      "lazada",
      "shopee",
      "mall"
    ]
  },
  {
    categoryNames: ["Entertainment"],
    keywords: [
      "movie",
      "movies",
      "cinema",
      "film",
      "game",
      "gaming",
      "steam",
      "playstation",
      "xbox",
      "spotify",
      "netflix",
      "disney",
      "youtube",
      "concert",
      "karaoke",
      "sport",
      "sports",
      "golf",
      "badminton",
      "football",
      "soccer",
      "futsal",
      "tennis",
      "pickleball",
      "padel",
      "bowling"
    ]
  },
  {
    categoryNames: ["Healthcare", "Health"],
    keywords: [
      "doctor",
      "pharmacy",
      "medicine",
      "medical",
      "hospital",
      "clinic",
      "dental",
      "dentist",
      "optical",
      "therapy",
      "vitamin",
      "gym"
    ]
  }
];

const incomeRules: CategoryKeywordRule[] = [
  {
    categoryNames: ["Salary"],
    keywords: ["salary", "wage", "payroll", "bonus"]
  },
  {
    categoryNames: ["Investment"],
    keywords: ["investment", "dividend", "interest", "return"]
  }
];

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesKeyword(normalizedTitle: string, keyword: string) {
  return ` ${normalizedTitle} `.includes(` ${normalize(keyword)} `);
}

export function inferCategoryFromTitle(
  title: string,
  categories: Category[],
  type: Category["type"]
): string | null {
  const normalizedTitle = normalize(title);
  const availableCategories = categories.filter((category) => category.type === type);

  if (!normalizedTitle || !availableCategories.length) {
    return null;
  }

  const directMatch = availableCategories.find((category) =>
    includesKeyword(normalizedTitle, category.name)
  );

  if (directMatch) {
    return directMatch.name;
  }

  const rules = type === "expense" ? expenseRules : incomeRules;

  for (const rule of rules) {
    if (!rule.keywords.some((keyword) => includesKeyword(normalizedTitle, keyword))) {
      continue;
    }

    const category = availableCategories.find((candidate) =>
      rule.categoryNames.some((name) => normalize(name) === normalize(candidate.name))
    );

    if (category) {
      return category.name;
    }
  }

  return null;
}
