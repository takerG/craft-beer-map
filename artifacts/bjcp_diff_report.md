# BJCP 2015 Verification Report

This report compares the pre-rebuild app dataset (79 styles) against the BJCP 2015 Chinese PDF parsed baseline (111 styles).

- PDF parsed styles: 111
- Pre-rebuild app styles: 79
- Confirmed missing styles: 35
- Confirmed non-baseline or mismatched styles: 3

## Confirmed Missing Styles
- 13C: 英式波特 (English Porter)
- 14B: 苏格兰高度啤酒 (Scottish Heavy)
- 17A: 英式烈性艾尔 (British Strong Ale)
- 22C: 美式大麦酒 (American Barleywine)
- 22D: 小麦酒 (Wheatwine)
- 23C: 老棕色艾尔 (Oud Bruin)
- 23F: 水果兰比克 (Fruit Lambic)
- 24B: 比利时淡色艾尔 (Belgian Pale Ale)
- 25C: 金色烈性艾尔 (Belgian Golden Strong Ale)
- 26A: 特拉啤斯特单料 (Trappist Single)
- 27-1: 古斯 (Gose)
- 27-2: 肯塔基啤酒 (Kentucky Common)
- 27-3: 烟熏酸艾 (Lichtenhainer)
- 27-4: 伦敦棕色艾尔 (London Brown Ale)
- 27-5: 波兰烟熏啤酒 (Piwo Grodziskie)
- 27-6: 禁酒令前拉格 (Pre-Prohibition Lager)
- 27-7: 禁酒令前波特 (Pre-Prohibition Porter)
- 27-8: 黑麦啤酒 (Roggenbier)
- 27-9: 芬兰节日啤酒 (Sahti)
- 28B: 混合发酵酸 啤 (Mixed-Fermentation Sour Beer)
- 28C: 野菌增味啤酒 (Wild Specialty Beer)
- 29B: 香料果啤 (Fruit and Spice Beer)
- 29C: 增味果啤 (Specialty Fruit Beer)
- 30B: 秋季啤酒 (Autumn Seasonal Beer)
- 30C: 冬季啤酒 (Winter Seasonal Beer)
- 31A: 另类谷物啤酒 (Alternative Grain Beer)
- 31B: 另类酵糖啤酒 (Alternative Sugar Beer)
- 32B: 增味烟熏啤酒 (Specialty Smoked Beer)
- 33B: 增味木桶陈酿啤 酒 (Specialty Wood-Aged Beer)
- 34A: 克隆啤酒 (Clone Beer)
- 34B: 混合风格啤酒 (Mixed-Style Beer)
- 34C: 实验啤酒 (Experimental Beer)
- 5D: 德式皮尔森 (German Pils)
- 7A: 维也纳拉格 (Vienna Lager)
- 7C: 地窖啤酒 (Kellerbier)

## Confirmed Extra or Mismatched Styles
- 21B: ??IPA (Specialty IPA)
- 21C: ??IPA / ????IPA (Hazy IPA)
- 27A: ??????? (Lichtenhainer)

## Common Missing Detail Fields In The Old Dataset
- comments
- history
- ingredients
- comparison
- commercial_examples

## Notes
- Category 27 historical styles are present in the source PDF as named substyles without standard letter codes, so the rebuilt dataset assigns internal ids `27-1` through `27-9` for display and navigation.
- The rebuilt dataset now uses the PDF-derived detail blocks to populate overall impression, aroma, appearance, flavor, mouthfeel, comments, history, ingredients, comparison, vital stats, tags, and commercial examples where available.
