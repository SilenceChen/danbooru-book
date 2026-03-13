"""
规则匹配分类器。
优先级：manual > rule > llm
rule 分类在爬取时写入，llm 分类在翻译时写入。
"""
from services.prompts import CATEGORIES

# 关键词 -> 分类 映射（检查 tag name 是否包含这些关键词）
CATEGORY_RULES: dict[str, list[str]] = {
    "头发": ["hair", "twintails", "ponytail", "braid", "ahoge", "bangs", "fringe", "hairpin", "hairclip"],
    "眼": ["eyes", "eye", "pupils", "iris", "heterochromia", "eyebrow", "eyelash"],
    "口": ["mouth", "lips", "tongue", "teeth", "fang", "open mouth", "closed mouth"],
    "脸": ["face", "blush", "expression", "cheek", "tears", "crying", "smile", "frown", "pout"],
    "胸部": ["breasts", "breast", "chest", "cleavage", "nipple", "areola"],
    "身体": ["body", "skin", "belly", "navel", "waist", "abs", "armpit"],
    "手": ["hand", "finger", "nail", "palm", "wrist", "knuckle"],
    "腿": ["leg", "thigh", "knee", "ankle", "feet", "foot", "toe"],
    "衣服": [
        "dress", "shirt", "jacket", "coat", "sweater", "hoodie",
        "uniform", "outfit", "clothing", "blouse", "top", "vest", "cardigan",
    ],
    "裙子": ["skirt", "miniskirt", "microskirt"],
    "裤子": ["pants", "jeans", "shorts", "leggings", "trousers", "bottoms"],
    "鞋子": ["shoes", "boots", "heels", "sneakers", "sandals", "loafers", "footwear"],
    "袜子": ["socks", "stockings", "thighhighs", "pantyhose", "fishnet"],
    "手套": ["gloves", "mittens", "gauntlets"],
    "配饰": [
        "necklace", "earring", "ring", "bracelet", "choker",
        "glasses", "hat", "cap", "bow", "ribbon", "badge", "collar",
    ],
    "头部": ["hat", "crown", "tiara", "headband", "hairband", "helmet", "hood", "veil", "headdress"],
    "颜色": [
        "red", "blue", "green", "yellow", "purple", "pink", "orange",
        "white", "black", "brown", "grey", "gray", "blonde", "silver",
        "golden", "dark", "light", "multicolored", "rainbow",
    ],
    "背景": [
        "background", "outdoors", "indoors", "sky", "ocean", "sea",
        "forest", "city", "school", "bedroom", "garden", "beach", "mountain",
    ],
    "背景建筑": [
        "castle", "building", "tower", "house", "room", "library",
        "church", "temple", "ruins", "corridor", "staircase",
    ],
    "镜头": [
        "close-up", "from above", "from below", "from side", "from behind",
        "wide shot", "portrait", "full body", "upper body", "cowboy shot",
        "pov", "dutch angle",
    ],
    "姿势": [
        "sitting", "standing", "lying", "running", "jumping",
        "kneeling", "crouching", "leaning", "stretching", "walking",
    ],
    "画面效果": [
        "bokeh", "depth of field", "blur", "glow", "sparkle",
        "shadow", "light rays", "motion blur", "chromatic aberration",
    ],
    "强化属性": [
        "masterpiece", "best quality", "high quality", "detailed",
        "highres", "4k", "8k", "ultra", "absurdres",
    ],
    "反向关键词": [
        "lowres", "bad hands", "watermark", "blurry", "ugly",
        "deformed", "text", "signature", "jpeg artifacts", "error",
        "worst quality", "low quality", "normal quality", "extra limbs",
    ],
    "风格": [
        "anime", "realistic", "oil painting", "watercolor", "sketch",
        "pixel art", "lineart", "flat color", "cel shading", "style",
    ],
    "画师": ["by ", "artgerm", "wlop", "ilya kuvshinov"],
    "食物": ["food", "cake", "bread", "fruit", "drink", "coffee", "tea", "pizza", "ice cream"],
    "画面": ["1girl", "2girls", "3girls", "1boy", "2boys", "multiple girls", "solo", "couple"],
}


def rule_classify(tag_name: str) -> tuple[list[str], str]:
    """
    基于规则对 tag 进行分类。
    返回 (categories, primary_category)
    """
    tag_lower = tag_name.lower()
    matched: list[str] = []

    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in tag_lower:
                if category not in matched:
                    matched.append(category)
                break

    primary = matched[0] if matched else ""
    return matched, primary
