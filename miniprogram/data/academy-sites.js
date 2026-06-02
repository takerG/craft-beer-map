// Generated from academy-sites/. Run npm run build:academy after content changes.
export const academyOrder = {
  "featured": [
    "ipa-family-map",
    "ale-vs-lager"
  ],
  "tracks": [
    {
      "id": "starter",
      "title": "刚入门",
      "description": "先把常见名词、发酵方式和风味语言变成直觉。",
      "items": [
        "ale-vs-lager",
        "flavor-radar-basics"
      ]
    },
    {
      "id": "style-sense",
      "title": "风格识别",
      "description": "从具体风格家族出发，理解市场叫法和 BJCP 入口。",
      "items": [
        "ipa-family-map",
        "ale-vs-lager"
      ]
    },
    {
      "id": "flavor-training",
      "title": "风味训练",
      "description": "把香气、口感和个人偏好连接到可复用的选酒判断。",
      "items": [
        "flavor-radar-basics",
        "ipa-family-map"
      ]
    }
  ],
  "tools": [
    {
      "id": "style-language",
      "title": "风格语言速查",
      "description": "从 IPA、古斯、世涛等常见叫法反查风格入口。",
      "route": "/pages/style-language/index"
    }
  ]
};

export const academySites = [
  {
    "slug": "flavor-radar-basics",
    "title": "风味雷达入门",
    "description": "把麦芽、酒花、酵母、发酵副产物拆成可点击的风味坐标。",
    "type": "simulator",
    "difficulty": "入门",
    "readingTime": 6,
    "tags": [
      "风味",
      "选酒",
      "感官训练"
    ],
    "date": "2026-06-02",
    "featured": false,
    "heroMetric": "4 个来源",
    "accent": "#fb7185",
    "relatedStyles": [
      "16A",
      "21C",
      "23E",
      "ext-dessert-pastry-beer"
    ],
    "publishedAt": "2026-06-04",
    "updatedAt": "2026-06-04",
    "coverImage": "assets/academy-covers/flavor-radar-basics.png",
    "hero": {
      "kicker": "感官训练",
      "summary": "风味词不用一次背完。先知道它们大多来自麦芽、酒花、酵母和发酵管理，再把词汇放回具体风格。"
    },
    "modules": [
      {
        "id": "sources",
        "type": "cards",
        "title": "四个风味来源",
        "summary": "点击式学习的核心是把词汇归类，而不是把词汇堆满页面。",
        "items": [
          {
            "title": "麦芽",
            "body": "面包、焦糖、坚果、咖啡、巧克力，常决定甜感、颜色和酒体支撑。",
            "tone": "malt"
          },
          {
            "title": "酒花",
            "body": "草本、松针、柑橘、热带水果，也带来苦度和清爽收口。",
            "tone": "hop"
          },
          {
            "title": "酵母",
            "body": "香蕉、丁香、胡椒、蜂蜜、泥土感，很多比利时和小麦风格都靠它建立个性。",
            "tone": "yeast"
          },
          {
            "title": "发酵管理",
            "body": "酸感、酒精热感、干净度和复杂度，常来自温度、时间与微生物控制。",
            "tone": "process"
          }
        ]
      },
      {
        "id": "radar",
        "type": "scale",
        "title": "把词放回坐标",
        "summary": "同一个词在不同风格里的强度不一样。先判断来源，再判断强度。",
        "points": [
          {
            "label": "麦芽感",
            "low": "轻",
            "high": "重",
            "level": 72
          },
          {
            "label": "酒花香",
            "low": "弱",
            "high": "强",
            "level": 88
          },
          {
            "label": "发酵个性",
            "low": "干净",
            "high": "复杂",
            "level": 64
          },
          {
            "label": "酸甜平衡",
            "low": "干爽",
            "high": "甜酸",
            "level": 52
          }
        ]
      },
      {
        "id": "quiz",
        "type": "quiz",
        "title": "词汇归类",
        "question": "香蕉和丁香这样的典型词，优先应该归到哪个来源？",
        "options": [
          {
            "label": "酵母",
            "correct": true,
            "feedback": "对。很多德式小麦和比利时风格会出现明显酵母表达。"
          },
          {
            "label": "酒花",
            "correct": false,
            "feedback": "酒花更常见柑橘、草本、松针、热带水果等方向。"
          },
          {
            "label": "麦芽",
            "correct": false,
            "feedback": "麦芽更常见面包、焦糖、坚果、咖啡、巧克力等方向。"
          }
        ]
      }
    ]
  },
  {
    "slug": "ipa-family-map",
    "title": "IPA 家族地图",
    "description": "用一张可交互地图理解 West Coast、Hazy、Session、Double IPA 的苦度、香气与酒体差异。",
    "type": "map",
    "difficulty": "入门",
    "readingTime": 5,
    "tags": [
      "IPA",
      "酒花",
      "风格识别"
    ],
    "date": "2026-06-02",
    "featured": true,
    "heroMetric": "4 条分支",
    "accent": "#f6ad55",
    "relatedStyles": [
      "21A",
      "21C",
      "22A",
      "ext-west-coast-ipa"
    ],
    "publishedAt": "2026-06-03",
    "updatedAt": "2026-06-03",
    "coverImage": "assets/academy-covers/ipa-family-map.png",
    "hero": {
      "kicker": "风格识别",
      "summary": "不要先背定义，先看三个轴：苦度、酒花香气、酒体。多数 IPA 分支都能在这张地图上找到位置。"
    },
    "modules": [
      {
        "id": "axis",
        "type": "scale",
        "title": "先看三条轴",
        "summary": "IPA 的第一判断不是产地，而是喝起来落在哪些感官区间。",
        "points": [
          {
            "label": "苦度",
            "low": "柔和",
            "high": "锋利",
            "level": 84
          },
          {
            "label": "香气",
            "low": "草本",
            "high": "热带水果",
            "level": 92
          },
          {
            "label": "酒体",
            "low": "清爽",
            "high": "饱满",
            "level": 62
          }
        ]
      },
      {
        "id": "branches",
        "type": "cards",
        "title": "四个常见入口",
        "summary": "先用市场高频叫法建立直觉，再回到 BJCP 或扩展风格详情。",
        "items": [
          {
            "title": "West Coast IPA",
            "body": "更干、更清晰，苦度线条明显，松针、葡萄柚和树脂感常见。",
            "tone": "bitter"
          },
          {
            "title": "Hazy / NEIPA",
            "body": "香气更像果汁，苦度被柔化，酒体更饱满，外观常浑浊。",
            "tone": "juicy"
          },
          {
            "title": "Session IPA",
            "body": "保留酒花存在感，但酒精度更轻，适合长时间轻松饮用。",
            "tone": "light"
          },
          {
            "title": "Double IPA",
            "body": "酒花、酒精和麦芽支撑都被放大，强度明显上升。",
            "tone": "strong"
          }
        ]
      },
      {
        "id": "quiz",
        "type": "quiz",
        "title": "30 秒判断",
        "question": "如果一杯 IPA 闻起来像芒果和菠萝，苦度不尖，口感圆润，你会先想到哪一支？",
        "options": [
          {
            "label": "Hazy / NEIPA",
            "correct": true,
            "feedback": "对。果汁感、柔化苦度和饱满酒体是重要信号。"
          },
          {
            "label": "West Coast IPA",
            "correct": false,
            "feedback": "West Coast 通常更干、更清晰，苦度边缘更锋利。"
          },
          {
            "label": "Session IPA",
            "correct": false,
            "feedback": "Session 重点是低酒精和轻盈，不一定有强烈果汁感。"
          }
        ]
      }
    ]
  },
  {
    "slug": "ale-vs-lager",
    "title": "艾尔 vs 拉格",
    "description": "用温度、时间和风味结果理解两大酿造路径，不再死记上发酵和下发酵。",
    "type": "comparison",
    "difficulty": "入门",
    "readingTime": 4,
    "tags": [
      "发酵",
      "入门",
      "拉格"
    ],
    "date": "2026-06-02",
    "featured": true,
    "heroMetric": "2 条路径",
    "accent": "#53d4da",
    "relatedStyles": [
      "1A",
      "5D",
      "12C",
      "25B"
    ],
    "publishedAt": "2026-06-02",
    "updatedAt": "2026-06-02",
    "coverImage": "assets/academy-covers/ale-vs-lager.png",
    "hero": {
      "kicker": "基础概念",
      "summary": "艾尔和拉格不是高低贵贱，而是两种发酵管理路线。温度、时间和酵母表达共同决定了杯中的气质。"
    },
    "modules": [
      {
        "id": "comparison",
        "type": "comparison",
        "title": "三件事先分清",
        "summary": "把抽象术语换成可以观察的酿造变量。",
        "columns": [
          {
            "title": "艾尔 Ale",
            "items": [
              "发酵温度通常更高",
              "发酵周期更短",
              "酯香、酚香等个性更容易出现"
            ]
          },
          {
            "title": "拉格 Lager",
            "items": [
              "发酵温度通常更低",
              "需要更长冷储与成熟",
              "干净、清爽、麦芽和酒花更直接"
            ]
          }
        ]
      },
      {
        "id": "timeline",
        "type": "scale",
        "title": "不是上下，而是管理方式",
        "summary": "很多入门资料会说上发酵/下发酵，但真正帮助判断的是发酵温度和成熟时间。",
        "points": [
          {
            "label": "温度",
            "low": "低温",
            "high": "高温",
            "level": 45
          },
          {
            "label": "周期",
            "low": "短",
            "high": "长",
            "level": 70
          },
          {
            "label": "风味个性",
            "low": "干净",
            "high": "表达强",
            "level": 58
          }
        ]
      },
      {
        "id": "quiz",
        "type": "quiz",
        "title": "快速辨认",
        "question": "一杯酒干净、清脆、麦芽像面包皮，发酵香气很少，通常更接近哪条路径？",
        "options": [
          {
            "label": "拉格",
            "correct": true,
            "feedback": "对。干净清脆通常指向拉格路线，尤其是皮尔森、淡色拉格。"
          },
          {
            "label": "艾尔",
            "correct": false,
            "feedback": "艾尔也可以干净，但更常见到酯香或酵母个性。"
          }
        ]
      }
    ]
  }
];
