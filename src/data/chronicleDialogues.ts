/**
 * 《星核裂紀 · Stellarcore Rift》
 * Chronicle Mode 劇情對白骨架 v1.0
 * 由 Mina 整理 · 2026-09-26
 *
 * 使用說明：
 * - 每個域有 prologueDialogue（入域前）和 epilogueDialogue（通關後）
 * - speaker 顏色對照：守護藍 #4A90D9 / 渾沌紅 #C0392B / 獨立銀 #C0C0C0 / 旁白白 #FFFFFF
 * - portrait 填入騎士英文id，對應 knightData.ts 的 id 欄位
 * - 骨架版本，主人確認後可替換正式腳本
 *
 * ⚠️ Claude Code 接入備註（Phase 1-B）：這裡的 portrait 值（如 'argentwing-null'、
 * 'elixia-holyblade'）是 Mina 這份文件慣用的長 id，跟這個專案 `data/knights.ts` 實際的短 id
 * （'silver-wing'、'elixia'）不是同一套——跟 Phase 1-A 處理 enemyComposition 時遇到的落差
 * 同一種情況。這份檔案本身逐字保留 Mina 原文不修改，長短 id 的轉換交給消費端
 * `pages/Chronicle/DialogueSequence.tsx` 的 `resolveDialogueKnightId()` 動態處理
 * （用 knights.ts 的 nameEn 反推 slug，找不到就原樣當短 id 用，兩種寫法都吃得下）。
 */

export interface DialogueLine {
  speaker: string;
  speakerColor: string;
  portrait?: string;       // 騎士id（無則不顯示立繪）
  portraitSide?: 'left' | 'right';
  text: string;
}

// ═══════════════════════════════════════════════════════
// 序章（共用）
// ═══════════════════════════════════════════════════════

export const prologueDialogues: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '遠古時代，源核——維繫星橋諸域的原始力量——於一場無名之戰中碎裂。',
  },
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '碎片散落各域，兩大勢力為之而戰：守護騎士，誓守光明；渾沌騎士，以混亂重生。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '（睜開眼）……這裡是哪裡？我是……誰？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '只記得……星光。還有什麼東西，在胸口跳動著。',
  },
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '在廢墟平原的盡頭，星橋閃爍。兩個方向，兩種命運。選擇，由你決定。',
  },
];

// ═══════════════════════════════════════════════════════
// 守護線 · Guardian Order
// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// 中立星橋（教學域・共用）
// ───────────────────────────────────────────────────────

export const neutralBridgePrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '中立星橋——兩大陣營都不願踏入的緩衝地帶。也是所有流浪者的起點。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '星橋……這條路通向何方？不管了。先活下去再說。',
  },
];

export const neutralBridgeEpilogue: DialogueLine[] = [
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '（凝視遠方的守護陣營旗幟）……那邊。先去看看。',
  },
];

// ───────────────────────────────────────────────────────
// 哥德聖殿域（守護第一幕 Ch.1）
// ───────────────────────────────────────────────────────

export const gothicTemplePrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '哥德聖殿——守護騎士的信仰核心。此刻，渾沌的爪牙已悄然滲入。',
  },
  {
    speaker: '艾爾希亞·聖裁',
    speakerColor: '#4A90D9',
    portrait: 'elixia-holyblade',
    portraitSide: 'right',
    text: '你是誰？沒有陣營徽記……但你的星核頻率，不像敵人。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '我不屬於任何一方。但如果有人需要幫助——我不會袖手旁觀。',
  },
  {
    speaker: '艾爾希亞·聖裁',
    speakerColor: '#4A90D9',
    portrait: 'elixia-holyblade',
    portraitSide: 'right',
    text: '……好。聖殿的大門為你開啟。但請記住，光明不接受模糊的立場。',
  },
];

export const gothicTempleEpilogue: DialogueLine[] = [
  {
    speaker: '艾爾希亞·聖裁',
    speakerColor: '#4A90D9',
    portrait: 'elixia-holyblade',
    portraitSide: 'right',
    text: '聖殿暫時安全了。你的戰鬥方式……我從未見過這種星核頻率。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '我也不知道。但只要能保護需要保護的人，夠了。',
  },
  {
    speaker: '艾爾希亞·聖裁',
    speakerColor: '#4A90D9',
    portrait: 'elixia-holyblade',
    portraitSide: 'right',
    text: '（輕聲）……星核力如此純粹。也許，你就是我們一直在等的答案。',
  },
];

// ───────────────────────────────────────────────────────
// 沙漠古神殿域（守護第一幕 Ch.2）
// ───────────────────────────────────────────────────────

export const desertShrinePrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '沙漠古神殿——太陽神域的最後遺址。傳說源核碎片曾在此留下痕跡。',
  },
  {
    speaker: '拉奧斯·日輝',
    speakerColor: '#4A90D9',
    portrait: 'laros-dawnfire',
    portraitSide: 'right',
    text: '銀翼。我聽說你在聖殿的事了。（頓）你願意繼續嗎？前路比你想的更危險。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '危險從來沒讓我停下來過。',
  },
  {
    speaker: '拉奧斯·日輝',
    speakerColor: '#4A90D9',
    portrait: 'laros-dawnfire',
    portraitSide: 'right',
    text: '（大笑）好！這才是我想聽的答案。太陽神殿的守護，就交給我們了。',
  },
];

export const desertShrineEpilogue: DialogueLine[] = [
  {
    speaker: '拉奧斯·日輝',
    speakerColor: '#4A90D9',
    portrait: 'laros-dawnfire',
    portraitSide: 'right',
    text: '神殿重歸守護。不錯，銀翼——你的戰鬥有太陽的直接，毫不拖泥帶水。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你比我想的更會說話，拉奧斯。',
  },
  {
    speaker: '拉奧斯·日輝',
    speakerColor: '#4A90D9',
    portrait: 'laros-dawnfire',
    portraitSide: 'right',
    text: '太陽從不沉默。下一個域——我和你並肩。',
  },
];

// ───────────────────────────────────────────────────────
// 天空浮島域（守護第一幕 Ch.3）
// ───────────────────────────────────────────────────────

export const skyIslandPrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '天空浮島——風與生命的交匯處。艾薇亞在此守護著最後一片不被戰火波及的土地。',
  },
  {
    speaker: '艾薇亞·翠嵐',
    speakerColor: '#4A90D9',
    portrait: 'aivia-jadestorm',
    portraitSide: 'right',
    text: '（從高空俯衝而下）停！這裡不接受不明來歷的……（盯著銀翼）等等。你的頻率——',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '我來自中立星橋。不屬於任何陣營。',
  },
  {
    speaker: '艾薇亞·翠嵐',
    speakerColor: '#4A90D9',
    portrait: 'aivia-jadestorm',
    portraitSide: 'right',
    text: '中立……（思索）有趣。好，跟上來——如果你跟得上我的速度的話。',
  },
];

export const skyIslandEpilogue: DialogueLine[] = [
  {
    speaker: '艾薇亞·翠嵐',
    speakerColor: '#4A90D9',
    portrait: 'aivia-jadestorm',
    portraitSide: 'right',
    text: '跑得還不錯嘛！我還以為要自己全部解決了。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你的速度……確實讓我吃力了一下。',
  },
  {
    speaker: '艾薇亞·翠嵐',
    speakerColor: '#4A90D9',
    portrait: 'aivia-jadestorm',
    portraitSide: 'right',
    text: '（得意地展翼）這就叫做翠嵐！浮島的風，永遠在我這邊。前方的域更難——但有我在，沒問題！',
  },
];

// ───────────────────────────────────────────────────────
// 廢墟平原域（第二幕・守護渾沌共用・視角不同）
// ───────────────────────────────────────────────────────

export const ruinedPlainPrologue_guardian: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '廢墟平原——曾是源核完整時代的中心城市，如今只剩殘骸。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '銀翼。你走到這裡來了。（沉默片刻）我感應到了你的頻率，第一次在星橋邊緣。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你是奧瑟里斯……守護的主將。你感應到的，是什麼？',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '……源核。尚未碎裂之前的那個聲音。（轉身）跟我來。這片廢墟藏著我們需要的線索。',
  },
];

export const ruinedPlainEpilogue_guardian: DialogueLine[] = [
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '廢墟之下，我找到了第四塊碎片的共鳴痕跡。索倫已在前方等候。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '索倫……他在等什麼？',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '他在等源核重組的那一天。而那一天，將是所有現存之物的終結。我們必須搶先一步。',
  },
];

// ───────────────────────────────────────────────────────
// 星環聖殿攻防域（第三幕・守護線）
// ───────────────────────────────────────────────────────

export const stellarTemplePrologue_guardian: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '星環聖殿——守護騎士的最後防線。索倫親率渾沌大軍，正面壓境。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '全員備戰。今日，星環聖殿不落。（望向銀翼）你……準備好了嗎？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '從我睜開眼的那一刻就準備好了。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '（點頭）群星為證。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '我等從不孤單。',
  },
];

export const stellarTempleEpilogue_guardian: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '渾沌大軍退潮。星環聖殿，仍在。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '索倫未親自出手。他在等待……等待源核碎片集齊的那一刻。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '那我們就不讓那一刻到來。前進——星穹聖殿。',
  },
];

// ───────────────────────────────────────────────────────
// 最終域・守護線（星穹聖殿王座）
// ───────────────────────────────────────────────────────

export const finalDomainPrologue_guardian: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '星穹聖殿——索倫等待了兩百年的王座。源核的七塊碎片，盡在其手。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（不起身，只是側眼）……你們來了。比我預計的快了一些。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'left',
    text: '索倫。放下碎片。源核的重組只會帶來毀滅。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '毀滅？（輕笑）奧瑟里斯，你從未理解過。重組不是終結，是解放。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '解放的代價，是所有人的消滅。那不是解放——那是你一個人的答案，強加給所有人。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（終於站起）……有趣。你的頻率，我確實無法解析。（握劍）那就讓星滅來告訴你，誰的答案才是真理。',
  },
];

export const finalDomainEpilogue_guardian: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '索倫倒下。七塊碎片，失去了主人的意志。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（喘息）……你們贏了。但別誤會。源核遲早會重組的。我只是……等待了太久。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '索倫……你說你渴望完整。（輕聲）我也是。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'left',
    text: '（望向碎片）……源核沒有重組，卻也沒有消散。它在等待某個頻率——',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '（抬頭，看著碎片發出的光）……我聽到了。它在叫我的名字。',
  },
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '群星為證——我等從不孤單。',
  },
];

// ═══════════════════════════════════════════════════════
// 渾沌線 · Chaos Legion
// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// 末日戰場域（渾沌第一幕 Ch.1）
// ───────────────────────────────────────────────────────

export const doomsBattlefieldPrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '末日戰場——渾沌騎士的狩獵場。每一塊碎裂的大地，都是舊秩序崩潰的見證。',
  },
  {
    speaker: '瑪格諾斯·終焰',
    speakerColor: '#C0392B',
    portrait: 'magnos-doomsfire',
    portraitSide: 'right',
    text: '（打量銀翼）沒有陣營徽記？（冷笑）在渾沌軍中，沒有立場的人只有兩種下場——死、或是變強。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '那我選第二種。',
  },
  {
    speaker: '瑪格諾斯·終焰',
    speakerColor: '#C0392B',
    portrait: 'magnos-doomsfire',
    portraitSide: 'right',
    text: '（露齒一笑）好。那就先在這裡活下來，再說其他的。',
  },
];

export const doomsBattlefieldEpilogue: DialogueLine[] = [
  {
    speaker: '瑪格諾斯·終焰',
    speakerColor: '#C0392B',
    portrait: 'magnos-doomsfire',
    portraitSide: 'right',
    text: '不壞。守護的人被你打倒了，而你沒死。在渾沌，這就夠了。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你們打的是守護騎士……但目標是源核碎片，對吧？',
  },
  {
    speaker: '瑪格諾斯·終焰',
    speakerColor: '#C0392B',
    portrait: 'magnos-doomsfire',
    portraitSide: 'right',
    text: '聰明。索倫說——七塊碎片集齊，宇宙將得到它真正的答案。我信他。你呢？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '……我還在找自己的答案。但在那之前，繼續走。',
  },
];

// ───────────────────────────────────────────────────────
// 地獄要塞域（渾沌第一幕 Ch.2）
// ───────────────────────────────────────────────────────

export const hellFortressPrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '地獄要塞——伊格尼斯的領地。熔岩從每一道裂縫滲出，連空氣都在燃燒。',
  },
  {
    speaker: '伊格尼斯·業火',
    speakerColor: '#C0392B',
    portrait: 'ignis-karmaflame',
    portraitSide: 'right',
    text: '（背對著銀翼，看著熔岩）你就是那個沒有徽記的傢伙？（轉頭）有意思。你的核心是什麼顏色的？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '……不知道。一直都是這樣。',
  },
  {
    speaker: '伊格尼斯·業火',
    speakerColor: '#C0392B',
    portrait: 'ignis-karmaflame',
    portraitSide: 'right',
    text: '不知道就燒出來！火焰會告訴你，你到底是什麼。（點燃業火爪刃）跟上！',
  },
];

export const hellFortressEpilogue: DialogueLine[] = [
  {
    speaker: '伊格尼斯·業火',
    speakerColor: '#C0392B',
    portrait: 'ignis-karmaflame',
    portraitSide: 'right',
    text: '（喘氣，大笑）哈！守護的廢物根本撐不住我的業火！',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你差點把自己也燒了。',
  },
  {
    speaker: '伊格尼斯·業火',
    speakerColor: '#C0392B',
    portrait: 'ignis-karmaflame',
    portraitSide: 'right',
    text: '（揮手）無所謂！業火不滅！……你剛才擋了那一擊。為什麼？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '隊友死在我面前，我不習慣。',
  },
  {
    speaker: '伊格尼斯·業火',
    speakerColor: '#C0392B',
    portrait: 'ignis-karmaflame',
    portraitSide: 'right',
    text: '（沉默片刻）……渾沌不需要保護彼此。但你做了。（轉身）走，下一個域。',
  },
];

// ───────────────────────────────────────────────────────
// 蝕月荒原域（渾沌第一幕 Ch.3）
// ───────────────────────────────────────────────────────

export const moonblightWastePrologue: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '蝕月荒原——月光在此地是詛咒，不是祝福。艾克隆在荒原深處，靜靜等候。',
  },
  {
    speaker: '艾克隆·蝕月',
    speakerColor: '#C0392B',
    portrait: 'eclron-moonblight',
    portraitSide: 'right',
    text: '（低沉）銀翼·虛空……那個名字還不準確。你還沒找到自己，對嗎？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你能感應到我的頻率？',
  },
  {
    speaker: '艾克隆·蝕月',
    speakerColor: '#C0392B',
    portrait: 'eclron-moonblight',
    portraitSide: 'right',
    text: '蝕月能看穿一切遮蔽——包括你自己都不知道的真相。（停頓）守護的月光騎士在這裡設下了陷阱。小心。',
  },
];

export const moonblightWasteEpilogue: DialogueLine[] = [
  {
    speaker: '艾克隆·蝕月',
    speakerColor: '#C0392B',
    portrait: 'eclron-moonblight',
    portraitSide: 'right',
    text: '守護的月光已然蝕去。（望向銀翼）你的頻率，在這場戰鬥中變了。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '變了？怎麼說？',
  },
  {
    speaker: '艾克隆·蝕月',
    speakerColor: '#C0392B',
    portrait: 'eclron-moonblight',
    portraitSide: 'right',
    text: '更接近某個答案了。（轉身）索倫在等你。他說，當那個頻率靠近他的時候，他就知道源核的時刻到了。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '……我是某個預兆嗎？',
  },
  {
    speaker: '艾克隆·蝕月',
    speakerColor: '#C0392B',
    portrait: 'eclron-moonblight',
    portraitSide: 'right',
    text: '（沉默）也許。也許不是。蝕月也有它看不透的東西。',
  },
];

// ───────────────────────────────────────────────────────
// 廢墟平原域（第二幕・渾沌視角）
// ───────────────────────────────────────────────────────

export const ruinedPlainPrologue_chaos: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '廢墟平原——兩大陣營都曾在此交鋒，都沒有勝利者。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（遠遠地）……你走到這裡來了。（轉身）我一直在感應你的頻率，從你踏上星橋的那一刻。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '索倫……你親自來了？',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '你值得。（平靜）你不屬於守護，也不屬於渾沌。你屬於源核本身。而我，需要你明白這一點。',
  },
];

export const ruinedPlainEpilogue_chaos: DialogueLine[] = [
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '守護的殘兵退了。（看著廢墟）這片土地，曾經是源核能量的中心。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '你渴望重組源核……但那會讓一切消失，包括你自己。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（緩緩）我等了兩百年了。消滅，對我而言，不是恐懼。（停頓）你怕死嗎，銀翼？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '……我連自己是什麼都不知道，還沒資格怕死。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（罕見地，嘴角微動）……有意思的回答。前進吧。',
  },
];

// ───────────────────────────────────────────────────────
// 星穹王座侵攻域（第三幕・渾沌線）
// ───────────────────────────────────────────────────────

export const throneAssaultPrologue_chaos: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '星環聖殿——守護騎士的最後堡壘。渾沌大軍已陳兵殿前。',
  },
  {
    speaker: '瑪格諾斯·終焰',
    speakerColor: '#C0392B',
    portrait: 'magnos-doomsfire',
    portraitSide: 'right',
    text: '今日，守護的燈，將在這裡熄滅。（望向銀翼）你，走最前面。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '……好。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '（從殿內走出）銀翼……你選擇了這條路。（沉默）那我們就在此一戰。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '奧瑟里斯……對不起。但我必須找到我自己的答案。',
  },
];

export const throneAssaultEpilogue_chaos: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '星環聖殿陷落。守護騎士後退。',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '（跪地，最後看向銀翼）……你的頻率，和源核一樣。無論你選擇哪一邊，記住——',
  },
  {
    speaker: '奧瑟里斯·星裁',
    speakerColor: '#4A90D9',
    portrait: 'osirath-stellarblade',
    portraitSide: 'right',
    text: '那個頻率，是希望，不是終結。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '（沉默良久）……我記住了。',
  },
];

// ───────────────────────────────────────────────────────
// 最終域・渾沌線（索倫王座・源核重組前夕）
// ───────────────────────────────────────────────────────

export const finalDomainPrologue_chaos: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '星穹聖殿——七塊碎片已在索倫掌中。源核重組，近在眼前。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（站在王座前，七道星芒在身後旋轉）銀翼。你走到了最後。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '索倫……源核重組之後，會發生什麼？你真的知道嗎？',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（緩緩）所有存在，將回歸最初的完整狀態。痛苦、戰爭、碎裂——都將消失。',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '還有記憶。還有選擇。還有……所有你認識的人。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（沉默片刻）……是。（握緊星滅長劍）但那是代價，不是錯誤。現在——站在我身邊，或是阻止我。你只有這兩個選擇。',
  },
];

export const finalDomainEpilogue_chaos: DialogueLine[] = [
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '七塊碎片，在銀翼與索倫的共鳴下，停止了旋轉。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（凝視碎片）……它沒有重組。為什麼？（望向銀翼）你……做了什麼？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '我沒有做任何事。（抬手，碎片的光在掌心匯聚）它自己選擇了等待。',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '等待……什麼？',
  },
  {
    speaker: '銀翼·虛空',
    speakerColor: '#C0C0C0',
    portrait: 'argentwing-null',
    portraitSide: 'left',
    text: '（輕聲）等待有人，不是為了毀滅也不是為了守護，而是純粹地……問它一聲：「你好嗎？」',
  },
  {
    speaker: '索倫·星滅',
    speakerColor: '#C0392B',
    portrait: 'solren-starfall',
    portraitSide: 'right',
    text: '（久久沉默，緩緩放下長劍）……兩百年了。沒有人問過它這個問題。（低頭）也沒有人問過我。',
  },
  {
    speaker: '旁白',
    speakerColor: '#FFFFFF',
    text: '群星為證——我等從不孤單。',
  },
];

// ═══════════════════════════════════════════════════════
// 對白匯出索引（供 chronicleData.ts 引用）
// ═══════════════════════════════════════════════════════

export const DOMAIN_DIALOGUES = {
  // 共用
  'neutral-bridge': {
    prologue: neutralBridgePrologue,
    epilogue: neutralBridgeEpilogue,
  },
  // 守護線
  'gothic-temple': {
    prologue: gothicTemplePrologue,
    epilogue: gothicTempleEpilogue,
  },
  'desert-shrine': {
    prologue: desertShrinePrologue,
    epilogue: desertShrineEpilogue,
  },
  'sky-island': {
    prologue: skyIslandPrologue,
    epilogue: skyIslandEpilogue,
  },
  'ruined-plain-guardian': {
    prologue: ruinedPlainPrologue_guardian,
    epilogue: ruinedPlainEpilogue_guardian,
  },
  'stellar-temple-guardian': {
    prologue: stellarTemplePrologue_guardian,
    epilogue: stellarTempleEpilogue_guardian,
  },
  'final-domain-guardian': {
    prologue: finalDomainPrologue_guardian,
    epilogue: finalDomainEpilogue_guardian,
  },
  // 渾沌線
  'dooms-battlefield': {
    prologue: doomsBattlefieldPrologue,
    epilogue: doomsBattlefieldEpilogue,
  },
  'hell-fortress': {
    prologue: hellFortressPrologue,
    epilogue: hellFortressEpilogue,
  },
  'moonblight-waste': {
    prologue: moonblightWastePrologue,
    epilogue: moonblightWasteEpilogue,
  },
  'ruined-plain-chaos': {
    prologue: ruinedPlainPrologue_chaos,
    epilogue: ruinedPlainEpilogue_chaos,
  },
  'throne-assault': {
    prologue: throneAssaultPrologue_chaos,
    epilogue: throneAssaultEpilogue_chaos,
  },
  'final-domain-chaos': {
    prologue: finalDomainPrologue_chaos,
    epilogue: finalDomainEpilogue_chaos,
  },
} as const;

/**
 * 版本紀錄
 * v1.0 · 2026-09-26 · 骨架版本，主人確認後替換正式腳本
 * 守護線：6個域（共用+5）× 入口/通關各一
 * 渾沌線：5個域（不含共用）× 入口/通關各一
 * 廢墟平原：兩線各自視角，共用域名不同處理
 *
 * 由 Mina 整理 · BTB 星核裂紀開發專案
 */
